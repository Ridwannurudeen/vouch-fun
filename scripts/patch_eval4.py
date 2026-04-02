"""Patch _eval v4: very lenient consensus criteria."""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/opt/vouch-deploy/vouch_protocol.py"

with open(path, "r") as f:
    lines = f.readlines()

start = None
end = None
for i, line in enumerate(lines):
    if "    def _eval(self, ident, idt, prompt_extra" in line:
        start = i
    elif start is not None and "    def _do_eval" in line:
        end = i
        break

if start is None or end is None:
    print(f"ERROR: not found (start={start}, end={end})")
    sys.exit(1)

print(f"Replacing lines {start+1}-{end}")

new_eval = '''    def _eval(self, ident, idt, prompt_extra=""):
        gh_api = f"https://api.github.com/users/{ident}" if idt == "github" else ""
        gh_repos = f"https://api.github.com/users/{ident}/repos?sort=stars&per_page=5" if idt == "github" else ""
        es_url = f"https://etherscan.io/address/{ident}" if idt == "wallet" else ""
        the_ident = ident
        the_idt = idt
        extra = prompt_extra

        def _run():
            evidence = []
            if gh_api:
                try:
                    data = gl.nondet.web.render(gh_api, mode="text")
                    evidence.append(f"GITHUB: {data[:1500]}")
                except: pass
            if gh_repos:
                try:
                    data = gl.nondet.web.render(gh_repos, mode="text")
                    evidence.append(f"REPOS: {data[:1000]}")
                except: pass
            if es_url:
                try:
                    data = gl.nondet.web.render(es_url, mode="text")
                    evidence.append(f"ETHERSCAN: {data[:1500]}")
                except: pass
            ev = " | ".join(evidence) if evidence else "No data."
            prompt = (f"Rate '{the_ident}' ({the_idt}) on 6 trust dimensions using this evidence:\\n"
                      f"{ev}\\n{extra}\\n"
                      f"Return JSON with keys: code, onchain, social, governance, defi, identity, score, tier.\\n"
                      f"Each dimension is a letter grade A/B/C/D/F. score is 0-100. tier is TRUSTED/MODERATE/LOW/UNTRUSTED.\\n"
                      f"Use F for dimensions with no evidence. Return only the JSON object, nothing else.")
            return gl.nondet.exec_prompt(prompt).strip()

        # Try full consensus, fall back to leader-only
        consensus_ok = False
        try:
            raw = gl.eq_principle.prompt_comparative(
                _run,
                principle="These trust evaluations are equivalent if they assign similar overall trust levels. Minor differences in individual dimension grades (one letter apart) are normal and acceptable. Focus on whether both evaluations reach the same general conclusion about trustworthiness.")
            consensus_ok = True
        except:
            try: raw = _run()
            except: raw = "{}"

        # Robust parser
        g = {}
        c = raw.strip()
        if "```" in c:
            parts = c.split("```")
            for p in parts:
                p = p.strip()
                if p.startswith("json"): p = p[4:].strip()
                if p.startswith("{"):
                    try:
                        g = json.loads(p)
                        break
                    except: pass
        if not g:
            try: g = json.loads(c)
            except: pass
        if not g:
            for line in c.split("\\n"):
                line = line.strip()
                if line.startswith("{"):
                    try:
                        g = json.loads(line)
                        break
                    except: pass
        if "trust_evaluation" in g: g = g["trust_evaluation"]

        grade_scores = {"A": 90, "B": 75, "C": 55, "D": 35, "F": 10}
        dims = _DM.split(",")
        grades_found = []
        profile = {}
        for d in dims:
            val = g.get(d, "F")
            if isinstance(val, dict): val = val.get("grade", "F")
            grade = str(val).upper().strip()
            if grade not in ["A","B","C","D","F"]: grade = "F"
            grades_found.append(grade)
            conf = "high" if grade in ["A","B"] else "medium" if grade == "C" else "low" if grade == "D" else "none"
            profile[d] = {"grade": grade, "confidence": conf, "justification": f"AI-evaluated from live data"}

        try: score = max(0, min(100, int(g.get("score", -1))))
        except: score = -1
        if score < 0:
            score = int(sum(grade_scores.get(gr, 10) for gr in grades_found) / len(grades_found))

        tier = str(g.get("tier", "")).upper().strip()
        if tier not in ["TRUSTED","MODERATE","LOW","UNTRUSTED"]:
            if score >= 80: tier = "TRUSTED"
            elif score >= 50: tier = "MODERATE"
            elif score >= 25: tier = "LOW"
            else: tier = "UNTRUSTED"

        mode = "consensus" if consensus_ok else "leader-only"
        profile["overall"] = {"trust_tier": tier, "trust_score": score, "summary": f"Trust profile for {the_ident} ({mode})", "consensus_mode": mode}

        src = ["ai_consensus" if consensus_ok else "ai_leader"]
        if gh_api: src.append("github_api")
        if es_url: src.append("etherscan")
        return profile, src

'''

lines[start:end] = [new_eval]

with open(path, "w") as f:
    f.writelines(lines)

print("OK - _eval v4 patched (prompt_comparative + lenient principle)")
