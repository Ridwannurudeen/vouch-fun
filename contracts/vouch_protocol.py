# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""VouchProtocol — Composable Reputation Oracle for GenLayer.

Scrapes GitHub + Etherscan, synthesizes trust profiles via LLM consensus,
stores on-chain and exposes composable read API for other contracts.

Uses two non-det blocks:
  - strict_eq for factual data extraction (Block 1)
  - prompt_non_comparative for subjective trust synthesis (Block 2)

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


def _github_prompt(page_html: str) -> str:
    return (
        "You are analyzing a GitHub profile page. "
        "Extract the following data from the page content below. "
        "If a field cannot be found, use 0 for numbers, [] for lists, "
        "and 'unknown' for strings.\n\n"
        "Return ONLY valid JSON with these exact keys:\n"
        "{\n"
        '  "repos": <int, number of public repositories>,\n'
        '  "commits_last_year": <int, contribution count if visible, else 0>,\n'
        '  "languages": [<strings, top programming languages>],\n'
        '  "stars_received": <int, total stars if visible, else 0>,\n'
        '  "account_age_years": <int, approximate years since creation>,\n'
        '  "bio": <string, user bio text>,\n'
        '  "followers": <int>,\n'
        '  "following": <int>,\n'
        '  "profile_found": <boolean, true if this is a real profile page>\n'
        "}\n\n"
        f"Page content:\n{page_html[:8000]}"
    )


def _etherscan_prompt(page_html: str) -> str:
    return (
        "You are analyzing an Etherscan address page. "
        "Extract the following data. "
        "If a field cannot be found, use 0 for numbers and false for booleans.\n\n"
        "Return ONLY valid JSON with these exact keys:\n"
        "{\n"
        '  "tx_count": <int, total transactions>,\n'
        '  "first_tx_age_days": <int, approx days since first transaction>,\n'
        '  "contracts_deployed": <int>,\n'
        '  "token_diversity": <int, number of different tokens held>,\n'
        '  "suspicious_patterns": <boolean, any obvious rug/scam indicators>,\n'
        '  "address_found": <boolean, true if address has activity>\n'
        "}\n\n"
        f"Page content:\n{page_html[:8000]}"
    )


def _synthesis_prompt(github_data: dict, onchain_data: dict) -> str:
    extracted = json.dumps({"github": github_data, "onchain": onchain_data})
    return (
        "You are a trust evaluator for the web3 ecosystem. "
        "Given the following extracted data about a builder, "
        "evaluate their trustworthiness.\n\n"
        f"Extracted data:\n{extracted}\n\n"
        "Grade each category A through F:\n"
        "- A: Exceptional, top-tier activity and reputation\n"
        "- B: Strong, consistent and reliable\n"
        "- C: Average, moderate activity\n"
        "- D: Below average, limited history or concerning patterns\n"
        "- F: Poor, suspicious or harmful patterns\n"
        "- N/A: Source data unavailable\n\n"
        "Determine overall trust tier:\n"
        "- TRUSTED: Both categories B or above\n"
        "- MODERATE: Mixed grades\n"
        "- LOW: Any D or below\n"
        "- UNKNOWN: Insufficient data from both sources\n\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "code_activity": {"grade": "A-F or N/A", "repos": <int>, '
        '"commits_last_year": <int>, "languages": [<strings>], '
        '"stars_received": <int>, "reasoning": "<one sentence>"},\n'
        '  "onchain_activity": {"grade": "A-F or N/A", "tx_count": <int>, '
        '"first_tx_age_days": <int>, "contracts_deployed": <int>, '
        '"suspicious_patterns": <boolean>, "reasoning": "<one sentence>"},\n'
        '  "overall": {"trust_tier": "TRUSTED|MODERATE|LOW|UNKNOWN", '
        '"summary": "<one sentence overall assessment>"}\n'
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
        Stores under caller's address. Scrapes GitHub,
        optionally Etherscan if ETH address found in bio."""
        handle = _sanitize_handle(github_handle)
        caller = gl.message.sender_account

        # Cache hit -> return immediately
        cached = self._get_cached(caller)
        if cached:
            self.query_count += 1
            return cached

        # --- Block 1a: Extract GitHub data (strict_eq) ---
        def _extract_github():
            github_html = gl.nondet.web.render(
                f"https://github.com/{handle}", mode="text"
            )
            raw = gl.nondet.exec_prompt(_github_prompt(github_html))
            try:
                return json.dumps(json.loads(raw))
            except Exception:
                return json.dumps({"profile_found": False})

        github_json = gl.eq_principle.strict_eq(_extract_github)
        github_data = json.loads(github_json)

        # Check bio for ETH address -> optional on-chain lookup
        bio = github_data.get("bio", "")
        eth_match = re.search(r'0x[a-fA-F0-9]{40}', bio)
        onchain_data = {}
        sources = ["github"]

        if eth_match:
            wallet = eth_match.group(0).lower()

            # --- Block 1b: Extract Etherscan data (strict_eq) ---
            def _extract_onchain():
                page_html = gl.nondet.web.render(
                    f"https://etherscan.io/address/{wallet}", mode="text"
                )
                raw = gl.nondet.exec_prompt(_etherscan_prompt(page_html))
                try:
                    return json.dumps(json.loads(raw))
                except Exception:
                    return json.dumps({"address_found": False})

            onchain_json = gl.eq_principle.strict_eq(_extract_onchain)
            onchain_data = json.loads(onchain_json)
            sources.append("etherscan")

        # --- Block 2: Synthesize trust profile (prompt_non_comparative) ---
        synthesis_input = _synthesis_prompt(github_data, onchain_data)

        def _synthesize():
            return gl.nondet.exec_prompt(synthesis_input)

        profile_json = gl.eq_principle.prompt_non_comparative(
            _synthesize,
            task="Evaluate a web3 builder's trustworthiness based on GitHub and on-chain data",
            criteria=(
                "Grades reflect activity level, consistency, and absence of "
                "suspicious patterns. TRUSTED requires both grades B or above. "
                "MODERATE for mixed. LOW for any D or below. "
                "UNKNOWN when both sources lack data."
            ),
        )

        try:
            profile = json.loads(profile_json)
        except Exception:
            profile = {
                "code_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
            }

        return self._store_profile(caller, handle, profile, sources)

    @gl.public.write
    def refresh(self, github_handle: str) -> str:
        """Force re-generate a profile (clears cache, re-scrapes everything)."""
        caller = gl.message.sender_account

        # Clear cache
        profiles = self._get_profiles()
        if caller in profiles:
            del profiles[caller]
            self._set_profiles(profiles)
            self.profile_count -= 1  # Will be re-incremented by _store_profile

        handle = _sanitize_handle(github_handle)

        # --- Block 1a: Extract GitHub data ---
        def _extract_github():
            github_html = gl.nondet.web.render(
                f"https://github.com/{handle}", mode="text"
            )
            raw = gl.nondet.exec_prompt(_github_prompt(github_html))
            try:
                return json.dumps(json.loads(raw))
            except Exception:
                return json.dumps({"profile_found": False})

        github_json = gl.eq_principle.strict_eq(_extract_github)
        github_data = json.loads(github_json)

        bio = github_data.get("bio", "")
        eth_match = re.search(r'0x[a-fA-F0-9]{40}', bio)
        onchain_data = {}
        sources = ["github"]

        if eth_match:
            wallet = eth_match.group(0).lower()

            def _extract_onchain():
                page_html = gl.nondet.web.render(
                    f"https://etherscan.io/address/{wallet}", mode="text"
                )
                raw = gl.nondet.exec_prompt(_etherscan_prompt(page_html))
                try:
                    return json.dumps(json.loads(raw))
                except Exception:
                    return json.dumps({"address_found": False})

            onchain_json = gl.eq_principle.strict_eq(_extract_onchain)
            onchain_data = json.loads(onchain_json)
            sources.append("etherscan")

        synthesis_input = _synthesis_prompt(github_data, onchain_data)

        def _synthesize():
            return gl.nondet.exec_prompt(synthesis_input)

        profile_json = gl.eq_principle.prompt_non_comparative(
            _synthesize,
            task="Evaluate web3 builder trustworthiness from GitHub and on-chain data",
            criteria=(
                "Grades reflect activity, consistency, absence of suspicious patterns. "
                "TRUSTED = both B+. MODERATE = mixed. LOW = any D-. UNKNOWN = no data."
            ),
        )

        try:
            profile = json.loads(profile_json)
        except Exception:
            profile = {
                "code_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
            }

        return self._store_profile(caller, handle, profile, sources)

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
