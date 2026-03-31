# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re


def _sanitize(h: str) -> str:
    c = h.strip().lower()
    if not c or not re.match(r'^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$', c) or len(c) > 39:
        raise Exception("Invalid handle")
    return c


def _prompt(handle: str) -> str:
    return (
        f"Evaluate GitHub user '{handle}' as a trust evaluator. "
        "Grade code_activity and onchain_activity A-F. "
        "Tiers: TRUSTED (both B+), MODERATE (mixed), LOW (any D-), UNKNOWN (no data). "
        "Return ONLY JSON:\n"
        '{"profile_found":<bool>,"code_activity":{"grade":"<A-F>","repos":<int>,'
        '"commits_last_year":<int>,"languages":[<str>],"stars_received":<int>,'
        '"reasoning":"<1 sentence>"},"onchain_activity":{"grade":"<A-F>",'
        '"tx_count":<int>,"first_tx_age_days":<int>,"contracts_deployed":<int>,'
        '"suspicious_patterns":false,"reasoning":"<1 sentence>"},'
        '"overall":{"trust_tier":"<TRUSTED|MODERATE|LOW|UNKNOWN>",'
        '"summary":"<1 sentence>"}}'
    )


class VouchProtocol(gl.Contract):
    profiles_data: str
    handle_index: str
    profile_count: u32
    query_count: u32

    def __init__(self):
        self.profile_count = 0
        self.query_count = 0
        self.profiles_data = "{}"
        self.handle_index = "{}"
        self._seed()

    def _seed(self):
        a1 = "0x0000000000000000000000000000000000000001"
        a2 = "0x0000000000000000000000000000000000000002"
        a3 = "0x0000000000000000000000000000000000000003"
        p1 = {"handle": "vbuterin", "sources_scraped": ["seed"], "vouched_by": a1,
              "code_activity": {"grade": "A", "repos": 191, "commits_last_year": 520,
                  "languages": ["Python", "Solidity", "JS"], "stars_received": 45000,
                  "reasoning": "Ethereum creator"},
              "onchain_activity": {"grade": "A", "tx_count": 8500, "first_tx_age_days": 3200,
                  "contracts_deployed": 50, "suspicious_patterns": False,
                  "reasoning": "On-chain since genesis"},
              "overall": {"trust_tier": "TRUSTED", "summary": "Ethereum co-founder"}}
        p2 = {"handle": "gakonst", "sources_scraped": ["seed"], "vouched_by": a2,
              "code_activity": {"grade": "A", "repos": 120, "commits_last_year": 380,
                  "languages": ["Rust", "Solidity", "TS"], "stars_received": 15000,
                  "reasoning": "Paradigm CTO, Foundry"},
              "onchain_activity": {"grade": "A", "tx_count": 3200, "first_tx_age_days": 2100,
                  "contracts_deployed": 30, "suspicious_patterns": False,
                  "reasoning": "Active DeFi builder"},
              "overall": {"trust_tier": "TRUSTED", "summary": "Paradigm CTO"}}
        p3 = {"handle": "ridwannurudeen", "sources_scraped": ["seed"], "vouched_by": a3,
              "code_activity": {"grade": "B", "repos": 35, "commits_last_year": 280,
                  "languages": ["Rust", "Python", "TS", "Sol"], "stars_received": 50,
                  "reasoning": "Multi-chain OSS dev"},
              "onchain_activity": {"grade": "B", "tx_count": 450, "first_tx_age_days": 800,
                  "contracts_deployed": 12, "suspicious_patterns": False,
                  "reasoning": "Consistent activity"},
              "overall": {"trust_tier": "TRUSTED", "summary": "Multi-chain builder"}}
        profiles = {a1: json.dumps(p1), a2: json.dumps(p2), a3: json.dumps(p3)}
        self.profiles_data = json.dumps(profiles)
        self.handle_index = json.dumps({"vbuterin": a1, "gakonst": a2, "ridwannurudeen": a3})
        self.profile_count = 3

    def _get_profiles(self) -> dict:
        try:
            return json.loads(self.profiles_data)
        except Exception:
            return {}

    def _set_profiles(self, p: dict):
        self.profiles_data = json.dumps(p)

    def _get_index(self) -> dict:
        try:
            return json.loads(self.handle_index)
        except Exception:
            return {}

    def _set_index(self, idx: dict):
        self.handle_index = json.dumps(idx)

    def _get_cached(self, addr: str) -> str:
        return self._get_profiles().get(addr, "")

    def _store(self, addr: str, handle: str, profile: dict, src: list):
        profile["handle"] = handle
        profile["sources_scraped"] = src
        profile["vouched_by"] = addr
        fj = json.dumps(profile)
        p = self._get_profiles()
        p[addr] = fj
        self._set_profiles(p)
        idx = self._get_index()
        if handle not in idx:
            idx[handle] = addr
            self._set_index(idx)
        self.profile_count += 1
        self.query_count += 1
        return fj

    def _do_eval(self, handle: str, caller: str) -> str:
        prompt = _prompt(handle)
        def _run() -> str:
            return gl.nondet.exec_prompt(prompt).strip()
        try:
            raw = gl.eq_principle.prompt_non_comparative(
                _run, task="Evaluate GitHub developer trust",
                criteria="Reasonable trust assessment with grades")
        except Exception:
            raw = "{}"
        c = raw.strip()
        if c.startswith("```"):
            c = c.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            profile = json.loads(c)
        except Exception:
            profile = {"code_activity": {"grade": "N/A", "reasoning": "Failed"},
                       "onchain_activity": {"grade": "N/A", "reasoning": "Failed"},
                       "overall": {"trust_tier": "UNKNOWN", "summary": "Could not evaluate"}}
        return self._store(caller, handle, profile, ["llm_evaluation"])

    @gl.public.write
    def vouch(self, github_handle: str) -> str:
        handle = _sanitize(github_handle)
        caller = str(gl.message.sender_account).lower()
        cached = self._get_cached(caller)
        if cached:
            self.query_count += 1
            return cached
        return self._do_eval(handle, caller)

    @gl.public.write
    def refresh(self, github_handle: str) -> str:
        caller = str(gl.message.sender_account).lower()
        p = self._get_profiles()
        if caller in p:
            del p[caller]
            self._set_profiles(p)
            self.profile_count -= 1
        return self._do_eval(_sanitize(github_handle), caller)

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
        if not re.match(r'^0x[a-f0-9]{40}$', a):
            return "{}"
        return self._get_cached(a) or "{}"

    @gl.public.view
    def get_profile_by_handle(self, github_handle: str) -> str:
        h = github_handle.strip().lower()
        a = self._get_index().get(h, "")
        return self._get_cached(a) or "{}" if a else "{}"

    @gl.public.view
    def get_trust_tier(self, address: str) -> str:
        a = address.strip().lower()
        if not re.match(r'^0x[a-f0-9]{40}$', a):
            return "UNKNOWN"
        raw = self._get_cached(a)
        if not raw:
            return "UNKNOWN"
        try:
            return json.loads(raw).get("overall", {}).get("trust_tier", "UNKNOWN")
        except Exception:
            return "UNKNOWN"

    @gl.public.view
    def lookup_address(self, github_handle: str) -> str:
        return self._get_index().get(github_handle.strip().lower(), "")

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({"profile_count": self.profile_count, "query_count": self.query_count})
