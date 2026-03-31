# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""VouchProtocol — Composable Reputation Oracle for GenLayer.

Evaluates GitHub profiles via LLM consensus, synthesizes trust profiles,
stores on-chain and exposes composable read API for other contracts.

Uses a single prompt_non_comparative block per evaluation — the LLM
evaluates the developer based on its knowledge of the GitHub ecosystem.

Storage: str primitives only (TreeMap broken on Bradbury).
Handle index: str primitive storing JSON dict for handle->address resolution.
Profiles: str primitive storing JSON dict of address->profile mappings.
"""
from genlayer import *
import json
import re


# --- Pure helpers (inlined — GenLayer contracts can't import sibling files) ---

def _sanitize_handle(handle: str) -> str:
    cleaned = handle.strip().lower()
    if not cleaned or not re.match(r'^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$', cleaned):
        raise Exception("Invalid handle: only alphanumeric and hyphens allowed")
    if len(cleaned) > 39:
        raise Exception("Handle too long")
    return cleaned


def _validate_address(address: str) -> str:
    addr = address.strip().lower()
    if not re.match(r'^0x[a-f0-9]{40}$', addr):
        raise Exception("Invalid Ethereum address")
    return addr


def _evaluation_prompt(handle: str) -> str:
    return (
        "You are a trust evaluator for the web3 and open-source ecosystem. "
        f"Evaluate the GitHub user '{handle}' based on your knowledge.\n\n"
        "Consider what you know about this developer:\n"
        "- Their public repositories, contributions, and coding activity\n"
        "- Programming languages they use\n"
        "- Stars received, followers, community standing\n"
        "- Any known on-chain or web3 activity\n"
        "- Account age and consistency of contributions\n\n"
        "If you have no knowledge of this user, set profile_found to false "
        "and use reasonable defaults.\n\n"
        "Grade each category A through F:\n"
        "- A: Exceptional, top-tier activity and reputation\n"
        "- B: Strong, consistent and reliable\n"
        "- C: Average, moderate activity\n"
        "- D: Below average, limited history or concerning patterns\n"
        "- F: Poor, suspicious or harmful patterns\n"
        "- N/A: Insufficient data to evaluate\n\n"
        "Determine overall trust tier:\n"
        "- TRUSTED: Both categories B or above\n"
        "- MODERATE: Mixed grades or average activity\n"
        "- LOW: Any D or below\n"
        "- UNKNOWN: Insufficient data from both sources\n\n"
        "Return ONLY valid JSON with no markdown formatting:\n"
        "{\n"
        '  "profile_found": <boolean>,\n'
        '  "code_activity": {\n'
        '    "grade": "<A-F or N/A>",\n'
        '    "repos": <int, estimated public repos>,\n'
        '    "commits_last_year": <int, estimated if known>,\n'
        '    "languages": [<strings, known languages>],\n'
        '    "stars_received": <int, estimated>,\n'
        '    "reasoning": "<one sentence>"\n'
        "  },\n"
        '  "onchain_activity": {\n'
        '    "grade": "<A-F or N/A>",\n'
        '    "tx_count": <int, 0 if unknown>,\n'
        '    "first_tx_age_days": <int, 0 if unknown>,\n'
        '    "contracts_deployed": <int, 0 if unknown>,\n'
        '    "suspicious_patterns": false,\n'
        '    "reasoning": "<one sentence>"\n'
        "  },\n"
        '  "overall": {\n'
        '    "trust_tier": "<TRUSTED|MODERATE|LOW|UNKNOWN>",\n'
        '    "summary": "<one sentence overall assessment>"\n'
        "  }\n"
        "}"
    )


# --- Contract ---

class VouchProtocol(gl.Contract):
    profiles_data: str    # JSON dict: '{"0xaddr": {profile...}, ...}'
    handle_index: str     # JSON dict: '{"handle": "0xaddr", ...}'
    profile_count: u32
    query_count: u32

    def __init__(self):
        self.profile_count = 0
        self.query_count = 0
        self.profiles_data = "{}"
        self.handle_index = "{}"

    # --- Internal helpers ---

    def _get_profiles(self) -> dict:
        try:
            return json.loads(self.profiles_data)
        except Exception:
            return {}

    def _set_profiles(self, profiles: dict):
        self.profiles_data = json.dumps(profiles)

    def _get_index(self) -> dict:
        try:
            return json.loads(self.handle_index)
        except Exception:
            return {}

    def _set_index(self, index: dict):
        self.handle_index = json.dumps(index)

    def _get_cached(self, address: str) -> str:
        profiles = self._get_profiles()
        return profiles.get(address, "")

    def _store_profile(self, address: str, handle: str, profile: dict, sources: list):
        profile["handle"] = handle
        profile["sources_scraped"] = sources
        profile["vouched_by"] = address
        final_json = json.dumps(profile)
        profiles = self._get_profiles()
        profiles[address] = final_json
        self._set_profiles(profiles)
        index = self._get_index()
        if handle not in index:
            index[handle] = address
            self._set_index(index)
        self.profile_count += 1
        self.query_count += 1
        return final_json

    # --- Core write methods ---

    @gl.public.write
    def vouch(self, github_handle: str) -> str:
        """Generate trust profile from GitHub handle.
        Stores under caller's address. Evaluates via LLM consensus."""
        handle = _sanitize_handle(github_handle)
        caller = str(gl.message.sender_account).lower()

        # Cache hit -> return immediately
        cached = self._get_cached(caller)
        if cached:
            self.query_count += 1
            return cached

        # Single non-det block: LLM evaluates the developer
        prompt = _evaluation_prompt(handle)

        def _evaluate() -> str:
            result = gl.nondet.exec_prompt(prompt)
            return result.strip()

        try:
            profile_json = gl.eq_principle.prompt_non_comparative(
                _evaluate,
                task="Evaluate the trustworthiness of a GitHub developer",
                criteria="The evaluation must be a reasonable trust assessment with grades and reasoning",
            )
        except Exception:
            profile_json = "{}"
        sources = ["llm_evaluation"]

        # Clean markdown wrapping if present
        clean = profile_json.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        try:
            profile = json.loads(clean)
        except Exception:
            profile = {
                "code_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
            }

        return self._store_profile(caller, handle, profile, sources)

    @gl.public.write
    def refresh(self, github_handle: str) -> str:
        """Force re-generate a profile (clears cache, re-evaluates)."""
        caller = str(gl.message.sender_account).lower()

        # Clear cache
        profiles = self._get_profiles()
        if caller in profiles:
            del profiles[caller]
            self._set_profiles(profiles)
            self.profile_count -= 1  # Will be re-incremented by _store_profile

        handle = _sanitize_handle(github_handle)

        # Single non-det block: LLM evaluates the developer
        prompt = _evaluation_prompt(handle)

        def _evaluate() -> str:
            result = gl.nondet.exec_prompt(prompt)
            return result.strip()

        try:
            profile_json = gl.eq_principle.prompt_non_comparative(
                _evaluate,
                task="Re-evaluate the trustworthiness of a GitHub developer",
                criteria="The evaluation must be a reasonable trust assessment with grades and reasoning",
            )
        except Exception:
            profile_json = "{}"
        sources = ["llm_evaluation"]

        # Clean markdown wrapping if present
        clean = profile_json.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        try:
            profile = json.loads(clean)
        except Exception:
            profile = {
                "code_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
            }

        return self._store_profile(caller, handle, profile, sources)

    @gl.public.write
    def seed_profile(self, github_handle: str, profile_json: str) -> str:
        """Store a pre-evaluated profile. Deterministic — no LLM needed.
        Useful for bootstrapping initial data or when validators are congested."""
        handle = _sanitize_handle(github_handle)
        caller = str(gl.message.sender_account).lower()

        try:
            profile = json.loads(profile_json)
        except Exception:
            raise Exception("Invalid profile JSON")

        if "overall" not in profile:
            raise Exception("Profile must contain 'overall' key")

        return self._store_profile(caller, handle, profile, ["seed"])

    # --- View methods (composable API) ---

    @gl.public.view
    def get_profile(self, address: str) -> str:
        """Return cached profile JSON by address. Primary composable API."""
        addr = _validate_address(address)
        return self._get_cached(addr) or "{}"

    @gl.public.view
    def get_profile_by_handle(self, github_handle: str) -> str:
        """Resolve handle to address via index, return profile."""
        handle = github_handle.strip().lower()
        index = self._get_index()
        addr = index.get(handle, "")
        if not addr:
            return "{}"
        return self._get_cached(addr) or "{}"

    @gl.public.view
    def get_trust_tier(self, address: str) -> str:
        """Return just the tier: TRUSTED / MODERATE / LOW / UNKNOWN.
        Lightweight composable endpoint for other contracts."""
        addr = _validate_address(address)
        raw = self._get_cached(addr)
        if not raw:
            return "UNKNOWN"
        try:
            profile = json.loads(raw)
            return profile.get("overall", {}).get("trust_tier", "UNKNOWN")
        except Exception:
            return "UNKNOWN"

    @gl.public.view
    def lookup_address(self, github_handle: str) -> str:
        """Return the wallet address associated with a GitHub handle."""
        handle = github_handle.strip().lower()
        index = self._get_index()
        return index.get(handle, "")

    @gl.public.view
    def get_stats(self) -> str:
        """Return profile count and query count as JSON."""
        return json.dumps({
            "profile_count": self.profile_count,
            "query_count": self.query_count,
        })
