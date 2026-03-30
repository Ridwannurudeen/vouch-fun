"""Pure Python helpers for VouchProtocol.
Separated from the contract so they can be unit-tested without GenLayer runtime.
"""
import re
import json


def sanitize_handle(handle: str) -> str:
    """Validate and normalize a GitHub handle."""
    cleaned = handle.strip().lower()
    if not cleaned or not re.match(r'^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$', cleaned):
        raise Exception("Invalid handle: only alphanumeric and hyphens allowed")
    if len(cleaned) > 39:
        raise Exception("Handle too long")
    return cleaned


def validate_address(address: str) -> str:
    """Validate and normalize an Ethereum address."""
    addr = address.strip().lower()
    if not re.match(r'^0x[a-f0-9]{40}$', addr):
        raise Exception("Invalid Ethereum address")
    return addr


def build_github_prompt(page_html: str) -> str:
    """Build the LLM prompt for GitHub profile extraction."""
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


def build_etherscan_prompt(page_html: str) -> str:
    """Build the LLM prompt for Etherscan address extraction."""
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


def build_synthesis_prompt(github_data: dict, onchain_data: dict) -> str:
    """Build the LLM prompt for trust profile synthesis."""
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


def parse_profile_json(raw: str) -> dict:
    """Safely parse a profile JSON string, returning fallback on failure."""
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {
            "code_activity": {"grade": "N/A", "reasoning": "Parse failed"},
            "onchain_activity": {"grade": "N/A", "reasoning": "Parse failed"},
            "overall": {"trust_tier": "UNKNOWN", "summary": "Could not parse profile"},
        }


def get_handle_index(index_str: str) -> dict:
    """Parse the handle index JSON string."""
    try:
        return json.loads(index_str)
    except (json.JSONDecodeError, TypeError):
        return {}


def set_handle_index(index: dict) -> str:
    """Serialize the handle index to JSON string."""
    return json.dumps(index)


def resolve_handle(index_str: str, handle: str) -> str:
    """Resolve a GitHub handle to a wallet address using the index."""
    index = get_handle_index(index_str)
    return index.get(handle.strip().lower(), "")
