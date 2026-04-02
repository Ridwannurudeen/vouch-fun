# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re

_DM = "code,onchain,social,governance,defi,identity"
_S = ('{"code":{"grade":"<A-F>","confidence":"<high|medium|low|none>",'
      '"reasoning":"<1 sent>","key_signals":["<str>"]},'
      '"onchain":{<same>},"social":{<same>},"governance":{<same>},'
      '"defi":{<same>},"identity":{<same>},'
      '"overall":{"trust_tier":"<TRUSTED|MODERATE|LOW|UNKNOWN>",'
      '"trust_score":<0-100>,"summary":"<1 sent>",'
      '"top_signals":["<str>","<str>","<str>"]}}')

QUERY_FEE = 0  # wei — minimal fee to demonstrate economic model
MIN_STAKE = 0  # wei — minimum stake for vouch endorsement

def _dt(s):
    s = s.strip()
    if re.match(r'^0x[a-fA-F0-9]{40}$',s): return "wallet"
    if s.endswith(".eth"): return "ens"
    return "twitter" if s.startswith("@") else "github"

def _san(s):
    c = s.strip().lower().lstrip("@")
    if not c or len(c)>64: raise Exception("Invalid")
    return c

def _pa(raw):
    c = raw.strip()
    if c.startswith("```"): c = c.split("\n",1)[-1].rsplit("```",1)[0].strip()
    try:
        p = json.loads(c)
        if "trust_evaluation" in p: p = p["trust_evaluation"]
        if "overall" in p and "code" in p: return p
    except: pass
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

    def __init__(self):
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
        s1 = {"identifier":"vbuterin","identifier_type":"github","vouched_by":a1,"sources":["seed","github_api"],
            "code":D("A","high","Ethereum creator, 190+ repos",["190+ repos","45k stars"]),
            "onchain":D("A","high","Genesis account, 8500+ tx",["8500+ tx","50+ contracts"]),
            "social":D("A","high","5M+ followers, thought leader",["5.2M followers"]),
            "governance":D("B","high","EIP author",["EIP author"]),
            "defi":D("B","medium","Major DeFi user",["Uniswap","Gitcoin"]),
            "identity":D("A","high","vitalik.eth verified",["vitalik.eth","Verified"]),
            "overall":{"trust_tier":"TRUSTED","trust_score":91,"summary":"Ethereum co-founder, top trust across all dimensions","top_signals":["Ethereum creator","5.2M followers","45k stars"]}}
        s2 = {"identifier":"torvalds","identifier_type":"github","vouched_by":a2,"sources":["seed","github_api"],
            "code":D("A","high","Linux kernel creator",["Linux creator","180k stars"]),
            "onchain":D("F","high","No blockchain activity",["No wallet"]),
            "social":D("B","medium","Famous via LKML",["LKML active"]),
            "governance":D("F","high","No DAO activity",["No votes"]),
            "defi":D("F","high","No DeFi",["No DeFi"]),
            "identity":D("C","medium","GitHub only",["GitHub verified"]),
            "overall":{"trust_tier":"MODERATE","trust_score":48,"summary":"Legendary dev, zero crypto presence","top_signals":["Linux creator","180k stars","No crypto"]}}
        s3 = {"identifier":"ridwannurudeen","identifier_type":"github","vouched_by":a3,"sources":["seed","github_api"],
            "code":D("B","medium","Multi-chain dev, 35+ repos",["35+ repos","Multi-lang"]),
            "onchain":D("B","medium","Active across chains",["450+ tx","12 contracts"]),
            "social":D("C","low","Moderate presence",["Twitter active"]),
            "governance":D("C","low","Some DAO participation",["Occasional votes"]),
            "defi":D("C","low","Moderate DeFi usage",["Some mainnet"]),
            "identity":D("B","medium","GitHub + multi-chain",["GitHub active"]),
            "overall":{"trust_tier":"MODERATE","trust_score":62,"summary":"Multi-chain builder, solid code, growing presence","top_signals":["Multi-chain dev","35+ repos","Consistent activity"]}}
        seeds = [(a1,s1),(a2,s2),(a3,s3)]
        profiles = {s["identifier"]: json.dumps(s) for a,s in seeds}
        self.profiles_data = json.dumps(profiles)
        self.handle_index = json.dumps({s["identifier"]: a for a,s in seeds})
        self.profile_count = 3

    # --- storage helpers ---
    def _gp(self):
        try: return json.loads(self.profiles_data)
        except: return {}
    def _sp(self, p): self.profiles_data = json.dumps(p)
    def _gi(self):
        try: return json.loads(self.handle_index)
        except: return {}
    def _si(self, i): self.handle_index = json.dumps(i)
    def _gc(self, a): return self._gp().get(a, "")
    def _gs(self):
        try: return json.loads(self.stakes_data)
        except: return {}
    def _ss(self, s): self.stakes_data = json.dumps(s)

    def _store(self, addr, ident, idt, profile, src):
        profile["identifier"] = ident
        profile["identifier_type"] = idt
        profile["vouched_by"] = addr
        profile["sources"] = src
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
    def _eval(self, ident, idt, prompt_extra=""):
        # Build fetch URLs based on identifier type
        gh_api = f"https://api.github.com/users/{ident}" if idt == "github" else ""
        gh_repos = f"https://api.github.com/users/{ident}/repos?sort=stars&per_page=5" if idt == "github" else ""
        es_url = f"https://etherscan.io/address/{ident}" if idt == "wallet" else ""
        ens_url = f"https://app.ens.domains/{ident}" if idt == "ens" else ""
        the_ident = ident
        the_idt = idt
        extra = prompt_extra

        def _run():
            evidence = []
            sources = []
            # Fetch real GitHub data
            if gh_api:
                try:
                    data = gl.nondet.web.render(gh_api, mode="text")
                    evidence.append(f"GITHUB PROFILE:\n{data[:2000]}")
                    sources.append("github_api")
                except:
                    evidence.append("GitHub API: fetch failed")
            if gh_repos:
                try:
                    data = gl.nondet.web.render(gh_repos, mode="text")
                    evidence.append(f"TOP REPOS:\n{data[:1500]}")
                    sources.append("github_repos")
                except:
                    pass
            # Fetch real on-chain data
            if es_url:
                try:
                    data = gl.nondet.web.render(es_url, mode="text")
                    evidence.append(f"ETHERSCAN:\n{data[:2000]}")
                    sources.append("etherscan")
                except:
                    evidence.append("Etherscan: fetch failed")
            # ENS
            if ens_url:
                try:
                    data = gl.nondet.web.render(ens_url, mode="text")
                    evidence.append(f"ENS:\n{data[:1000]}")
                    sources.append("ens")
                except:
                    pass

            ev = "\n---\n".join(evidence) if evidence else "No web data fetched."
            src_str = ",".join(sources) if sources else "none"

            prompt = (f"Evaluate '{the_ident}' ({the_idt}) using this REAL fetched data:\n"
                      f"{ev}\n\n{extra}\n"
                      f"RULES: Grade A-F per dimension. Set confidence=high ONLY if real data supports it. "
                      f"Set confidence=none for dimensions with NO evidence. Be honest — do NOT hallucinate facts. "
                      f"Assess 6 dims: {_DM}.\nReturn ONLY JSON:\n{_S}")
            return gl.nondet.exec_prompt(prompt).strip()

        try:
            raw = gl.eq_principle.prompt_non_comparative(
                _run, task="Evaluate trust from real evidence",
                criteria="Grade must be grounded in fetched data. No hallucinated facts.")
        except:
            raw = "{}"
        profile = _pa(raw)
        # Tag sources
        src = ["ai_consensus"]
        if gh_api: src.append("github_api")
        if es_url: src.append("etherscan")
        if ens_url: src.append("ens")
        return profile, src

    def _do_eval(self, ident, idt, caller, extra=""):
        profile, src = self._eval(ident, idt, extra)
        return self._store(caller, ident, idt, profile, src)

    # --- public write methods ---
    @gl.public.write
    def vouch(self, identifier: str) -> str:
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
        return self._do_eval(clean, idt, caller)

    @gl.public.write
    def refresh(self, identifier: str) -> str:
        if QUERY_FEE > 0 and gl.message.value < QUERY_FEE:
            raise Exception(f"Query fee: send >= {QUERY_FEE} wei")
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_address).lower()
        if QUERY_FEE > 0:
            self.fee_pool += gl.message.value
        p = self._gp()
        if caller in p:
            del p[caller]
            self._sp(p)
            self.profile_count -= 1
        return self._do_eval(clean, idt, caller)

    @gl.public.write
    def stake_vouch(self, identifier: str, dimension: str, grade: str) -> str:
        """Stake tokens endorsing a specific grade for a dimension."""
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
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_address).lower()
        extra = f"DISPUTE reason: '{reason[:150]}'. Re-assess carefully with fresh evidence."
        profile, src = self._eval(clean, idt, extra)
        profile["disputed"] = True
        profile["dispute_reason"] = reason[:150]
        # Check stakes — mark wrong stakers
        stakes = self._gs()
        slashed = []
        if clean in stakes:
            for dim in stakes[clean]:
                new_grade = profile.get(dim, {}).get("grade", "N/A")
                for s in stakes[clean][dim]:
                    if _gv(s["grade"]) > _gv(new_grade) + 1:
                        slashed.append({"staker":s["staker"],"dim":dim,"staked":s["grade"],"actual":new_grade,"amount":s["amount"]})
            if slashed:
                stakes[clean] = {}
                self._ss(stakes)
                profile["slashed_stakes"] = slashed
        src.append("dispute")
        idx = self._gi()
        addr = idx.get(clean, caller)
        p = self._gp()
        if addr in p:
            del p[addr]
            self._sp(p)
            self.profile_count -= 1
        self.dispute_count += 1
        return self._store(addr, clean, idt, profile, src)

    @gl.public.write
    def compare(self, id_a: str, id_b: str) -> str:
        a, b = _san(id_a), _san(id_b)
        pr = (f"Compare '{a}' and '{b}' across 6 trust dims ({_DM}). "
              "Return ONLY JSON: "
              '{"summary":"<2 sent>","winner":"<id>",'
              '"dims":{"code":"<winner>","onchain":"<winner>","social":"<winner>",'
              '"governance":"<winner>","defi":"<winner>","identity":"<winner>"},'
              '"reasoning":"<1 sent>"}')
        def _run():
            return gl.nondet.exec_prompt(pr).strip()
        try: raw = gl.eq_principle.prompt_non_comparative(_run, task="Compare trust", criteria="Fair comparison")
        except: raw = "{}"
        c = raw.strip()
        if c.startswith("```"): c = c.split("\n",1)[-1].rsplit("```",1)[0].strip()
        try: comp = json.loads(c)
        except: comp = {"summary":"Could not compare","winner":"","reasoning":"Failed"}
        try: comps = json.loads(self.comparisons_data)
        except: comps = {}
        comps[f"{a}:{b}"] = json.dumps(comp)
        self.comparisons_data = json.dumps(comps)
        self.query_count += 1
        return json.dumps(comp)

    @gl.public.write
    def seed_profile(self, identifier: str, profile_json: str) -> str:
        clean = _san(identifier)
        idt = _dt(identifier)
        caller = str(gl.message.sender_address).lower()
        profile = json.loads(profile_json)
        if "overall" not in profile: raise Exception("Missing overall")
        return self._store(caller, clean, idt, profile, ["seed"])

    # --- public view methods ---
    @gl.public.view
    def get_profile(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "{}"
        return self._gc(a) or "{}"

    @gl.public.view
    def get_profile_by_handle(self, identifier: str) -> str:
        h = _san(identifier)
        return self._gc(h) or "{}"

    @gl.public.view
    def get_trust_tier(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "UNKNOWN"
        raw = self._gc(a)
        if not raw: return "UNKNOWN"
        try: return json.loads(raw).get("overall",{}).get("trust_tier","UNKNOWN")
        except: return "UNKNOWN"

    @gl.public.view
    def get_trust_score(self, address: str) -> u32:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return 0
        raw = self._gc(a)
        if not raw: return 0
        try: return json.loads(raw).get("overall",{}).get("trust_score",0)
        except: return 0

    @gl.public.view
    def get_dimension(self, address: str, dimension: str) -> str:
        a = address.strip().lower()
        d = dimension.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "{}"
        raw = self._gc(a)
        if not raw: return "{}"
        try: return json.dumps(json.loads(raw).get(d,{}))
        except: return "{}"

    @gl.public.view
    def get_confidence(self, address: str, dimension: str) -> str:
        a = address.strip().lower()
        d = dimension.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "none"
        raw = self._gc(a)
        if not raw: return "none"
        try: return json.loads(raw).get(d,{}).get("confidence","none")
        except: return "none"

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
        except: return "{}"
        return comps.get(f"{a}:{b}", comps.get(f"{b}:{a}", "{}"))

    @gl.public.view
    def get_stakes(self, identifier: str) -> str:
        clean = _san(identifier)
        stakes = self._gs()
        return json.dumps(stakes.get(clean, {}))

    @gl.public.view
    def get_fee_pool(self) -> str:
        return json.dumps({"fee_pool":self.fee_pool,"query_fee":QUERY_FEE,"min_stake":MIN_STAKE})
