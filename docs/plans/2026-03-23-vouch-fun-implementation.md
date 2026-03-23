# vouch.fun Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a composable reputation oracle on GenLayer that scrapes GitHub + Etherscan, synthesizes trust profiles via LLM consensus, and serves them on-chain for other contracts to query.

**Architecture:** Python Intelligent Contract with two non-det blocks (strict_eq for factual extraction, prompt_non_comparative for subjective trust synthesis). React + Vite + Tailwind frontend using GenLayerJS SDK for contract interaction.

**Tech Stack:** Python (GenLayer Intelligent Contract), React 18+, Vite, Tailwind CSS, GenLayerJS SDK (`genlayer-js`), GenLayer CLI, Vitest (frontend tests), pytest (contract unit tests)

**Design Doc:** `docs/plans/2026-03-23-vouch-fun-design.md`

---

## GenLayer SDK Reference (for implementer)

**Critical patterns from verified working code:**
```python
import json
import gl  # type: ignore[import-not-found]

class MyContract(gl.Contract):
    my_map: TreeMap[str, str]       # key-value storage
    my_int: int                     # plain int

    def __init__(self):
        self.my_int = 0

    @gl.public.write
    def my_write(self, arg: str) -> str:
        local_var = arg  # capture for closure — NO self inside non-det

        def _nondet_fn():
            html = gl.get_webpage(f"https://example.com/{local_var}", mode="text")
            result = gl.exec_prompt(f"Extract data from: {html}")
            return result  # JSON string

        result = gl.eq_principle_strict_eq(_nondet_fn)       # deterministic
        # OR
        result = gl.eq_principle_prompt_non_comparative(      # fuzzy
            _nondet_fn, task="...", criteria="..."
        )
        self.my_map[local_var] = result
        return result

    @gl.public.view
    def my_read(self, key: str) -> str:
        return self.my_map.get(key, "{}")
```

**Rules for non-det blocks:**
- Plain function with NO arguments
- NO `self` access inside the function
- Capture needed variables as local vars BEFORE defining the function
- Return a string (JSON serialized)
- `gl.get_webpage(url, mode="text")` for web scraping
- `gl.exec_prompt(prompt)` for LLM calls
- No `response_format` parameter — ask for JSON in the prompt text

**Frontend SDK patterns:**
```typescript
import { createClient, createAccount } from "genlayer-js";
import { simulator, testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: simulator, account: createAccount() });

// Read (free, no transaction)
const result = await client.readContract({
  address: "0x..." as `0x${string}`,
  functionName: "get_profile",
  args: ["torvalds"],
});

// Write (creates transaction, costs gas)
const txHash = await client.writeContract({
  address: "0x..." as `0x${string}`,
  functionName: "vouch",
  args: ["torvalds"],
});
const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  retries: 120,
  interval: 5000,
});
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `.env.example`
- Create: `contracts/` (empty dir)
- Create: `tests/` (empty dir)
- Create: `deploy/` (empty dir)

**Step 1: Initialize git repo**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git init
```
Expected: `Initialized empty Git repository in ...`

**Step 2: Create `.gitignore`**

Create file `.gitignore`:
```gitignore
node_modules/
dist/
.env
__pycache__/
*.pyc
.vite/
.DS_Store
```

**Step 3: Create root `package.json`**

Create file `package.json`:
```json
{
  "name": "vouch-fun",
  "type": "module",
  "private": true,
  "workspaces": ["frontend"],
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "deploy": "genlayer deploy"
  },
  "devDependencies": {
    "genlayer-js": "^0.18.3"
  }
}
```

**Step 4: Create `.env.example`**

Create file `.env.example`:
```
VITE_CONTRACT_ADDRESS=0x_YOUR_CONTRACT_ADDRESS_HERE
VITE_NETWORK=simulator
```

**Step 5: Create directory structure**

```bash
mkdir -p contracts tests deploy
```
Expected: No output (directories created silently)

**Step 6: Commit scaffold**

```bash
git add .gitignore package.json .env.example
git commit -m "chore: initial project scaffold"
```
Expected: `[main (root-commit) ...] chore: initial project scaffold`

---

## Task 2: Write Unit Tests for Input Validators

**Files:**
- Create: `tests/test_validators.py`

**Step 1: Create test file with failing tests**

Create file `tests/test_validators.py`:
```python
"""Unit tests for input validation helpers.

These test pure Python functions — no GenLayer runtime needed.
Run with: pytest tests/test_validators.py -v
"""
import pytest
import sys
import os

# Add contracts dir to path so we can import helpers
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vouch_helpers import sanitize_handle, validate_address


class TestSanitizeHandle:
    def test_valid_lowercase(self):
        assert sanitize_handle("torvalds") == "torvalds"

    def test_valid_with_hyphens(self):
        assert sanitize_handle("my-user") == "my-user"

    def test_strips_whitespace(self):
        assert sanitize_handle("  torvalds  ") == "torvalds"

    def test_lowercases(self):
        assert sanitize_handle("Torvalds") == "torvalds"

    def test_single_char(self):
        assert sanitize_handle("a") == "a"

    def test_rejects_empty(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("")

    def test_rejects_special_chars(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("user@name")

    def test_rejects_spaces_in_middle(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("user name")

    def test_rejects_too_long(self):
        with pytest.raises(Exception, match="Handle too long"):
            sanitize_handle("a" * 40)

    def test_max_length_ok(self):
        assert sanitize_handle("a" * 39) == "a" * 39

    def test_rejects_leading_hyphen(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("-user")

    def test_rejects_trailing_hyphen(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("user-")


class TestValidateAddress:
    def test_valid_address(self):
        addr = "0x" + "a" * 40
        assert validate_address(addr) == addr

    def test_strips_and_lowercases(self):
        addr = "0x" + "A" * 40
        assert validate_address(addr) == "0x" + "a" * 40

    def test_rejects_short(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("0x1234")

    def test_rejects_no_prefix(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("a" * 40)

    def test_rejects_non_hex(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("0x" + "g" * 40)

    def test_rejects_empty(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("")
```

**Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
pytest tests/test_validators.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'vouch_helpers'`

**Step 3: Commit failing tests**

```bash
git add tests/test_validators.py
git commit -m "test: add failing unit tests for input validators"
```

---

## Task 3: Implement Input Validators

**Files:**
- Create: `contracts/vouch_helpers.py`

**Step 1: Implement the validators**

Create file `contracts/vouch_helpers.py`:
```python
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
```

**Step 2: Run tests to verify they pass**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
pytest tests/test_validators.py -v
```
Expected: All 16 tests PASS

**Step 3: Commit**

```bash
git add contracts/vouch_helpers.py
git commit -m "feat: implement input validators and prompt builders"
```

---

## Task 4: Write Unit Tests for Prompt Builders

**Files:**
- Create: `tests/test_prompts.py`

**Step 1: Write tests**

Create file `tests/test_prompts.py`:
```python
"""Unit tests for prompt builder functions."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vouch_helpers import (
    build_github_prompt,
    build_etherscan_prompt,
    build_synthesis_prompt,
    parse_profile_json,
)


class TestBuildGithubPrompt:
    def test_returns_string(self):
        result = build_github_prompt("some html content")
        assert isinstance(result, str)

    def test_contains_json_keys(self):
        result = build_github_prompt("html")
        assert '"repos"' in result
        assert '"commits_last_year"' in result
        assert '"profile_found"' in result

    def test_truncates_long_html(self):
        long_html = "x" * 20000
        result = build_github_prompt(long_html)
        # Prompt should contain at most 8000 chars of HTML
        assert long_html not in result  # Full 20k string not present
        assert "x" * 8000 in result     # But 8k truncation is

    def test_includes_page_content(self):
        result = build_github_prompt("unique_test_content_xyz")
        assert "unique_test_content_xyz" in result


class TestBuildEtherscanPrompt:
    def test_returns_string(self):
        result = build_etherscan_prompt("some html")
        assert isinstance(result, str)

    def test_contains_json_keys(self):
        result = build_etherscan_prompt("html")
        assert '"tx_count"' in result
        assert '"suspicious_patterns"' in result
        assert '"address_found"' in result

    def test_truncates_long_html(self):
        long_html = "y" * 20000
        result = build_etherscan_prompt(long_html)
        assert long_html not in result
        assert "y" * 8000 in result


class TestBuildSynthesisPrompt:
    def test_returns_string(self):
        result = build_synthesis_prompt({"repos": 10}, {"tx_count": 5})
        assert isinstance(result, str)

    def test_includes_data(self):
        result = build_synthesis_prompt({"repos": 42}, {"tx_count": 100})
        assert "42" in result
        assert "100" in result

    def test_includes_grading_criteria(self):
        result = build_synthesis_prompt({}, {})
        assert "TRUSTED" in result
        assert "MODERATE" in result
        assert "LOW" in result
        assert "UNKNOWN" in result


class TestParseProfileJson:
    def test_valid_json(self):
        raw = '{"overall": {"trust_tier": "TRUSTED", "summary": "good"}}'
        result = parse_profile_json(raw)
        assert result["overall"]["trust_tier"] == "TRUSTED"

    def test_invalid_json_returns_fallback(self):
        result = parse_profile_json("not json at all")
        assert result["overall"]["trust_tier"] == "UNKNOWN"

    def test_empty_string_returns_fallback(self):
        result = parse_profile_json("")
        assert result["overall"]["trust_tier"] == "UNKNOWN"

    def test_none_returns_fallback(self):
        result = parse_profile_json(None)
        assert result["overall"]["trust_tier"] == "UNKNOWN"
```

**Step 2: Run tests**

```bash
pytest tests/test_prompts.py -v
```
Expected: All 12 tests PASS

**Step 3: Commit**

```bash
git add tests/test_prompts.py
git commit -m "test: add unit tests for prompt builders and JSON parser"
```

---

## Task 5: Write the Complete Contract

**Files:**
- Create: `contracts/vouch_protocol.py`

This is the complete contract file. No incremental edits — the full file is shown below.

**Step 1: Create the contract**

Create file `contracts/vouch_protocol.py`:
```python
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


# --- Pure helpers (duplicated from vouch_helpers.py for GenLayer runtime) ---
# GenLayer contracts can't import from sibling files, so helpers are inlined.

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
    profiles: TreeMap[str, str]   # handle/address → JSON profile string
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

        # Cache hit → return immediately
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

        # Check bio for ETH address → optional on-chain lookup
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
        profile["generated_at"] = 0  # Placeholder — no time.time() in GenLayer

        final_json = json.dumps(profile)

        # Update state — only increment profile_count for new profiles
        if not self.profiles.get(handle, ""):
            self.profile_count += 1
        self.profiles[handle] = final_json
        self.query_count += 1
        return final_json

    @gl.public.write
    def vouch_address(self, address: str) -> str:
        """Generate trust profile from wallet address (on-chain only)."""
        addr = _validate_address(address)

        # Cache hit → return immediately
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

        Does NOT call vouch()/vouch_address() — duplicates the non-det blocks
        inline to avoid nested public-write calls.
        """
        key = handle.strip().lower()

        # Clear cache
        self.profiles[key] = ""

        is_address = bool(re.match(r'^0x[a-f0-9]{40}$', key))

        if is_address:
            # --- Re-run address flow inline ---
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
            # --- Re-run GitHub flow inline ---
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
```

**Step 2: Verify the contract file has no syntax errors**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
python -c "import ast; ast.parse(open('contracts/vouch_protocol.py').read()); print('Syntax OK')"
```
Expected: `Syntax OK`

**Step 3: Commit**

```bash
git add contracts/vouch_protocol.py
git commit -m "feat: complete VouchProtocol contract with all methods"
```

---

## Task 6: Deploy Script

**Files:**
- Create: `deploy/001_deploy_vouch.ts`

**Step 1: Write deploy script**

Create file `deploy/001_deploy_vouch.ts`:
```typescript
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { GenLayerClient } from "genlayer-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function main(client: GenLayerClient<any>) {
  const contractPath = resolve(__dirname, "../contracts/vouch_protocol.py");
  const contractCode = new Uint8Array(readFileSync(contractPath));

  console.log("Initializing consensus smart contract...");
  await client.initializeConsensusSmartContract();

  console.log("Deploying VouchProtocol...");
  const deployTx = await client.deployContract({
    code: contractCode,
    args: [],
  });

  console.log(`Deploy TX: ${deployTx}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTx,
    retries: 200,
    interval: 5000,
  });

  console.log("Deploy receipt:", JSON.stringify(receipt, null, 2));

  // Receipt structure differs between networks
  const contractAddress =
    (receipt as any)?.data?.contract_address ||
    (receipt as any)?.contract_address ||
    (receipt as any)?.result?.contract_address;

  if (contractAddress) {
    console.log(`\nVouchProtocol deployed at: ${contractAddress}`);
    console.log(`\nAdd to frontend/.env:\nVITE_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    console.log("\nCould not extract address — check receipt above.");
  }
}
```

**Step 2: Commit**

```bash
git add deploy/001_deploy_vouch.ts
git commit -m "feat: add deploy script for VouchProtocol"
```

---

## Task 7: Local Contract Testing via GenLayer Studio

**Step 1: Install GenLayer CLI**

```bash
npm install -g genlayer
```
Expected: `added N packages` (global install)

**Step 2: Initialize and start local environment**

```bash
genlayer init
genlayer up
```
Expected: Studio starts at `http://localhost:8080`

**Step 3: Deploy contract locally**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
genlayer network localnet
genlayer deploy --contract contracts/vouch_protocol.py
```
Expected: Returns contract address like `0x...`

**Step 4: Test `vouch("torvalds")` via Studio UI**

1. Open `http://localhost:8080`
2. Navigate to deployed contract
3. Call `vouch` with arg `torvalds`
4. Expected: Returns JSON with `trust_tier`, grades, reasoning

**Step 5: Test `get_profile("torvalds")` — verify cache hit**

1. Call `get_profile` with arg `torvalds`
2. Expected: Returns same JSON as step 4 (from cache, no LLM call)

**Step 6: Test `get_trust_tier("torvalds")`**

1. Call `get_trust_tier` with arg `torvalds`
2. Expected: Returns one of `TRUSTED`, `MODERATE`, `LOW`, `UNKNOWN`

**Step 7: Test `get_stats()`**

1. Call `get_stats` with no args
2. Expected: `{"profile_count": 1, "query_count": 2}` (1 vouch + 1 get_profile read didn't increment since it's a view)

**Step 8: Test edge cases**

1. Call `vouch` with arg `""` → Expected: Exception "Invalid handle"
2. Call `vouch` with arg `a!@#$%` → Expected: Exception "Invalid handle"
3. Call `vouch_address` with arg `not-an-address` → Expected: Exception "Invalid Ethereum address"
4. Call `vouch` with arg `thisuserdoesnotexist999999` → Expected: Returns profile with `UNKNOWN` tier

**Step 9: Commit any fixes discovered during testing**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add contracts/vouch_protocol.py
git commit -m "fix: adjustments from local Studio testing"
```

---

## Task 8: Scaffold Frontend (React + Vite + Tailwind)

**Files:**
- Create: `frontend/` via Vite scaffold
- Modify: `frontend/vite.config.ts`
- Replace: `frontend/src/index.css`

**Step 1: Create Vite React project**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
npm create vite@latest frontend -- --template react-ts
```
Expected: `Scaffolding project in ...`

**Step 2: Install dependencies**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
npm install
```
Expected: `added N packages`

**Step 3: Install Tailwind**

```bash
npm install -D tailwindcss @tailwindcss/vite
```
Expected: `added N packages`

**Step 4: Install app dependencies**

```bash
npm install genlayer-js react-router-dom
```
Expected: `added N packages`

**Step 5: Configure Tailwind in Vite**

Replace `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 6: Set up base CSS**

Replace `frontend/src/index.css`:
```css
@import "tailwindcss";

body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
}
```

**Step 7: Verify dev server starts**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
npm run dev
```
Expected: `VITE vN.N.N ready in Nms` at `http://localhost:5173/`

Stop the dev server (Ctrl+C).

**Step 8: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add frontend/ package.json
git commit -m "feat: scaffold React + Vite + Tailwind frontend"
```

---

## Task 9: Frontend — GenLayer Client + Types

**Files:**
- Create: `frontend/src/lib/genlayer.ts`
- Create: `frontend/src/types.ts`

**Step 1: Create types**

Create file `frontend/src/types.ts`:
```typescript
export interface CodeActivity {
  grade: string;
  repos: number;
  commits_last_year: number;
  languages: string[];
  stars_received: number;
  reasoning: string;
}

export interface OnchainActivity {
  grade: string;
  tx_count: number;
  first_tx_age_days: number;
  contracts_deployed: number;
  suspicious_patterns: boolean;
  reasoning: string;
}

export interface TrustProfile {
  handle: string;
  sources_scraped: string[];
  generated_at: number;
  code_activity: CodeActivity;
  onchain_activity: OnchainActivity;
  overall: {
    trust_tier: "TRUSTED" | "MODERATE" | "LOW" | "UNKNOWN";
    summary: string;
  };
}
```

**Step 2: Create GenLayer client**

Create file `frontend/src/lib/genlayer.ts`:
```typescript
import { createClient, createAccount } from "genlayer-js";
import { simulator } from "genlayer-js/chains";

// Dynamic chain selection based on env
const NETWORK = import.meta.env.VITE_NETWORK || "simulator";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

// NOTE: createAccount() is ephemeral — new account on every page load.
// Funds and identity are lost on refresh. Acceptable for hackathon demo.
const account = createAccount();

function getChain() {
  // For testnet-bradbury, dynamically import the chain config
  // For hackathon: we deploy to simulator or testnet, controlled by env
  if (NETWORK === "testnet-bradbury") {
    // genlayer-js exports testnetBradbury from chains
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { testnetBradbury } = require("genlayer-js/chains");
      return testnetBradbury;
    } catch {
      return simulator;
    }
  }
  return simulator;
}

export const client = createClient({
  chain: getChain(),
  account,
});

export const contractAddress = CONTRACT_ADDRESS as `0x${string}`;

export async function readProfile(handle: string): Promise<any> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_profile",
    args: [handle.trim().toLowerCase()],
  });
  try {
    return typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    return null;
  }
}

export async function readTrustTier(handle: string): Promise<string> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_trust_tier",
    args: [handle.trim().toLowerCase()],
  });
  return String(result);
}

export async function generateProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch",
    args: [handle],
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

export async function generateAddressProfile(address: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch_address",
    args: [address],
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

export async function refreshProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "refresh",
    args: [handle],
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

export async function getStats(): Promise<{ profile_count: number; query_count: number }> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_stats",
    args: [],
  });
  try {
    return typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    return { profile_count: 0, query_count: 0 };
  }
}
```

**Step 3: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add frontend/src/types.ts frontend/src/lib/genlayer.ts
git commit -m "feat: GenLayer client config + TypeScript types"
```

---

## Task 10: Frontend — Components

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/SearchBar.tsx`
- Create: `frontend/src/components/StatsBar.tsx`
- Create: `frontend/src/components/TrustBadge.tsx`
- Create: `frontend/src/components/GradeCard.tsx`

**Step 1: Create Header**

Create file `frontend/src/components/Header.tsx`:
```tsx
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">vouch.fun</span>
          <span className="text-xs text-gray-500 font-mono mt-1">Trust, Verified.</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900">Search</Link>
          <Link to="/integrate" className="text-gray-600 hover:text-gray-900">Integrate</Link>
        </nav>
      </div>
    </header>
  );
}
```

**Step 2: Create SearchBar**

Create file `frontend/src/components/SearchBar.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/profile/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter GitHub handle or wallet address"
          className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl
                     focus:border-gray-900 focus:outline-none transition-colors
                     font-mono placeholder:font-sans placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-gray-900 text-white
                     rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300
                     disabled:cursor-not-allowed transition-colors"
        >
          Vouch
        </button>
      </div>
    </form>
  );
}
```

**Step 3: Create StatsBar**

Create file `frontend/src/components/StatsBar.tsx`:
```tsx
import { useEffect, useState } from "react";
import { getStats } from "../lib/genlayer";

export default function StatsBar() {
  const [stats, setStats] = useState({ profile_count: 0, query_count: 0 });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex gap-8 text-sm text-gray-500 font-mono">
      <span>{stats.profile_count} profiles generated</span>
      <span>{stats.query_count} queries served</span>
    </div>
  );
}
```

**Step 4: Create TrustBadge**

Create file `frontend/src/components/TrustBadge.tsx`:
```tsx
const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  TRUSTED: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  MODERATE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LOW: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  UNKNOWN: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

export default function TrustBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold
                  border font-mono ${style.bg} ${style.text} ${style.border}`}
    >
      {tier}
    </span>
  );
}
```

**Step 5: Create GradeCard**

Create file `frontend/src/components/GradeCard.tsx`:
```tsx
const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 bg-green-50 border-green-200",
  B: "text-blue-600 bg-blue-50 border-blue-200",
  C: "text-amber-600 bg-amber-50 border-amber-200",
  D: "text-orange-600 bg-orange-50 border-orange-200",
  F: "text-red-600 bg-red-50 border-red-200",
  "N/A": "text-gray-400 bg-gray-50 border-gray-200",
};

function gradeStyle(grade: string) {
  const letter = grade.charAt(0).toUpperCase();
  return GRADE_COLORS[letter] || GRADE_COLORS["N/A"];
}

interface GradeCardProps {
  title: string;
  grade: string;
  reasoning: string;
  stats: { label: string; value: string | number }[];
}

export default function GradeCard({ title, grade, reasoning, stats }: GradeCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`px-3 py-1 rounded-lg text-lg font-bold font-mono border ${gradeStyle(grade)}`}>
          {grade}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs text-gray-400 uppercase">{s.label}</div>
            <div className="text-sm font-mono text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600 italic">{reasoning}</p>
    </div>
  );
}
```

**Step 6: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add frontend/src/components/
git commit -m "feat: UI components — Header, SearchBar, StatsBar, TrustBadge, GradeCard"
```

---

## Task 11: Frontend — Pages + Router

**Files:**
- Replace: `frontend/src/App.tsx`
- Create: `frontend/src/pages/Home.tsx`
- Create: `frontend/src/pages/Profile.tsx`
- Create: `frontend/src/pages/Integrate.tsx`

**Step 1: Set up Router in App.tsx**

Replace `frontend/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Integrate from "./pages/Integrate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:handle" element={<Profile />} />
        <Route path="/integrate" element={<Integrate />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 2: Create Home page**

Create file `frontend/src/pages/Home.tsx`:
```tsx
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import StatsBar from "../components/StatsBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-center pt-32 pb-16 gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-3">vouch.fun</h1>
            <p className="text-xl text-gray-500">Trust, Verified.</p>
            <p className="text-sm text-gray-400 mt-2 max-w-md">
              Composable reputation oracle for GenLayer.
              AI-verified trust profiles from GitHub and on-chain activity.
            </p>
          </div>
          <SearchBar />
          <StatsBar />
        </div>
      </main>
    </div>
  );
}
```

**Step 3: Create Profile page**

Create file `frontend/src/pages/Profile.tsx`:
```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import TrustBadge from "../components/TrustBadge";
import GradeCard from "../components/GradeCard";
import {
  readProfile,
  generateProfile,
  generateAddressProfile,
  refreshProfile,
} from "../lib/genlayer";
import type { TrustProfile } from "../types";

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const isAddress = handle?.startsWith("0x") && handle.length === 42;

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError("");
    readProfile(handle)
      .then((p) => {
        if (p && p.overall) {
          setProfile(p);
        } else {
          setProfile(null);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleGenerate = async () => {
    if (!handle) return;
    setGenerating(true);
    setError("");
    try {
      const fn = isAddress ? generateAddressProfile : generateProfile;
      await fn(handle);
      const p = await readProfile(handle);
      if (p && p.overall) {
        setProfile(p);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate profile");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    if (!handle) return;
    setGenerating(true);
    setError("");
    try {
      await refreshProfile(handle);
      const p = await readProfile(handle);
      if (p && p.overall) {
        setProfile(p);
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh profile");
    } finally {
      setGenerating(false);
    }
  };

  const code = profile?.code_activity;
  const onchain = profile?.onchain_activity;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-mono">Loading...</div>
        ) : profile ? (
          <>
            {/* Profile header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-mono text-gray-900 mb-2">
                {profile.handle}
              </h1>
              <TrustBadge tier={profile.overall.trust_tier} />
              <p className="text-gray-600 mt-3 max-w-lg mx-auto">
                {profile.overall.summary}
              </p>
              <div className="text-xs text-gray-400 mt-2 font-mono">
                Sources: {profile.sources_scraped?.join(", ")}
              </div>
            </div>

            {/* Grade cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {code && (
                <GradeCard
                  title="Code Activity"
                  grade={code.grade}
                  reasoning={code.reasoning || ""}
                  stats={[
                    { label: "Repos", value: code.repos ?? "-" },
                    { label: "Commits (year)", value: code.commits_last_year ?? "-" },
                    { label: "Stars", value: code.stars_received ?? "-" },
                    { label: "Languages", value: code.languages?.join(", ") || "-" },
                  ]}
                />
              )}
              {onchain && (
                <GradeCard
                  title="On-Chain Activity"
                  grade={onchain.grade}
                  reasoning={onchain.reasoning || ""}
                  stats={[
                    { label: "Transactions", value: onchain.tx_count ?? "-" },
                    { label: "Account age (days)", value: onchain.first_tx_age_days ?? "-" },
                    { label: "Contracts deployed", value: onchain.contracts_deployed ?? "-" },
                    { label: "Suspicious", value: onchain.suspicious_patterns ? "Yes" : "No" },
                  ]}
                />
              )}
            </div>

            {/* Refresh */}
            <div className="text-center">
              <button
                onClick={handleRefresh}
                disabled={generating}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {generating ? "Regenerating..." : "Refresh profile"}
              </button>
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </div>
          </>
        ) : (
          /* No profile — generate prompt */
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-mono">{handle}</h2>
            <p className="text-gray-500 mb-6">No profile found. Generate one?</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium
                         hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {generating
                ? "Generating... (this may take up to 60s)"
                : "Generate Trust Profile"}
            </button>
            {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 4: Create Integrate page**

Create file `frontend/src/pages/Integrate.tsx`:
```tsx
import Header from "../components/Header";

const PYTHON_EXAMPLE = `# Inside your GenLayer contract:
import gl

class MyContract(gl.Contract):
    vouch_address: str  # Set to deployed VouchProtocol address

    @gl.public.write
    def do_something(self, user_handle: str):
        # Check trust before allowing action
        tier = gl.call_contract(
            self.vouch_address,
            "get_trust_tier",
            [user_handle]
        )
        if tier == "LOW" or tier == "UNKNOWN":
            raise Exception("User does not meet trust requirements")
        # Proceed with action...`;

const JS_EXAMPLE = `import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

// Read trust tier (free, no gas)
const tier = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_trust_tier",
  args: ["torvalds"],
});

// Read full profile (free, no gas)
const profile = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_profile",
  args: ["torvalds"],
});`;

const USE_CASES = [
  {
    app: "Rally",
    use: "Check creator trust before accepting campaign applications",
    call: 'get_trust_tier(creator) -> reject if LOW/UNKNOWN',
  },
  {
    app: "MergeProof",
    use: "Filter code reviewers by reputation",
    call: 'get_profile(reviewer) -> check code_activity.grade',
  },
  {
    app: "Internet Court",
    use: "Weight party credibility in disputes",
    call: 'get_profile(party) -> factor overall.trust_tier into verdict',
  },
];

export default function Integrate() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrate vouch.fun</h1>
        <p className="text-gray-500 mb-8">
          Add trust verification to your GenLayer contract in one call.
        </p>

        {/* API Reference */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Reference</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <code className="text-sm font-mono text-blue-600">
                get_trust_tier(handle: str) -&gt; str
              </code>
              <p className="text-sm text-gray-500 mt-1">
                Returns: TRUSTED | MODERATE | LOW | UNKNOWN
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <code className="text-sm font-mono text-blue-600">
                get_profile(handle: str) -&gt; str
              </code>
              <p className="text-sm text-gray-500 mt-1">
                Returns: Full JSON profile with grades, reasoning, and data
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <code className="text-sm font-mono text-blue-600">
                get_stats() -&gt; str
              </code>
              <p className="text-sm text-gray-500 mt-1">
                Returns: {`{ "profile_count": int, "query_count": int }`}
              </p>
            </div>
          </div>
        </section>

        {/* Code examples */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            From Another Contract (Python)
          </h2>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono">
            {PYTHON_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            From Frontend (TypeScript)
          </h2>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono">
            {JS_EXAMPLE}
          </pre>
        </section>

        {/* Use cases */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Integration Examples
          </h2>
          <div className="space-y-3">
            {USE_CASES.map((uc) => (
              <div key={uc.app} className="border border-gray-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900">{uc.app}</div>
                <div className="text-sm text-gray-600">{uc.use}</div>
                <code className="text-xs font-mono text-gray-400 mt-1 block">
                  {uc.call}
                </code>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

**Step 5: Remove Vite boilerplate files**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
rm -f src/App.css src/assets/react.svg public/vite.svg
```
Expected: No output (files deleted)

**Step 6: Create frontend `.env`**

Create file `frontend/.env`:
```
VITE_CONTRACT_ADDRESS=0x_YOUR_CONTRACT_ADDRESS_HERE
VITE_NETWORK=simulator
```

**Step 7: Verify frontend builds**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
npm run build
```
Expected: `vite vN.N.N building for production...` followed by build success

**Step 8: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add frontend/
git commit -m "feat: all frontend pages — Home, Profile, Integrate"
```

---

## Task 12: Frontend Integration Test

**Step 1: Update frontend `.env` with local contract address**

Edit `frontend/.env` — set `VITE_CONTRACT_ADDRESS` to the address from Task 7 Step 3.

**Step 2: Start frontend dev server**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
npm run dev
```
Expected: Dev server at `http://localhost:5173/`

**Step 3: Test Home page**

1. Open `http://localhost:5173/`
2. Expected: "vouch.fun" heading, search bar, stats bar showing "0 profiles generated"

**Step 4: Test search flow**

1. Type `torvalds` in search bar, click "Vouch"
2. Expected: Navigates to `/profile/torvalds`
3. Expected: Shows "No profile found. Generate one?" with Generate button

**Step 5: Test profile generation**

1. Click "Generate Trust Profile"
2. Expected: Button text changes to "Generating... (this may take up to 60s)"
3. Wait for completion
4. Expected: Profile renders with trust badge, grade cards, summary

**Step 6: Test Integrate page**

1. Navigate to `/integrate`
2. Expected: API reference, Python example, TypeScript example, use case cards

**Step 7: Commit any fixes**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add -A
git commit -m "fix: frontend adjustments from integration testing"
```

---

## Task 13: Deploy to Bradbury Testnet

**Step 1: Get testnet tokens**

Visit `https://testnet-faucet.genlayer.foundation/` and request GEN tokens.

**Step 2: Switch to Bradbury**

```bash
genlayer network testnet-bradbury
```
Expected: Network switched confirmation

**Step 3: Deploy contract**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
genlayer deploy --contract contracts/vouch_protocol.py
```
Expected: Returns contract address on Bradbury

**Step 4: Update frontend for Bradbury**

Edit `frontend/.env`:
```
VITE_CONTRACT_ADDRESS=<bradbury_address_from_step_3>
VITE_NETWORK=testnet-bradbury
```

**Step 5: Test on Bradbury**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
npm run dev
```

Test same flows as Task 12. Bradbury uses real AI — expect 30-60s per vouch.

**Step 6: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add -A
git commit -m "feat: deploy to Bradbury testnet"
```

---

## Task 14: Demo Preparation

**Step 1: Pre-generate demo profiles**

Using the deployed Bradbury contract, generate profiles for:
1. `torvalds` — expect TRUSTED (legendary GitHub)
2. `vbuterin` — expect TRUSTED (Ethereum creator)
3. A fresh/empty GitHub handle — expect UNKNOWN

Pre-generating ensures the demo uses cached profiles (instant reads, no waiting).

**Step 2: Run through the 2-minute demo script**

Follow the script from the design doc:

| Time | Action | Expected |
|------|--------|----------|
| 0:00 | "Trust is the missing primitive on GenLayer." | Intro slide / talking |
| 0:10 | Search `torvalds` | Profile loads from cache — grades, reasoning, TRUSTED |
| 0:30 | Point out breakdown | "N repos, N commits, languages, clean on-chain" |
| 0:45 | Search fresh/empty handle | UNKNOWN tier, "Insufficient data" |
| 1:00 | Navigate to /integrate | Show composability |
| 1:10 | Point out `get_trust_tier()` code | "Any contract calls this one line" |
| 1:30 | Revenue pitch | "Every query = tx fee. I earn 20% forever." |
| 1:50 | Close | "vouch.fun — Trust, Verified." |

**Step 3: Build frontend for production**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend"
npm run build
```
Expected: Production build in `frontend/dist/`

**Step 4: Write README**

Create/update `README.md`:
```markdown
# vouch.fun — Trust, Verified.

Composable reputation oracle for GenLayer. Submit any GitHub handle or wallet address — AI scrapes public activity, synthesizes a trust profile with grades and reasoning, validators reach consensus. Stored on-chain, queryable by any contract.

## Track
Agentic Economy Infrastructure (Bradbury Builders Hackathon)

## Quick Start

### Contract
```bash
genlayer network localnet  # or testnet-bradbury
genlayer deploy --contract contracts/vouch_protocol.py
```

### Frontend
```bash
cd frontend
cp .env.example .env  # Set VITE_CONTRACT_ADDRESS
npm install && npm run dev
```

## API (Composable)

```python
# From any GenLayer contract:
tier = gl.call_contract(vouch_address, "get_trust_tier", [handle])
profile = gl.call_contract(vouch_address, "get_profile", [handle])
```

| Method | Returns | Cost |
|--------|---------|------|
| `vouch(handle)` | Full profile JSON | Write (LLM + scraping) |
| `vouch_address(address)` | Full profile JSON | Write (LLM + scraping) |
| `get_profile(handle)` | Cached profile JSON | View (free) |
| `get_trust_tier(handle)` | TRUSTED/MODERATE/LOW/UNKNOWN | View (free) |
| `get_stats()` | Profile + query counts | View (free) |
| `refresh(handle)` | Re-generated profile | Write (LLM + scraping) |

## Architecture

Two non-deterministic blocks per profile:
1. **Data Extraction** (`strict_eq`) — scrapes GitHub + Etherscan, extracts facts
2. **Trust Synthesis** (`prompt_non_comparative`) — grades A-F, determines trust tier

## Tech Stack
- Contract: Python (GenLayer Intelligent Contract)
- Frontend: React + Vite + Tailwind CSS
- SDK: GenLayerJS
```

**Step 5: Final commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add -A
git commit -m "docs: README, production build, demo prep"
```

---

## Task 15: Push to GitHub

**Step 1: Create GitHub repo**

```bash
gh repo create vouch-fun --public --description "Composable reputation oracle for GenLayer — Trust, Verified." --source "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
```
Expected: Repository created

**Step 2: Push**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git remote add origin https://github.com/Ridwannurudeen/vouch-fun.git
git branch -M main
git push -u origin main
```
Expected: `Branch 'main' set up to track remote branch 'main'`

**Step 3: Hackathon submission**

**IMPORTANT: Get explicit user approval before submitting.**

Submit via the Bradbury Builders Hackathon form with:
- GitHub repo URL
- Contract address on Bradbury testnet
- Track: Agentic Economy Infrastructure
- Demo video (if required)
