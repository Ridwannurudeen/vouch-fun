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

def _dt(s):
    s = s.strip()
    if re.match(r'^0x[a-fA-F0-9]{40}$',s): return "wallet"
    if s.endswith(".eth"): return "ens"
    return "twitter" if s.startswith("@") else "github"

def _san(s):
    c = s.strip().lower().lstrip("@")
    if not c or len(c)>64: raise Exception("Invalid")
    return c

def _pr(i,t):
    return (f"Evaluate '{i}' ({t}). Assess 6 dims: {_DM}. "
            "Grade A-F. Confidence: high/medium/low/none. Be honest. "
            f"Return ONLY JSON:\n{_S}")

def _pa(raw):
    c = raw.strip()
    if c.startswith("```"): c = c.split("\n",1)[-1].rsplit("```",1)[0].strip()
    try:
        p = json.loads(c)
        if "overall" in p and "code" in p: return p
    except: pass
    r = {}
    for d in _DM.split(","):
        r[d] = {"grade":"N/A","confidence":"none","reasoning":"Failed","key_signals":[]}
    r["overall"] = {"trust_tier":"UNKNOWN","trust_score":0,"summary":"Failed","top_signals":[]}
    return r

def _dim(g,c,r,k):
    return {"grade":g,"confidence":c,"reasoning":r,"key_signals":k}

class VouchProtocol(gl.Contract):
    profiles_data: str
    handle_index: str
    profile_count: u32
    query_count: u32
    dispute_count: u32
    comparisons_data: str

    def __init__(self):
        self.profile_count = 0
        self.query_count = 0
        self.dispute_count = 0
        self.profiles_data = "{}"
        self.handle_index = "{}"
        self.comparisons_data = "{}"
        self._seed()

    def _seed(self):
        a1,a2,a3 = ("0x"+"0"*39+str(i) for i in range(1,4))
        D = _dim
        s1 = {"identifier":"vbuterin","identifier_type":"github","vouched_by":a1,"sources":["seed"],
            "code":D("A","high","Ethereum creator, 190+ repos",["190+ repos","45k stars"]),
            "onchain":D("A","high","Genesis account, 8500+ tx",["8500+ tx","50+ contracts"]),
            "social":D("A","high","5M+ followers, thought leader",["5.2M followers"]),
            "governance":D("B","high","EIP author",["EIP author"]),
            "defi":D("B","medium","Major DeFi user",["Uniswap","Gitcoin"]),
            "identity":D("A","high","vitalik.eth verified",["vitalik.eth","Verified"]),
            "overall":{"trust_tier":"TRUSTED","trust_score":91,"summary":"Ethereum co-founder, top trust across all dimensions","top_signals":["Ethereum creator","5.2M followers","45k stars"]}}
        s2 = {"identifier":"torvalds","identifier_type":"github","vouched_by":a2,"sources":["seed"],
            "code":D("A","high","Linux kernel creator",["Linux creator","180k stars"]),
            "onchain":D("F","high","No blockchain activity",["No wallet"]),
            "social":D("B","medium","Famous via LKML",["LKML active"]),
            "governance":D("F","high","No DAO activity",["No votes"]),
            "defi":D("F","high","No DeFi",["No DeFi"]),
            "identity":D("C","medium","GitHub only",["GitHub verified"]),
            "overall":{"trust_tier":"MODERATE","trust_score":48,"summary":"Legendary dev, zero crypto presence","top_signals":["Linux creator","180k stars","No crypto"]}}
        s3 = {"identifier":"ridwannurudeen","identifier_type":"github","vouched_by":a3,"sources":["seed"],
            "code":D("B","medium","Multi-chain dev, 35+ repos",["35+ repos","Multi-lang"]),
            "onchain":D("B","medium","Active across chains",["450+ tx","12 contracts"]),
            "social":D("C","low","Moderate presence",["Twitter active"]),
            "governance":D("C","low","Some DAO participation",["Occasional votes"]),
            "defi":D("C","low","Moderate DeFi usage",["Some mainnet"]),
            "identity":D("B","medium","GitHub + multi-chain",["GitHub active"]),
            "overall":{"trust_tier":"MODERATE","trust_score":62,"summary":"Multi-chain builder, solid code, growing presence","top_signals":["Multi-chain dev","35+ repos","Consistent activity"]}}
        seeds = [(a1,s1),(a2,s2),(a3,s3)]
        profiles = {a: json.dumps(s) for a,s in seeds}
        self.profiles_data = json.dumps(profiles)
        self.handle_index = json.dumps({s["identifier"]: a for a,s in seeds})
        self.profile_count = 3

    def _gp(self):
        try: return json.loads(self.profiles_data)
        except: return {}
    def _sp(self, p): self.profiles_data = json.dumps(p)
    def _gi(self):
        try: return json.loads(self.handle_index)
        except: return {}
    def _si(self, i): self.handle_index = json.dumps(i)
    def _gc(self, a): return self._gp().get(a, "")

    def _store(self, addr, ident, idt, profile, src):
        profile["identifier"] = ident
        profile["identifier_type"] = idt
        profile["vouched_by"] = addr
        profile["sources"] = src
        fj = json.dumps(profile)
        p = self._gp()
        new = addr not in p
        p[addr] = fj
        self._sp(p)
        idx = self._gi()
        if ident not in idx:
            idx[ident] = addr
            self._si(idx)
        if new: self.profile_count += 1
        self.query_count += 1
        return fj

    def _eval(self, ident, idt, prompt, task, crit):
        def _run():
            return gl.nondet.exec_prompt(prompt).strip()
        try: raw = gl.eq_principle.prompt_non_comparative(_run, task=task, criteria=crit)
        except: raw = "{}"
        return _pa(raw)

    def _do_eval(self, ident, idt, caller):
        return self._store(caller, ident, idt,
            self._eval(ident, idt, _pr(ident, idt), "Evaluate trust", "Honest assessment"),
            ["ai_consensus"])

    @gl.public.write
    def vouch(self, identifier: str) -> str:
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_account).lower()
        cached = self._gc(caller)
        if cached:
            self.query_count += 1
            return cached
        return self._do_eval(clean, idt, caller)

    @gl.public.write
    def refresh(self, identifier: str) -> str:
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_account).lower()
        p = self._gp()
        if caller in p:
            del p[caller]
            self._sp(p)
            self.profile_count -= 1
        return self._do_eval(clean, idt, caller)

    @gl.public.write
    def dispute(self, identifier: str, reason: str) -> str:
        idt = _dt(identifier)
        clean = _san(identifier)
        caller = str(gl.message.sender_account).lower()
        pr = (f"Re-evaluate '{clean}' ({idt}). Dispute: '{reason[:150]}'. "
              f"Re-assess dims: {_DM}. Grade A-F, confidence. JSON:\n{_S}")
        profile = self._eval(clean, idt, pr, "Re-evaluate disputed trust", "Dispute re-assessment")
        profile["disputed"] = True
        profile["dispute_reason"] = reason[:150]
        idx = self._gi()
        addr = idx.get(clean, caller)
        p = self._gp()
        if addr in p:
            del p[addr]
            self._sp(p)
            self.profile_count -= 1
        self.dispute_count += 1
        return self._store(addr, clean, idt, profile, ["ai_consensus","dispute"])

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
        caller = str(gl.message.sender_account).lower()
        profile = json.loads(profile_json)
        if "overall" not in profile: raise Exception("Missing overall")
        return self._store(caller, clean, idt, profile, ["seed"])

    @gl.public.view
    def get_profile(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "{}"
        return self._gc(a) or "{}"

    @gl.public.view
    def get_profile_by_handle(self, identifier: str) -> str:
        h = _san(identifier)
        a = self._gi().get(h, "")
        return self._gc(a) or "{}" if a else "{}"

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
        return json.dumps({"profile_count":self.profile_count,"query_count":self.query_count,"dispute_count":self.dispute_count})

    @gl.public.view
    def get_all_handles(self) -> str:
        return json.dumps(list(self._gi().keys()))

    @gl.public.view
    def get_comparison(self, id_a: str, id_b: str) -> str:
        a, b = _san(id_a), _san(id_b)
        try: comps = json.loads(self.comparisons_data)
        except: return "{}"
        return comps.get(f"{a}:{b}", comps.get(f"{b}:{a}", "{}"))
