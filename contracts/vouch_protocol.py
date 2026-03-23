"""VouchProtocol — Composable Reputation Oracle for GenLayer.

Scrapes GitHub + Etherscan, synthesizes trust profiles via LLM consensus,
stores on-chain and exposes composable read API for other contracts.

Uses two non-det blocks:
  - strict_eq for factual data extraction (Block 1)
  - prompt_non_comparative for subjective trust synthesis (Block 2)
"""
import json
import re
import gl  # type: ignore[import-not-found]


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
    profiles: TreeMap[str, str]   # handle/address -> JSON profile string
    profile_count: int            # unique profiles generated
    query_count: int              # total queries (vouch + reads)

    def __init__(self):
        self.profile_count = 0
        self.query_count = 0

    # --- Core write methods ---

    @gl.public.write
    def vouch(self, github_handle: str) -> str:
        """Generate trust profile from GitHub handle. Scrapes GitHub,
        optionally Etherscan if ETH address found in bio."""
        handle = _sanitize_handle(github_handle)

        # Cache hit -> return immediately
        cached = self.profiles.get(handle, "")
        if cached:
            self.query_count += 1
            return cached

        # --- Block 1a: Extract GitHub data (strict_eq) ---
        def _extract_github():
            github_html = gl.get_webpage(f"https://github.com/{handle}", mode="text")
            raw = gl.exec_prompt(_github_prompt(github_html))
            try:
                return json.dumps(json.loads(raw))
            except Exception:
                return json.dumps({"profile_found": False})

        github_json = gl.eq_principle_strict_eq(_extract_github)
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
                page_html = gl.get_webpage(
                    f"https://etherscan.io/address/{wallet}", mode="text"
                )
                raw = gl.exec_prompt(_etherscan_prompt(page_html))
                try:
                    return json.dumps(json.loads(raw))
                except Exception:
                    return json.dumps({"address_found": False})

            onchain_json = gl.eq_principle_strict_eq(_extract_onchain)
            onchain_data = json.loads(onchain_json)
            sources.append("etherscan")

        # --- Block 2: Synthesize trust profile (prompt_non_comparative) ---
        synthesis_input = _synthesis_prompt(github_data, onchain_data)

        def _synthesize():
            return gl.exec_prompt(synthesis_input)

        profile_json = gl.eq_principle_prompt_non_comparative(
            _synthesize,
            task="Evaluate a web3 builder's trustworthiness based on GitHub and on-chain data",
            criteria=(
                "Grades reflect activity level, consistency, and absence of "
                "suspicious patterns. TRUSTED requires both grades B or above. "
                "MODERATE for mixed. LOW for any D or below. "
                "UNKNOWN when both sources lack data."
            ),
        )

        # Parse and enrich
        try:
            profile = json.loads(profile_json)
        except Exception:
            profile = {
                "code_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
            }

        profile["handle"] = handle
        profile["sources_scraped"] = sources
        profile["generated_at"] = 0  # Placeholder -- no time.time() in GenLayer

        final_json = json.dumps(profile)

        # Update state -- only increment profile_count for new profiles
        if not self.profiles.get(handle, ""):
            self.profile_count += 1
        self.profiles[handle] = final_json
        self.query_count += 1
        return final_json

    @gl.public.write
    def vouch_address(self, address: str) -> str:
        """Generate trust profile from wallet address (on-chain only)."""
        addr = _validate_address(address)

        # Cache hit -> return immediately
        cached = self.profiles.get(addr, "")
        if cached:
            self.query_count += 1
            return cached

        # --- Block 1: Extract Etherscan data (strict_eq) ---
        def _extract_onchain():
            page_html = gl.get_webpage(
                f"https://etherscan.io/address/{addr}", mode="text"
            )
            raw = gl.exec_prompt(_etherscan_prompt(page_html))
            try:
                return json.dumps(json.loads(raw))
            except Exception:
                return json.dumps({"address_found": False})

        onchain_json = gl.eq_principle_strict_eq(_extract_onchain)
        onchain_data = json.loads(onchain_json)

        # --- Block 2: Synthesize (prompt_non_comparative) ---
        synthesis_input = _synthesis_prompt({}, onchain_data)

        def _synthesize():
            return gl.exec_prompt(synthesis_input)

        profile_json = gl.eq_principle_prompt_non_comparative(
            _synthesize,
            task="Evaluate wallet address trustworthiness based on on-chain activity",
            criteria=(
                "Grade reflects transaction history, account age, and absence "
                "of suspicious patterns. Code activity is N/A (no GitHub)."
            ),
        )

        try:
            profile = json.loads(profile_json)
        except Exception:
            profile = {
                "code_activity": {"grade": "N/A", "reasoning": "No GitHub linked"},
                "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
            }

        profile["handle"] = addr
        profile["sources_scraped"] = ["etherscan"]
        profile["generated_at"] = 0

        final_json = json.dumps(profile)

        if not self.profiles.get(addr, ""):
            self.profile_count += 1
        self.profiles[addr] = final_json
        self.query_count += 1
        return final_json

    @gl.public.write
    def refresh(self, handle: str) -> str:
        """Force re-generate a profile (clears cache, re-scrapes everything).
        Duplicates non-det blocks inline to avoid nested public-write calls."""
        key = handle.strip().lower()

        # Clear cache
        self.profiles[key] = ""

        is_address = bool(re.match(r'^0x[a-f0-9]{40}$', key))

        if is_address:
            addr = _validate_address(key)

            def _extract_onchain():
                page_html = gl.get_webpage(
                    f"https://etherscan.io/address/{addr}", mode="text"
                )
                raw = gl.exec_prompt(_etherscan_prompt(page_html))
                try:
                    return json.dumps(json.loads(raw))
                except Exception:
                    return json.dumps({"address_found": False})

            onchain_json = gl.eq_principle_strict_eq(_extract_onchain)
            onchain_data = json.loads(onchain_json)

            synthesis_input = _synthesis_prompt({}, onchain_data)

            def _synthesize():
                return gl.exec_prompt(synthesis_input)

            profile_json = gl.eq_principle_prompt_non_comparative(
                _synthesize,
                task="Evaluate wallet trustworthiness from on-chain activity",
                criteria="Grade reflects tx history, age, absence of suspicious patterns.",
            )

            try:
                profile = json.loads(profile_json)
            except Exception:
                profile = {
                    "code_activity": {"grade": "N/A", "reasoning": "No GitHub"},
                    "onchain_activity": {"grade": "N/A", "reasoning": "Synthesis failed"},
                    "overall": {"trust_tier": "UNKNOWN", "summary": "Could not synthesize"},
                }

            profile["handle"] = addr
            profile["sources_scraped"] = ["etherscan"]
            profile["generated_at"] = 0
            final_json = json.dumps(profile)
            self.profiles[addr] = final_json
            self.query_count += 1
            return final_json

        else:
            clean_handle = _sanitize_handle(key)

            def _extract_github():
                github_html = gl.get_webpage(
                    f"https://github.com/{clean_handle}", mode="text"
                )
                raw = gl.exec_prompt(_github_prompt(github_html))
                try:
                    return json.dumps(json.loads(raw))
                except Exception:
                    return json.dumps({"profile_found": False})

            github_json = gl.eq_principle_strict_eq(_extract_github)
            github_data = json.loads(github_json)

            bio = github_data.get("bio", "")
            eth_match = re.search(r'0x[a-fA-F0-9]{40}', bio)
            onchain_data = {}
            sources = ["github"]

            if eth_match:
                wallet = eth_match.group(0).lower()

                def _extract_onchain():
                    page_html = gl.get_webpage(
                        f"https://etherscan.io/address/{wallet}", mode="text"
                    )
                    raw = gl.exec_prompt(_etherscan_prompt(page_html))
                    try:
                        return json.dumps(json.loads(raw))
                    except Exception:
                        return json.dumps({"address_found": False})

                onchain_json = gl.eq_principle_strict_eq(_extract_onchain)
                onchain_data = json.loads(onchain_json)
                sources.append("etherscan")

            synthesis_input = _synthesis_prompt(github_data, onchain_data)

            def _synthesize():
                return gl.exec_prompt(synthesis_input)

            profile_json = gl.eq_principle_prompt_non_comparative(
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

            profile["handle"] = clean_handle
            profile["sources_scraped"] = sources
            profile["generated_at"] = 0
            final_json = json.dumps(profile)
            self.profiles[clean_handle] = final_json
            self.query_count += 1
            return final_json

    # --- View methods (composable API) ---

    @gl.public.view
    def get_profile(self, handle: str) -> str:
        """Return cached profile JSON. Primary composable API."""
        key = handle.strip().lower()
        return self.profiles.get(key, "{}")

    @gl.public.view
    def get_trust_tier(self, handle: str) -> str:
        """Return just the tier: TRUSTED / MODERATE / LOW / UNKNOWN.
        Lightweight composable endpoint for other contracts."""
        key = handle.strip().lower()
        raw = self.profiles.get(key, "")
        if not raw:
            return "UNKNOWN"
        try:
            profile = json.loads(raw)
            return profile.get("overall", {}).get("trust_tier", "UNKNOWN")
        except Exception:
            return "UNKNOWN"

    @gl.public.view
    def get_stats(self) -> str:
        """Return profile count and query count as JSON."""
        return json.dumps({
            "profile_count": self.profile_count,
            "query_count": self.query_count,
        })
