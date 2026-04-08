# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re
import time

_DM = "code,onchain,social,governance,defi,identity"
QUERY_FEE = 0      # wei — disabled on Studio (payable not supported)
MIN_STAKE = 0      # wei — disabled on Studio (payable not supported by GenVM v0.2.16)
PROFILE_TTL = 7776000  # 90 days in seconds — profiles decay after this

def _dt(s):
    s = s.strip()
    if re.match(r'^0x[a-fA-F0-9]{40}$',s): return "wallet"
    if s.lower().endswith(".eth"): return "ens"
    return "twitter" if s.startswith("@") else "github"

def _san(s):
    c = s.strip().lower()
    if not c or c == "@" or len(c)>64: raise Exception("Invalid")
    return c

def _bare(s):
    """Strip leading @ for URL construction."""
    return s.lstrip("@")

def _pa(raw):
    c = raw.strip()
    if c.startswith("```"): c = c.split("\n",1)[-1].rsplit("```",1)[0].strip()
    try:
        p = json.loads(c)
        if "trust_evaluation" in p: p = p["trust_evaluation"]
        if "overall" in p and "code" in p: return p
    except Exception: pass
    r = {}
    for d in _DM.split(","):
        r[d] = {"grade":"N/A","confidence":"none","reasoning":"Parse failed","key_signals":[]}
    r["overall"] = {"trust_tier":"UNKNOWN","trust_score":0,"summary":"Failed","top_signals":[]}
    return r

def _dim(g,c,r,k):
    return {"grade":g,"confidence":c,"reasoning":r,"key_signals":k}

def _gv(g):
    return {"A":5,"B":4,"C":3,"D":2,"F":1}.get(g.upper(),0)


class VouchProtocol(gl.Contract):
    profiles_data: str
    handle_index: str
    profile_count: u32
    query_count: u32
    dispute_count: u32
    comparisons_data: str
    fee_pool: u32
    stakes_data: str
    owner: str

    def __init__(self):
        self.owner = str(gl.message.sender_address).lower()
        self.profile_count = 0
        self.query_count = 0
        self.dispute_count = 0
        self.fee_pool = 0
        self.profiles_data = "{}"
        self.handle_index = "{}"
        self.comparisons_data = "{}"
        self.stakes_data = "{}"
        self._seed()

    def _seed(self):
        a1,a2,a3 = ("0x"+"0"*39+str(i) for i in range(1,4))
        D = _dim
        _now = int(time.time())
        s1 = {"identifier":"vbuterin","identifier_type":"github","vouched_by":a1,"sources":["seed","github_api"],
            "code":D("A","high","Ethereum creator, 190+ repos",["190+ repos","45k stars"]),
            "onchain":D("A","high","Genesis account, 8500+ tx",["8500+ tx","50+ contracts"]),
            "social":D("A","high","5M+ followers, thought leader",["5.2M followers"]),
            "governance":D("B","high","EIP author",["EIP author"]),
            "defi":D("B","medium","Major DeFi user",["Uniswap","Gitcoin"]),
            "identity":D("A","high","vitalik.eth verified",["vitalik.eth","Verified"]),
            "overall":{"trust_tier":"TRUSTED","trust_score":91,"summary":"Ethereum co-founder, top trust across all dimensions","top_signals":["Ethereum creator","5.2M followers","45k stars"]},
            "created_at":_now,"updated_at":_now}
        s2 = {"identifier":"torvalds","identifier_type":"github","vouched_by":a2,"sources":["seed","github_api"],
            "code":D("A","high","Linux kernel creator",["Linux creator","180k stars"]),
            "onchain":D("F","high","No blockchain activity",["No wallet"]),
            "social":D("B","medium","Famous via LKML",["LKML active"]),
            "governance":D("F","high","No DAO activity",["No votes"]),
            "defi":D("F","high","No DeFi",["No DeFi"]),
            "identity":D("C","medium","GitHub only",["GitHub verified"]),
            "overall":{"trust_tier":"MODERATE","trust_score":48,"summary":"Legendary dev, zero crypto presence","top_signals":["Linux creator","180k stars","No crypto"]},
            "created_at":_now,"updated_at":_now}
        s3 = {"identifier":"aaveaave","identifier_type":"github","vouched_by":a3,"sources":["seed","github_api"],
            "code":D("A","high","Aave protocol creator, 200+ repos",["200+ repos","5k+ stars"]),
            "onchain":D("A","high","Massive on-chain footprint",["Billions TVL","Multi-chain"]),
            "social":D("A","high","Major DeFi thought leader",["100k+ followers"]),
            "governance":D("A","high","Aave governance pioneer",["AAVE token","DAO votes"]),
            "defi":D("A","high","Top DeFi lending protocol",["$10B+ TVL","Flash loans"]),
            "identity":D("A","high","Verified across platforms",["GitHub verified","ENS"]),
            "overall":{"trust_tier":"TRUSTED","trust_score":95,"summary":"Aave protocol, top DeFi lending platform","top_signals":["Aave creator","$10B+ TVL","DeFi pioneer"]},
            "created_at":_now,"updated_at":_now}
        seeds = [(a1,s1),(a2,s2),(a3,s3)]
        profiles = {s["identifier"]: json.dumps(s) for a,s in seeds}
        self.profiles_data = json.dumps(profiles)
        self.handle_index = json.dumps({s["identifier"]: a for a,s in seeds})
        self.profile_count = 3

    # --- storage helpers ---
    def _gp(self):
        try: return json.loads(self.profiles_data)
        except Exception: return {}
    def _sp(self, p): self.profiles_data = json.dumps(p)
    def _gi(self):
        try: return json.loads(self.handle_index)
        except Exception: return {}
    def _si(self, i): self.handle_index = json.dumps(i)
    def _gc(self, a): return self._gp().get(a, "")
    def _gs(self):
        try: return json.loads(self.stakes_data)
        except Exception: return {}
    def _ss(self, s): self.stakes_data = json.dumps(s)

    def _reverse_lookup(self, addr):
        """Find handle for a wallet address by scanning handle_index."""
        idx = self._gi()
        for handle, mapped_addr in idx.items():
            if mapped_addr.lower() == addr.lower():
                return handle
        return None

    def _store(self, addr, ident, idt, profile, src):
        profile["identifier"] = ident
        profile["identifier_type"] = idt
        profile["vouched_by"] = addr
        profile["sources"] = src
        profile["created_at"] = int(time.time())
        profile["updated_at"] = int(time.time())
        fj = json.dumps(profile)
        p = self._gp()
        new = ident not in p
        p[ident] = fj
        self._sp(p)
        idx = self._gi()
        if ident not in idx:
            idx[ident] = addr
            self._si(idx)
        if new: self.profile_count += 1
        self.query_count += 1
        return fj

    # --- web-grounded evaluation ---
    def _eval(self, ident, idt, prompt_extra="", wallet_hint=""):
        # --- Data source URLs ---
        # GitHub API (code, identity)
        gh_api = f"https://api.github.com/users/{ident}" if idt == "github" else ""
        gh_repos = f"https://api.github.com/users/{ident}/repos?sort=stars&per_page=5" if idt == "github" else ""
        # npm registry (code — package publishing signal)
        npm_url = f"https://registry.npmjs.org/-/v1/search?text=maintainer:{ident}&size=5" if idt == "github" else ""
        # Twitter/X (social)
        x_url = f"https://x.com/{_bare(ident)}" if idt == "twitter" else ""
        nitter_url = f"https://nitter.net/{_bare(ident)}" if idt == "twitter" else ""
        # Etherscan (on-chain, DeFi)
        es_addr = ident if idt == "wallet" else wallet_hint
        es_url = f"https://etherscan.io/address/{es_addr}" if es_addr else ""
        # Farcaster via Warpcast (social)
        warpcast_url = f"https://warpcast.com/{_bare(ident)}" if idt in ("github", "twitter") else ""
        # Lens via Hey.xyz (social, identity)
        lens_url = f"https://hey.xyz/u/{_bare(ident)}" if idt in ("github", "twitter") else ""
        # Tally.xyz (governance — needs wallet)
        tally_url = f"https://www.tally.xyz/voter/{es_addr}" if es_addr else ""
        # DeBank (wallet portfolio + DeFi)
        debank_url = f"https://debank.com/profile/{ident}" if idt == "wallet" else ""
        # Snapshot (governance — needs wallet)
        snapshot_url = f"https://snapshot.org/#/profile/{es_addr}" if es_addr else ""
        # DefiLlama (DeFi — check if handle matches a protocol)
        llama_url = f"https://api.llama.fi/protocol/{ident}" if idt == "github" else ""
        # ENS resolution (identity — resolve name to address for chained lookups)
        ensdata_url = f"https://api.ensdata.net/{ident}" if idt == "ens" else ""

        the_ident = ident
        the_idt = idt
        extra = prompt_extra

        # Build expected sources list OUTSIDE closure (deterministic, survives consensus)
        _expected_sources = []
        if gh_api: _expected_sources.append("github_api")
        if npm_url: _expected_sources.append("npm_registry")
        if es_url: _expected_sources.append("etherscan")
        if warpcast_url: _expected_sources.append("farcaster")
        if lens_url: _expected_sources.append("lens")
        if tally_url: _expected_sources.append("tally")
        if llama_url: _expected_sources.append("defillama")
        if x_url: _expected_sources.append("twitter")
        if nitter_url: _expected_sources.append("nitter")
        if debank_url: _expected_sources.append("debank")
        if snapshot_url: _expected_sources.append("snapshot")
        if ensdata_url: _expected_sources.append("ensdata")

        def _run():
            evidence = []
            # 1. GitHub profile + repos
            if gh_api:
                try:
                    data = gl.nondet.web.render(gh_api, mode="text")
                    evidence.append(f"GITHUB_PROFILE: {data[:1500]}")
                except Exception: pass
            if gh_repos:
                try:
                    data = gl.nondet.web.render(gh_repos, mode="text")
                    evidence.append(f"GITHUB_REPOS: {data[:1000]}")
                except Exception: pass
            # 2. npm registry — package publishing
            if npm_url:
                try:
                    data = gl.nondet.web.render(npm_url, mode="text")
                    evidence.append(f"NPM_PACKAGES: {data[:800]}")
                except Exception: pass
            # 3. Etherscan — on-chain activity
            if es_url:
                try:
                    data = gl.nondet.web.render(es_url, mode="text")
                    evidence.append(f"ETHERSCAN: {data[:1500]}")
                except Exception: pass
            # 4. Farcaster via Warpcast — social presence
            if warpcast_url:
                try:
                    data = gl.nondet.web.render(warpcast_url, mode="text")
                    evidence.append(f"FARCASTER: {data[:800]}")
                except Exception: pass
            # 5. Lens via Hey.xyz — social + identity
            if lens_url:
                try:
                    data = gl.nondet.web.render(lens_url, mode="text")
                    evidence.append(f"LENS: {data[:800]}")
                except Exception: pass
            # 6. Tally.xyz — governance votes
            if tally_url:
                try:
                    data = gl.nondet.web.render(tally_url, mode="text")
                    evidence.append(f"TALLY_GOVERNANCE: {data[:800]}")
                except Exception: pass
            # 7. DefiLlama — protocol TVL (if handle matches a protocol)
            if llama_url:
                try:
                    data = gl.nondet.web.render(llama_url, mode="text")
                    if "Not Found" not in data[:100] and len(data) > 50:
                        evidence.append(f"DEFILLAMA: {data[:800]}")
                except Exception: pass
            # 8. Twitter/X profile
            if x_url:
                try:
                    data = gl.nondet.web.render(x_url, mode="text")
                    evidence.append(f"TWITTER: {data[:1500]}")
                except Exception: pass
            if nitter_url:
                try:
                    data = gl.nondet.web.render(nitter_url, mode="text")
                    evidence.append(f"NITTER: {data[:1500]}")
                except Exception: pass
            # 9. DeBank — portfolio + DeFi
            if debank_url:
                try:
                    data = gl.nondet.web.render(debank_url, mode="text")
                    evidence.append(f"DEBANK: {data[:1500]}")
                except Exception: pass
            # 10. Snapshot — governance
            if snapshot_url:
                try:
                    data = gl.nondet.web.render(snapshot_url, mode="text")
                    evidence.append(f"SNAPSHOT: {data[:800]}")
                except Exception: pass
            # 11. ENS resolution + chained lookups
            if ensdata_url:
                try:
                    data = gl.nondet.web.render(ensdata_url, mode="text")
                    evidence.append(f"ENS_DATA: {data[:1500]}")
                    # Try to extract resolved address for chained lookups
                    try:
                        ens_info = json.loads(data)
                        resolved_addr = ens_info.get("address", "")
                        if resolved_addr and resolved_addr.startswith("0x"):
                            # Chain to Etherscan
                            try:
                                es_data = gl.nondet.web.render(f"https://etherscan.io/address/{resolved_addr}", mode="text")
                                evidence.append(f"ETHERSCAN: {es_data[:1500]}")
                            except Exception: pass
                            # Chain to DeBank
                            try:
                                db_data = gl.nondet.web.render(f"https://debank.com/profile/{resolved_addr}", mode="text")
                                evidence.append(f"DEBANK: {db_data[:1500]}")
                            except Exception: pass
                            # Chain to Tally
                            try:
                                tally_data = gl.nondet.web.render(f"https://www.tally.xyz/voter/{resolved_addr}", mode="text")
                                evidence.append(f"TALLY_GOVERNANCE: {tally_data[:800]}")
                            except Exception: pass
                            # Chain to Snapshot
                            try:
                                snap_data = gl.nondet.web.render(f"https://snapshot.org/#/profile/{resolved_addr}", mode="text")
                                evidence.append(f"SNAPSHOT: {snap_data[:800]}")
                            except Exception: pass
                    except Exception: pass
                except Exception: pass

            ev = " | ".join(evidence) if evidence else "No data."
            # Type-specific grading guidance
            type_guidance = {
                "github": "PRIMARY dimension: code. Evaluate repos, stars, contributions, packages. Social/onchain are secondary signals.",
                "twitter": "PRIMARY dimension: social. Evaluate followers, engagement, influence, content quality. Code is secondary (likely F unless dev). Onchain is secondary.",
                "wallet": "PRIMARY dimension: onchain. Evaluate transaction history, DeFi activity, contract deployments, portfolio. Code is likely F unless contract deployer.",
                "ens": "PRIMARY dimension: identity. ENS ownership signals identity commitment. Chain to resolved address for onchain/DeFi/governance data.",
            }
            tg = type_guidance.get(the_idt, "")
            sources_list = ", ".join(_expected_sources) if _expected_sources else "No sources returned data"
            prompt = ("You are a trust evaluation oracle. Rate " + the_ident + " (" + the_idt + ") on 6 trust dimensions.\n"
                      "IDENTIFIER TYPE: " + the_idt + ". " + tg + "\n"
                      "EVIDENCE FROM MULTIPLE SOURCES:\n" + ev + "\n" + extra + "\n"
                      "DATA SOURCES USED: " + sources_list + ".\n"
                      "Use ALL available evidence to grade each dimension. Cross-reference signals across sources.\n"
                      "GRADING: A=exceptional top 5pct (protocol creator, 10k+ stars, major packages). B=strong active contributor (1k+ stars, published packages, regular commits). C=moderate activity. D=minimal. F=no evidence.\n"
                      "Grade generously for well-known figures. Famous security researchers and prolific OSS devs deserve A in code. Do not underweight high star counts or famous repos.\n"
                      "For social: use Farcaster followers, Lens activity, Twitter/X followers and engagement. For governance: use Tally votes, Snapshot votes, DAO proposals. For DeFi: use Etherscan DeFi interactions, DeBank portfolio, DefiLlama protocol data.\n"
                      "Only grade F if NO evidence exists for that dimension across ANY source.\n"
                      "Return JSON with keys: code, onchain, social, governance, defi, identity, score, tier.\n"
                      "Each dimension is a letter grade A/B/C/D/F. score is 0-100. tier is TRUSTED(80+)/MODERATE(50-79)/LOW(25-49)/UNKNOWN(0-24).\n"
                      "Return ONLY the JSON object.")
            return gl.nondet.exec_prompt(prompt).strip()

        # Try full consensus, fall back to leader-only
        consensus_ok = False
        try:
            raw = gl.eq_principle.prompt_comparative(
                _run,
                principle="These trust evaluations are equivalent if they assign similar overall trust levels. Minor differences in individual dimension grades (one letter apart) are normal and acceptable. Focus on whether both evaluations reach the same general conclusion about trustworthiness.")
            consensus_ok = True
        except Exception:
            try: raw = _run()
            except Exception: raw = "{}"

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
                    except Exception: pass
        if not g:
            try: g = json.loads(c)
            except Exception: pass
        if not g:
            for line in c.split("\n"):
                line = line.strip()
                if line.startswith("{"):
                    try:
                        g = json.loads(line)
                        break
                    except Exception: pass
        if "trust_evaluation" in g: g = g["trust_evaluation"]

        grade_scores = {"A": 90, "B": 75, "C": 55, "D": 35, "F": 10}
        conf_weights = {"high": 1.0, "medium": 0.75, "low": 0.5, "none": 0.25}
        dims = _DM.split(",")
        dim_data = []
        profile = {}
        for d in dims:
            raw = g.get(d, "F")
            if isinstance(raw, dict):
                val = raw.get("grade", "F")
                llm_conf = raw.get("confidence", "")
            else:
                val = raw
                llm_conf = ""
            grade = str(val).upper().strip()
            if grade not in ["A","B","C","D","F"]: grade = "F"
            llm_conf = str(llm_conf).lower().strip()
            if llm_conf in conf_weights:
                conf = llm_conf
            else:
                conf = "high" if grade in ["A","B"] else "medium" if grade == "C" else "low" if grade == "D" else "none"
            dim_data.append((grade, conf))
            profile[d] = {"grade": grade, "confidence": conf, "reasoning": f"AI-evaluated from live data"}

        try: score = max(0, min(100, int(g.get("score", -1))))
        except Exception: score = -1
        if score < 0:
            weights = [conf_weights[c] for _, c in dim_data]
            score = int(sum(grade_scores.get(gr, 10) * w for (gr, _), w in zip(dim_data, weights)) / sum(weights))

        tier = str(g.get("tier", "")).upper().strip()
        if tier == "UNTRUSTED": tier = "UNKNOWN"
        if tier not in ["TRUSTED","MODERATE","LOW","UNKNOWN"]:
            if score >= 80: tier = "TRUSTED"
            elif score >= 50: tier = "MODERATE"
            elif score >= 25: tier = "LOW"
            else: tier = "UNKNOWN"

        mode = "consensus" if consensus_ok else "leader-only"
        eq = "web-grounded" if _expected_sources else "ai-only"
        profile["evidence_quality"] = eq
        profile["overall"] = {"trust_tier": tier, "trust_score": score, "summary": f"Trust profile for {the_ident} ({mode})", "consensus_mode": mode}

        src = ["ai_consensus" if consensus_ok else "ai_leader"]
        src.extend(_expected_sources)
        return profile, src

    def _do_eval(self, ident, idt, caller, extra="", wallet_hint=""):
        profile, src = self._eval(ident, idt, extra, wallet_hint=wallet_hint)
        return self._store(caller, ident, idt, profile, src)

    # --- public write methods ---
    @gl.public.write
    def vouch(self, identifier: str, wallet_address: str = "") -> str:
        if QUERY_FEE > 0 and gl.message.value < QUERY_FEE:
            raise Exception(f"Query fee: send >= {QUERY_FEE} wei")
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_address).lower()
        if QUERY_FEE > 0:
            self.fee_pool += gl.message.value
        cached = self._gc(clean)
        if cached:
            self.query_count += 1
            return cached
        # Pass wallet_hint so Etherscan is also fetched for GitHub users
        wallet = wallet_address.strip() if wallet_address else ""
        return self._do_eval(clean, idt, caller, wallet_hint=wallet)

    @gl.public.write
    def refresh(self, identifier: str, wallet_address: str = "") -> str:
        if QUERY_FEE > 0 and gl.message.value < QUERY_FEE:
            raise Exception(f"Query fee: send >= {QUERY_FEE} wei")
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_address).lower()
        if QUERY_FEE > 0:
            self.fee_pool += gl.message.value
        p = self._gp()
        if clean in p:
            del p[clean]
            self._sp(p)
            self.profile_count -= 1
        wallet = wallet_address.strip() if wallet_address else ""
        return self._do_eval(clean, idt, caller, wallet_hint=wallet)

    @gl.public.write
    def stake_vouch(self, identifier: str, dimension: str, grade: str) -> str:
        if gl.message.value < MIN_STAKE:
            raise Exception(f"Minimum stake: {MIN_STAKE} wei")
        clean = _san(identifier)
        dim = dimension.strip().lower()
        if dim not in _DM.split(","):
            raise Exception(f"Invalid dimension: {dim}")
        g = grade.strip().upper()
        if g not in "A,B,C,D,F".split(","):
            raise Exception(f"Invalid grade: {g}")
        caller = str(gl.message.sender_address).lower()
        stakes = self._gs()
        if clean not in stakes:
            stakes[clean] = {}
        if dim not in stakes[clean]:
            stakes[clean][dim] = []
        stakes[clean][dim].append({
            "staker": caller,
            "grade": g,
            "amount": gl.message.value
        })
        self._ss(stakes)
        return json.dumps({"status":"staked","identifier":clean,"dimension":dim,"grade":g,"amount":gl.message.value})

    @gl.public.write
    def dispute(self, identifier: str, reason: str) -> str:
        if QUERY_FEE > 0 and gl.message.value < QUERY_FEE:
            raise Exception(f"Dispute fee: send >= {QUERY_FEE} wei")
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_address).lower()
        if QUERY_FEE > 0:
            self.fee_pool += gl.message.value
        extra = f"DISPUTE reason: '{reason[:150]}'. Re-assess carefully with fresh evidence."
        profile, src = self._eval(clean, idt, extra)
        profile["disputed"] = True
        profile["dispute_reason"] = reason[:150]
        stakes = self._gs()
        slashed = []
        if clean in stakes:
            for dim in stakes[clean]:
                new_grade = profile.get(dim, {}).get("grade", "N/A")
                kept = []
                for s in stakes[clean][dim]:
                    if _gv(s["grade"]) > _gv(new_grade) + 1:
                        slashed.append({"staker":s["staker"],"dim":dim,"staked":s["grade"],"actual":new_grade,"amount":s["amount"]})
                    else:
                        kept.append(s)
                stakes[clean][dim] = kept
            if slashed:
                self._ss(stakes)
                profile["slashed_stakes"] = slashed
        src.append("dispute")
        idx = self._gi()
        addr = idx.get(clean, caller)
        self.dispute_count += 1
        return self._store(addr, clean, idt, profile, src)

    @gl.public.write
    def compare(self, id_a: str, id_b: str) -> str:
        a, b = _san(id_a), _san(id_b)
        idt_a, idt_b = _dt(id_a), _dt(id_b)

        def _urls_for(ident, idt):
            """Build data source URLs based on identifier type."""
            bare = _bare(ident)
            urls = []
            if idt == "github":
                urls.append(("GITHUB", f"https://api.github.com/users/{bare}"))
            elif idt == "twitter":
                urls.append(("TWITTER", f"https://x.com/{bare}"))
            elif idt == "wallet":
                urls.append(("ETHERSCAN", f"https://etherscan.io/address/{ident}"))
                urls.append(("DEBANK", f"https://debank.com/profile/{ident}"))
            elif idt == "ens":
                urls.append(("ENS", f"https://api.ensdata.net/{ident}"))
            return urls

        urls_a = _urls_for(a, idt_a)
        urls_b = _urls_for(b, idt_b)

        def _run():
            evidence = []
            for label, url in urls_a:
                try:
                    data = gl.nondet.web.render(url, mode="text")
                    evidence.append(f"{label}({a}): {data[:1200]}")
                except Exception: pass
            for label, url in urls_b:
                try:
                    data = gl.nondet.web.render(url, mode="text")
                    evidence.append(f"{label}({b}): {data[:1200]}")
                except Exception: pass
            ev = " | ".join(evidence) if evidence else "No live data available."
            pr = (f"Compare '{a}' and '{b}' across 6 trust dims ({_DM}). "
                  f"Evidence: {ev}\n"
                  "Return ONLY JSON: "
                  '{"summary":"<2 sent>","winner":"<id>",'
                  '"dims":{"code":"<winner>","onchain":"<winner>","social":"<winner>",'
                  '"governance":"<winner>","defi":"<winner>","identity":"<winner>"},'
                  '"reasoning":"<1 sent>"}')
            return gl.nondet.exec_prompt(pr).strip()
        try: raw = gl.eq_principle.prompt_non_comparative(_run, task="Compare trust", criteria="Fair comparison")
        except Exception: raw = "{}"
        c = raw.strip()
        if c.startswith("```"): c = c.split("\n",1)[-1].rsplit("```",1)[0].strip()
        try: comp = json.loads(c)
        except Exception: comp = {"summary":"Could not compare","winner":"","reasoning":"Failed"}
        try: comps = json.loads(self.comparisons_data)
        except Exception: comps = {}
        comps[f"{a}:{b}"] = json.dumps(comp)
        self.comparisons_data = json.dumps(comps)
        self.query_count += 1
        return json.dumps(comp)

    @gl.public.write
    def seed_profile(self, identifier: str, profile_json: str) -> str:
        if str(gl.message.sender_address).lower() != self.owner:
            return json.dumps({"error": "Only owner can seed profiles"})
        clean = _san(identifier)
        idt = _dt(identifier)
        caller = str(gl.message.sender_address).lower()
        profile = json.loads(profile_json)
        if "overall" not in profile: raise Exception("Missing overall")
        return self._store(caller, clean, idt, profile, ["seed"])

    @gl.public.write
    def withdraw_fees(self) -> str:
        caller = str(gl.message.sender_address).lower()
        if caller != self.owner:
            return json.dumps({"error": "Only owner can withdraw fees"})
        amount = self.fee_pool
        self.fee_pool = 0
        return json.dumps({"withdrawn": amount, "to": self.owner})

    # --- public view methods ---
    @gl.public.view
    def get_profile(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "{}"
        raw = self._gc(a)
        if not raw:
            handle = self._reverse_lookup(a)
            if handle:
                raw = self._gc(handle)
        return raw or "{}"

    @gl.public.view
    def get_profile_by_handle(self, identifier: str) -> str:
        h = _san(identifier)
        return self._gc(h) or "{}"

    @gl.public.view
    def get_trust_tier(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "UNKNOWN"
        raw = self._gc(a)
        if not raw:
            handle = self._reverse_lookup(a)
            if handle:
                raw = self._gc(handle)
        if not raw: return "UNKNOWN"
        try:
            p = json.loads(raw)
            tier = p.get("overall",{}).get("trust_tier","UNKNOWN")
            updated = p.get("updated_at", p.get("created_at", 0))
            age = int(time.time()) - updated if updated else 999999
            if age > PROFILE_TTL:
                decay = {"TRUSTED": "MODERATE", "MODERATE": "LOW", "LOW": "UNKNOWN"}
                tier = decay.get(tier, tier)
            return tier
        except Exception: return "UNKNOWN"

    @gl.public.view
    def get_trust_score(self, address: str) -> u32:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return 0
        raw = self._gc(a)
        if not raw:
            handle = self._reverse_lookup(a)
            if handle:
                raw = self._gc(handle)
        if not raw: return 0
        try: return json.loads(raw).get("overall",{}).get("trust_score",0)
        except Exception: return 0

    @gl.public.view
    def get_dimension(self, address: str, dimension: str) -> str:
        a = address.strip().lower()
        d = dimension.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "{}"
        raw = self._gc(a)
        if not raw:
            handle = self._reverse_lookup(a)
            if handle:
                raw = self._gc(handle)
        if not raw: return "{}"
        try: return json.dumps(json.loads(raw).get(d,{}))
        except Exception: return "{}"

    @gl.public.view
    def get_confidence(self, address: str, dimension: str) -> str:
        a = address.strip().lower()
        d = dimension.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "none"
        raw = self._gc(a)
        if not raw:
            handle = self._reverse_lookup(a)
            if handle:
                raw = self._gc(handle)
        if not raw: return "none"
        try: return json.loads(raw).get(d,{}).get("confidence","none")
        except Exception: return "none"

    @gl.public.view
    def lookup_address(self, identifier: str) -> str:
        return self._gi().get(_san(identifier), "")

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({"profile_count":self.profile_count,"query_count":self.query_count,"dispute_count":self.dispute_count,"fee_pool":self.fee_pool})

    @gl.public.view
    def get_all_handles(self) -> str:
        return json.dumps(list(self._gi().keys()))

    @gl.public.view
    def get_comparison(self, id_a: str, id_b: str) -> str:
        a, b = _san(id_a), _san(id_b)
        try: comps = json.loads(self.comparisons_data)
        except Exception: return "{}"
        return comps.get(f"{a}:{b}", comps.get(f"{b}:{a}", "{}"))

    @gl.public.view
    def get_stakes(self, identifier: str) -> str:
        clean = _san(identifier)
        stakes = self._gs()
        return json.dumps(stakes.get(clean, {}))

    @gl.public.view
    def get_fee_pool(self) -> str:
        return json.dumps({"fee_pool":self.fee_pool,"query_fee":QUERY_FEE,"min_stake":MIN_STAKE})

    @gl.public.view
    def get_profile_age(self, identifier: str) -> str:
        h = _san(identifier)
        raw = self._gc(h)
        if not raw: return json.dumps({"exists": False, "handle": h})
        try:
            p = json.loads(raw)
            updated = p.get("updated_at", p.get("created_at", 0))
            age = int(time.time()) - updated if updated else -1
            fresh = age >= 0 and age <= PROFILE_TTL
            return json.dumps({"handle": h, "age_seconds": age, "age_days": age // 86400, "fresh": fresh, "ttl_seconds": PROFILE_TTL, "updated_at": updated})
        except Exception:
            return json.dumps({"exists": False, "handle": h})

    @gl.public.view
    def get_decay_info(self) -> str:
        return json.dumps({"ttl_seconds": PROFILE_TTL, "ttl_days": PROFILE_TTL // 86400, "decay_rule": "Profiles older than 90 days are downgraded one trust tier. Refresh to restore."})

    # === TrustGate: Composable Access Control ===

    @gl.public.write
    def gate_register(self, handle: str, gate_name: str, dimension: str, min_grade: str) -> str:
        h = _san(handle)
        cached = self._gc(h)
        if not cached:
            return json.dumps({"status": "rejected", "reason": "No profile found. Vouch first.", "handle": h})
        profile = _pa(cached)
        dim_data = profile.get(dimension, {})
        grade = dim_data.get("grade", "F") if isinstance(dim_data, dict) else "F"
        if _gv(grade) < _gv(min_grade):
            return json.dumps({"status": "rejected", "reason": f"Grade {grade} < required {min_grade}", "handle": h, "gate": gate_name, "dimension": dimension})
        caller = str(gl.message.sender_address).lower()
        try: reg = json.loads(self.stakes_data)
        except Exception: reg = {}
        gate_key = f"gate:{gate_name}"
        if gate_key not in reg:
            reg[gate_key] = {}
        reg[gate_key][h] = {"grade": grade, "dimension": dimension, "by": caller}
        self.stakes_data = json.dumps(reg)
        return json.dumps({"status": "registered", "handle": h, "gate": gate_name, "grade": grade, "dimension": dimension})

    @gl.public.view
    def gate_check(self, handle: str, dimension: str, min_grade: str) -> str:
        h = _san(handle)
        cached = self._gc(h)
        if not cached:
            return json.dumps({"eligible": False, "reason": "No profile", "handle": h})
        profile = _pa(cached)
        dim_data = profile.get(dimension, {})
        grade = dim_data.get("grade", "F") if isinstance(dim_data, dict) else "F"
        try:
            p = json.loads(cached)
            updated = p.get("updated_at", p.get("created_at", 0))
        except Exception: updated = 0
        age = int(time.time()) - updated if updated else 999999
        if age > PROFILE_TTL:
            decay = {"A": "B", "B": "C", "C": "D", "D": "F"}
            grade = decay.get(grade, grade)
        ok = _gv(grade) >= _gv(min_grade)
        return json.dumps({"eligible": ok, "handle": h, "grade": grade, "required": min_grade, "dimension": dimension})

    @gl.public.view
    def gate_members(self, gate_name: str) -> str:
        try: reg = json.loads(self.stakes_data)
        except Exception: return "[]"
        gate_key = f"gate:{gate_name}"
        members = reg.get(gate_key, {})
        return json.dumps(list(members.keys()))

    @gl.public.view
    def gate_info(self, gate_name: str) -> str:
        try: reg = json.loads(self.stakes_data)
        except Exception: reg = {}
        gate_key = f"gate:{gate_name}"
        members = reg.get(gate_key, {})
        return json.dumps({"gate": gate_name, "member_count": len(members), "members": members})

    # === Trust Oracle: Chainlink-for-Reputation ===

    @gl.public.view
    def trust_query(self, identifier: str, dimension: str, min_grade: str) -> str:
        h = _san(identifier)
        cached = self._gc(h)
        if not cached:
            return json.dumps({"pass": False, "reason": "No profile", "handle": h, "dimension": dimension, "required": min_grade})
        profile = _pa(cached)
        dim_data = profile.get(dimension, {})
        grade = dim_data.get("grade", "F") if isinstance(dim_data, dict) else "F"
        confidence = dim_data.get("confidence", "none") if isinstance(dim_data, dict) else "none"
        score = profile.get("overall", {}).get("trust_score", 0)
        tier = profile.get("overall", {}).get("trust_tier", "UNKNOWN")
        updated = 0
        try:
            p = json.loads(cached)
            updated = p.get("updated_at", p.get("created_at", 0))
        except Exception: pass
        age = int(time.time()) - updated if updated else -1
        fresh = age >= 0 and age <= PROFILE_TTL
        if not fresh:
            decay = {"A": "B", "B": "C", "C": "D", "D": "F"}
            grade = decay.get(grade, grade)
        ok = _gv(grade) >= _gv(min_grade)
        return json.dumps({
            "pass": ok, "handle": h, "dimension": dimension,
            "grade": grade, "confidence": confidence, "required": min_grade,
            "overall_score": score, "overall_tier": tier,
            "fresh": fresh, "age_days": age // 86400 if age >= 0 else -1
        })

    @gl.public.view
    def trust_batch_query(self, identifiers_json: str, dimension: str, min_grade: str) -> str:
        try: ids = json.loads(identifiers_json)
        except Exception: return json.dumps({"error": "Invalid JSON array"})
        results = []
        for ident in ids[:20]:
            h = _san(ident)
            cached = self._gc(h)
            if not cached:
                results.append({"handle": h, "pass": False, "reason": "No profile"})
                continue
            profile = _pa(cached)
            dim_data = profile.get(dimension, {})
            grade = dim_data.get("grade", "F") if isinstance(dim_data, dict) else "F"
            ok = _gv(grade) >= _gv(min_grade)
            results.append({"handle": h, "pass": ok, "grade": grade, "required": min_grade})
        return json.dumps({"results": results, "total": len(results), "passed": sum(1 for r in results if r.get("pass"))})

    @gl.public.view
    def list_gates(self) -> str:
        try: reg = json.loads(self.stakes_data)
        except Exception: return "[]"
        gates = []
        for k, v in reg.items():
            if k.startswith("gate:"):
                name = k[5:]
                gates.append({"name": name, "member_count": len(v)})
        return json.dumps(gates)
