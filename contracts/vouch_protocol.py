# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re

_J = ('{"profile_found":<bool>,"code_activity":{"grade":"<A-F>","repos":<int>,'
      '"commits_last_year":<int>,"languages":[<str>],"stars_received":<int>,'
      '"reasoning":"<1 sentence>"},"onchain_activity":{"grade":"<A-F>",'
      '"tx_count":<int>,"first_tx_age_days":<int>,"contracts_deployed":<int>,'
      '"suspicious_patterns":false,"reasoning":"<1 sentence>"},'
      '"overall":{"trust_tier":"<TRUSTED|MODERATE|LOW|UNKNOWN>","summary":"<1 sentence>"}}')

def _sanitize(h):
    c = h.strip().lower()
    if not c or not re.match(r'^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$', c) or len(c) > 39:
        raise Exception("Invalid handle")
    return c

def _prompt(handle):
    return (f"Evaluate GitHub user '{handle}'. Grade code_activity and onchain_activity A-F. "
            "Tiers: TRUSTED(both B+),MODERATE(mixed),LOW(any D-),UNKNOWN(no data). Return ONLY JSON:\n" + _J)

def _parse(raw):
    c = raw.strip()
    if c.startswith("```"):
        c = c.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(c)
    except Exception:
        return {"code_activity": {"grade": "N/A", "reasoning": "Failed"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not evaluate"}}

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
        a1, a2, a3 = ("0x" + "0" * 39 + str(i) for i in range(1, 4))
        s = [{"handle":"vbuterin","sources_scraped":["seed"],"vouched_by":a1,
              "code_activity":{"grade":"A","repos":191,"commits_last_year":520,
              "languages":["Python","Solidity","JS"],"stars_received":45000,
              "reasoning":"Ethereum creator"},
              "onchain_activity":{"grade":"A","tx_count":8500,"first_tx_age_days":3200,
              "contracts_deployed":50,"suspicious_patterns":False,
              "reasoning":"On-chain since genesis"},
              "overall":{"trust_tier":"TRUSTED","summary":"Ethereum co-founder"}},
             {"handle":"gakonst","sources_scraped":["seed"],"vouched_by":a2,
              "code_activity":{"grade":"A","repos":120,"commits_last_year":380,
              "languages":["Rust","Solidity","TS"],"stars_received":15000,
              "reasoning":"Paradigm CTO, Foundry"},
              "onchain_activity":{"grade":"A","tx_count":3200,"first_tx_age_days":2100,
              "contracts_deployed":30,"suspicious_patterns":False,
              "reasoning":"Active DeFi builder"},
              "overall":{"trust_tier":"TRUSTED","summary":"Paradigm CTO"}},
             {"handle":"ridwannurudeen","sources_scraped":["seed"],"vouched_by":a3,
              "code_activity":{"grade":"B","repos":35,"commits_last_year":280,
              "languages":["Rust","Python","TS","Sol"],"stars_received":50,
              "reasoning":"Multi-chain OSS dev"},
              "onchain_activity":{"grade":"B","tx_count":450,"first_tx_age_days":800,
              "contracts_deployed":12,"suspicious_patterns":False,
              "reasoning":"Consistent activity"},
              "overall":{"trust_tier":"TRUSTED","summary":"Multi-chain builder"}}]
        addrs = [a1, a2, a3]
        profiles = {addrs[i]: json.dumps(s[i]) for i in range(3)}
        self.profiles_data = json.dumps(profiles)
        self.handle_index = json.dumps({s[i]["handle"]: addrs[i] for i in range(3)})
        self.profile_count = 3

    def _gp(self):
        try: return json.loads(self.profiles_data)
        except: return {}

    def _sp(self, p):
        self.profiles_data = json.dumps(p)

    def _gi(self):
        try: return json.loads(self.handle_index)
        except: return {}

    def _si(self, idx):
        self.handle_index = json.dumps(idx)

    def _gc(self, addr):
        return self._gp().get(addr, "")

    def _store(self, addr, handle, profile, src):
        profile["handle"] = handle
        profile["sources_scraped"] = src
        profile["vouched_by"] = addr
        fj = json.dumps(profile)
        p = self._gp()
        p[addr] = fj
        self._sp(p)
        idx = self._gi()
        if handle not in idx:
            idx[handle] = addr
            self._si(idx)
        self.profile_count += 1
        self.query_count += 1
        return fj

    def _eval(self, handle, caller, prompt, task, criteria):
        def _run():
            return gl.nondet.exec_prompt(prompt).strip()
        try:
            raw = gl.eq_principle.prompt_non_comparative(_run, task=task, criteria=criteria)
        except:
            raw = "{}"
        return _parse(raw)

    def _do_eval(self, handle, caller):
        profile = self._eval(handle, caller, _prompt(handle),
                             "Evaluate developer trust", "Reasonable trust assessment")
        return self._store(caller, handle, profile, ["llm_evaluation"])

    @gl.public.write
    def vouch(self, github_handle: str) -> str:
        handle = _sanitize(github_handle)
        caller = str(gl.message.sender_account).lower()
        cached = self._gc(caller)
        if cached:
            self.query_count += 1
            return cached
        return self._do_eval(handle, caller)

    @gl.public.write
    def refresh(self, github_handle: str) -> str:
        caller = str(gl.message.sender_account).lower()
        p = self._gp()
        if caller in p:
            del p[caller]
            self._sp(p)
            self.profile_count -= 1
        return self._do_eval(_sanitize(github_handle), caller)

    @gl.public.write
    def dispute(self, github_handle: str, reason: str) -> str:
        handle = _sanitize(github_handle)
        caller = str(gl.message.sender_account).lower()
        prompt = (f"Re-evaluate GitHub user '{handle}'. Challenge: '{reason[:200]}'. " +
                  "Re-assess with this context. Grade A-F. "
                  "Tiers: TRUSTED(both B+),MODERATE(mixed),LOW(any D-),UNKNOWN(no data). Return ONLY JSON:\n" + _J)
        profile = self._eval(handle, caller, prompt,
                             "Re-evaluate disputed trust", "Trust re-assessment with dispute context")
        profile["disputed"] = True
        profile["dispute_reason"] = reason[:200]
        idx = self._gi()
        addr = idx.get(handle, caller)
        p = self._gp()
        if addr in p:
            del p[addr]
            self._sp(p)
            self.profile_count -= 1
        self.dispute_count += 1
        return self._store(addr, handle, profile, ["llm_evaluation", "dispute"])

    @gl.public.write
    def compare(self, handle_a: str, handle_b: str) -> str:
        ha, hb = _sanitize(handle_a), _sanitize(handle_b)
        prompt = (f"Compare GitHub users '{ha}' and '{hb}'. "
                  "Who has stronger code + on-chain presence? Return ONLY JSON:\n"
                  '{"handle_a":"'+ha+'","handle_b":"'+hb+'",'
                  '"summary":"<2 sentences>","winner":"<handle>","reasoning":"<1 sentence>"}')
        def _run():
            return gl.nondet.exec_prompt(prompt).strip()
        try:
            raw = gl.eq_principle.prompt_non_comparative(
                _run, task="Compare developers", criteria="Reasonable comparison")
        except:
            raw = "{}"
        comp = _parse(raw)
        if "summary" not in comp:
            comp = {"handle_a":ha,"handle_b":hb,"summary":"Could not compare","winner":"","reasoning":"Failed"}
        try: comps = json.loads(self.comparisons_data)
        except: comps = {}
        comps[f"{ha}:{hb}"] = json.dumps(comp)
        self.comparisons_data = json.dumps(comps)
        self.query_count += 1
        return json.dumps(comp)

    @gl.public.write
    def seed_profile(self, github_handle: str, profile_json: str) -> str:
        handle = _sanitize(github_handle)
        caller = str(gl.message.sender_account).lower()
        profile = json.loads(profile_json)
        if "overall" not in profile:
            raise Exception("Missing overall")
        return self._store(caller, handle, profile, ["seed"])

    @gl.public.view
    def get_profile(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "{}"
        return self._gc(a) or "{}"

    @gl.public.view
    def get_profile_by_handle(self, github_handle: str) -> str:
        h = github_handle.strip().lower()
        a = self._gi().get(h, "")
        return self._gc(a) or "{}" if a else "{}"

    @gl.public.view
    def get_trust_tier(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a): return "UNKNOWN"
        raw = self._gc(a)
        if not raw: return "UNKNOWN"
        try: return json.loads(raw).get("overall", {}).get("trust_tier", "UNKNOWN")
        except: return "UNKNOWN"

    @gl.public.view
    def lookup_address(self, github_handle: str) -> str:
        return self._gi().get(github_handle.strip().lower(), "")

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({"profile_count": self.profile_count,
                           "query_count": self.query_count,
                           "dispute_count": self.dispute_count})

    @gl.public.view
    def get_all_handles(self) -> str:
        return json.dumps(list(self._gi().keys()))

    @gl.public.view
    def get_comparison(self, handle_a: str, handle_b: str) -> str:
        ha, hb = handle_a.strip().lower(), handle_b.strip().lower()
        try: comps = json.loads(self.comparisons_data)
        except: return "{}"
        return comps.get(f"{ha}:{hb}", comps.get(f"{hb}:{ha}", "{}"))
