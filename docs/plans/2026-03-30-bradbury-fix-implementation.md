# vouch.fun Bradbury Fix & Ship — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix vouch.fun for Bradbury testnet compatibility and ship for hackathon deadline (Apr 3).

**Architecture:** Rearchitect contract storage from broken `TreeMap[str, str]` to working `TreeMap[Address, str]` + `str` handle index. Update all GenLayer API calls to new namespace. Add composable example consumer contract. Update frontend to genlayer-js 0.23.1.

**Tech Stack:** Python (GenLayer Intelligent Contracts), React 19 + Vite 8 + Tailwind 4 + genlayer-js 0.23.1

---

### Task 1: Rewrite VouchProtocol contract for Bradbury

**Files:**
- Modify: `contracts/vouch_protocol.py` (full rewrite)

**Step 1: Rewrite the contract**

Replace the entire contents of `contracts/vouch_protocol.py` with:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""VouchProtocol — Composable Reputation Oracle for GenLayer.

Scrapes GitHub + Etherscan, synthesizes trust profiles via LLM consensus,
stores on-chain and exposes composable read API for other contracts.

Uses two non-det blocks:
  - strict_eq for factual data extraction (Block 1)
  - prompt_non_comparative for subjective trust synthesis (Block 2)

Storage: TreeMap[Address, str] (Bradbury-compatible).
Handle index: str primitive storing JSON dict for handle->address resolution.
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
    profiles: TreeMap[Address, str]   # wallet_address -> JSON profile string
    handle_index: str                 # JSON dict: '{"handle":"0xaddr",...}'
    profile_count: u32
    query_count: u32

    def __init__(self):
        self.profile_count = 0
        self.query_count = 0
        self.handle_index = "{}"

    # --- Internal helpers ---

    def _get_index(self) -> dict:
        try:
            return json.loads(self.handle_index)
        except Exception:
            return {}

    def _set_index(self, index: dict):
        self.handle_index = json.dumps(index)

    def _store_profile(self, address: str, handle: str, profile: dict, sources: list):
        profile["handle"] = handle
        profile["sources_scraped"] = sources
        profile["vouched_by"] = address
        final_json = json.dumps(profile)
        self.profiles[address] = final_json
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
        cached = self.profiles.get(caller, "")
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
        self.profiles[caller] = ""
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
        return self.profiles.get(addr, "{}")

    @gl.public.view
    def get_profile_by_handle(self, github_handle: str) -> str:
        """Resolve handle to address via index, return profile."""
        handle = github_handle.strip().lower()
        index = self._get_index()
        addr = index.get(handle, "")
        if not addr:
            return "{}"
        return self.profiles.get(addr, "{}")

    @gl.public.view
    def get_trust_tier(self, address: str) -> str:
        """Return just the tier: TRUSTED / MODERATE / LOW / UNKNOWN.
        Lightweight composable endpoint for other contracts."""
        addr = _validate_address(address)
        raw = self.profiles.get(addr, "")
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
```

**Step 2: Verify syntax**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun" && python -c "import ast; ast.parse(open('contracts/vouch_protocol.py').read()); print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add contracts/vouch_protocol.py
git commit -m "feat: rearchitect contract for Bradbury compatibility

- TreeMap[Address, str] storage (str keys broken on Bradbury)
- str handle_index for handle->address resolution
- u32 counters (int broken on Bradbury)
- New GenLayer API: gl.nondet.*, gl.eq_principle.*
- Pinned Depends hash for validator consensus
- Added get_profile_by_handle, lookup_address views
- Removed vouch_address (profiles keyed by caller address)"
```

---

### Task 2: Create TrustedTransfer consumer contract

**Files:**
- Create: `contracts/trusted_transfer.py`

**Step 1: Write the consumer contract**

Create `contracts/trusted_transfer.py`:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""TrustedTransfer — Example consumer of VouchProtocol.

Demonstrates composability: checks vouch.fun trust tier before
allowing an action. Any GenLayer contract can do this with one call.
"""
import json
import gl  # type: ignore[import-not-found]


class TrustedTransfer(gl.Contract):
    vouch_address: str       # Address of deployed VouchProtocol
    min_tier: str            # Minimum required tier: "TRUSTED" or "MODERATE"
    transfer_count: u32      # Total successful transfers

    def __init__(self, vouch_contract_address: str, minimum_tier: str):
        self.vouch_address = vouch_contract_address
        self.min_tier = minimum_tier
        self.transfer_count = 0

    @gl.public.write
    def transfer_if_trusted(self, recipient_address: str) -> str:
        """Execute a transfer only if recipient meets trust requirements.
        Calls VouchProtocol.get_trust_tier() cross-contract."""
        tier = gl.ContractAt(self.vouch_address).get_trust_tier(recipient_address)

        allowed_tiers = ["TRUSTED"]
        if self.min_tier == "MODERATE":
            allowed_tiers.append("MODERATE")

        if tier not in allowed_tiers:
            raise Exception(
                f"Recipient trust tier '{tier}' does not meet minimum '{self.min_tier}'"
            )

        self.transfer_count += 1
        return json.dumps({
            "status": "approved",
            "recipient": recipient_address,
            "trust_tier": tier,
            "transfer_number": self.transfer_count,
        })

    @gl.public.view
    def get_transfer_count(self) -> str:
        return json.dumps({"transfer_count": self.transfer_count})
```

**Step 2: Verify syntax**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun" && python -c "import ast; ast.parse(open('contracts/trusted_transfer.py').read()); print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add contracts/trusted_transfer.py
git commit -m "feat: add TrustedTransfer composability example contract

Cross-contract call to VouchProtocol.get_trust_tier() gates actions
behind trust requirements. Demonstrates one-line composability."
```

---

### Task 3: Update vouch_helpers.py with handle index helpers

**Files:**
- Modify: `contracts/vouch_helpers.py`

**Step 1: Add handle index helpers**

Append to `contracts/vouch_helpers.py` (after `parse_profile_json`):

```python


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
```

**Step 2: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add contracts/vouch_helpers.py
git commit -m "feat: add handle index helpers for unit testing"
```

---

### Task 4: Update unit tests

**Files:**
- Modify: `tests/test_validators.py` (no changes needed — validators unchanged)
- Modify: `tests/test_prompts.py` (no changes needed — prompts unchanged)
- Create: `tests/test_handle_index.py`

**Step 1: Write handle index tests**

Create `tests/test_handle_index.py`:

```python
"""Unit tests for handle index helpers.
Run with: pytest tests/test_handle_index.py -v
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vouch_helpers import get_handle_index, set_handle_index, resolve_handle


class TestGetHandleIndex:
    def test_valid_json(self):
        result = get_handle_index('{"vitalik": "0xabc"}')
        assert result == {"vitalik": "0xabc"}

    def test_empty_json(self):
        result = get_handle_index("{}")
        assert result == {}

    def test_invalid_json(self):
        result = get_handle_index("not json")
        assert result == {}

    def test_none(self):
        result = get_handle_index(None)
        assert result == {}

    def test_empty_string(self):
        result = get_handle_index("")
        assert result == {}


class TestSetHandleIndex:
    def test_empty_dict(self):
        result = set_handle_index({})
        assert result == "{}"

    def test_single_entry(self):
        result = set_handle_index({"torvalds": "0x123"})
        import json
        parsed = json.loads(result)
        assert parsed["torvalds"] == "0x123"

    def test_multiple_entries(self):
        index = {"a": "0x1", "b": "0x2", "c": "0x3"}
        result = set_handle_index(index)
        import json
        parsed = json.loads(result)
        assert len(parsed) == 3


class TestResolveHandle:
    def test_found(self):
        index_str = '{"vitalik": "0xabc", "torvalds": "0xdef"}'
        assert resolve_handle(index_str, "vitalik") == "0xabc"

    def test_not_found(self):
        index_str = '{"vitalik": "0xabc"}'
        assert resolve_handle(index_str, "nobody") == ""

    def test_case_insensitive(self):
        index_str = '{"vitalik": "0xabc"}'
        assert resolve_handle(index_str, "VITALIK") == "0xabc"

    def test_strips_whitespace(self):
        index_str = '{"vitalik": "0xabc"}'
        assert resolve_handle(index_str, "  vitalik  ") == "0xabc"

    def test_empty_index(self):
        assert resolve_handle("{}", "anyone") == ""

    def test_invalid_index(self):
        assert resolve_handle("broken", "anyone") == ""
```

**Step 2: Run all tests**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun" && python -m pytest tests/ -v`
Expected: All 36 tests pass (15 validators + 10 prompts + 11 handle index)

**Step 3: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add tests/test_handle_index.py
git commit -m "test: add handle index helper tests (11 new tests)"
```

---

### Task 5: Update frontend SDK and dependencies

**Files:**
- Modify: `frontend/package.json` (genlayer-js version)
- Modify: `frontend/src/lib/genlayer.ts` (full rewrite)
- Modify: `package.json` (root, genlayer-js version)

**Step 1: Update root package.json**

In `package.json` (root), change:
```json
"genlayer-js": "^0.18.3"
```
to:
```json
"genlayer-js": "^0.23.1"
```

**Step 2: Update frontend/package.json**

In `frontend/package.json`, change:
```json
"genlayer-js": "^0.18.14"
```
to:
```json
"genlayer-js": "^0.23.1"
```

**Step 3: Rewrite frontend/src/lib/genlayer.ts**

Replace entire contents:

```typescript
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

// Ephemeral account — acceptable for hackathon demo
const account = createAccount();

export const client = createClient({
  chain: testnetBradbury,
  account,
});

export const contractAddress = CONTRACT_ADDRESS as `0x${string}`;

/**
 * Read profile by wallet address (composable API).
 */
export async function readProfile(address: string): Promise<any> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_profile",
    args: [address.trim().toLowerCase()],
  });
  try {
    return typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    return null;
  }
}

/**
 * Read profile by GitHub handle (resolves via on-chain index).
 */
export async function readProfileByHandle(handle: string): Promise<any> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_profile_by_handle",
    args: [handle.trim().toLowerCase()],
  });
  try {
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    // Empty object = not found
    if (!parsed || !parsed.overall) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Resolve a GitHub handle to a wallet address.
 */
export async function lookupAddress(handle: string): Promise<string> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "lookup_address",
    args: [handle.trim().toLowerCase()],
  });
  return String(result || "");
}

export async function readTrustTier(address: string): Promise<string> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_trust_tier",
    args: [address.trim().toLowerCase()],
  });
  return String(result);
}

export async function generateProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch",
    args: [handle],
    value: 0n,
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
    value: 0n,
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
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return parsed as { profile_count: number; query_count: number };
  } catch {
    return { profile_count: 0, query_count: 0 };
  }
}
```

**Step 4: Install updated dependencies**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun" && npm install`
Then: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend" && npm install`

**Step 5: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add package.json frontend/package.json frontend/src/lib/genlayer.ts
git commit -m "feat: update frontend SDK to genlayer-js 0.23.1

- New RPC: rpc-bradbury.genlayer.com via testnetBradbury chain
- Add readProfileByHandle() for handle-based search
- Add lookupAddress() for handle->address resolution
- Remove generateAddressProfile() (vouch_address removed)
- Remove dynamic chain selection (Bradbury only)"
```

---

### Task 6: Update frontend Profile page

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

**Step 1: Rewrite Profile.tsx**

Replace entire contents of `frontend/src/pages/Profile.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import TrustBadge from "../components/TrustBadge";
import GradeCard from "../components/GradeCard";
import {
  readProfile,
  readProfileByHandle,
  generateProfile,
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

    const fetchProfile = isAddress
      ? readProfile(handle)
      : readProfileByHandle(handle);

    fetchProfile
      .then((p) => {
        if (p && p.overall) {
          setProfile(p);
        } else {
          setProfile(null);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [handle, isAddress]);

  const handleGenerate = async () => {
    if (!handle || isAddress) return; // Can only generate from GitHub handle
    setGenerating(true);
    setError("");
    try {
      await generateProfile(handle);
      // After generating, read back by handle
      const p = await readProfileByHandle(handle);
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
    if (!handle || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await refreshProfile(handle);
      const p = await readProfileByHandle(handle);
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
              {profile.vouched_by && (
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  Vouched by: {profile.vouched_by}
                </div>
              )}
            </div>

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

            {!isAddress && (
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
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-mono">{handle}</h2>
            {isAddress ? (
              <p className="text-gray-500">
                No profile found for this address. The owner must vouch their GitHub handle first.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 2: Update types.ts to include vouched_by**

In `frontend/src/types.ts`, add `vouched_by` to `TrustProfile`:

Change:
```typescript
export interface TrustProfile {
  handle: string;
  sources_scraped: string[];
  generated_at: number;
```

To:
```typescript
export interface TrustProfile {
  handle: string;
  sources_scraped: string[];
  vouched_by?: string;
```

**Step 3: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add frontend/src/pages/Profile.tsx frontend/src/types.ts
git commit -m "feat: update Profile page for address-keyed storage

- Search by handle uses get_profile_by_handle
- Search by address uses get_profile
- Address profiles show 'vouch your handle first' message
- Remove generateAddressProfile usage
- Add vouched_by display"
```

---

### Task 7: Update Integrate page examples

**Files:**
- Modify: `frontend/src/pages/Integrate.tsx`

**Step 1: Update the Python example**

In `frontend/src/pages/Integrate.tsx`, replace the `PYTHON_EXAMPLE` constant:

```typescript
const PYTHON_EXAMPLE = `# Inside your GenLayer contract:
import gl

class MyContract(gl.Contract):
    vouch_address: str  # Set to deployed VouchProtocol address

    @gl.public.write
    def do_something(self, user_address: str):
        # One line to check trust before allowing action
        tier = gl.ContractAt(self.vouch_address).get_trust_tier(user_address)
        if tier == "LOW" or tier == "UNKNOWN":
            raise Exception("User does not meet trust requirements")
        # Proceed with action...`;
```

**Step 2: Update the JS example args**

In the `JS_EXAMPLE` constant, change the `get_trust_tier` args from `["torvalds"]` to `["0x_RECIPIENT_ADDRESS"]` and `get_profile` args similarly:

```typescript
const JS_EXAMPLE = `import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

// Read trust tier by address (free, no gas)
const tier = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_trust_tier",
  args: ["0x_RECIPIENT_ADDRESS"],
});

// Read full profile by handle (free, no gas)
const profile = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_profile_by_handle",
  args: ["torvalds"],
});`;
```

**Step 3: Update API reference section**

In the API Reference section, update the function signatures to reflect the new API:
- `get_trust_tier(address: str) -> str`
- `get_profile(address: str) -> str`
- `get_profile_by_handle(handle: str) -> str`
- `lookup_address(handle: str) -> str`
- `get_stats() -> str`

**Step 4: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add frontend/src/pages/Integrate.tsx
git commit -m "feat: update Integrate page for address-keyed API

- Python example uses gl.ContractAt cross-contract call
- JS example uses address args for get_trust_tier
- Add get_profile_by_handle and lookup_address to API reference"
```

---

### Task 8: Update deploy script

**Files:**
- Modify: `deploy/001_deploy_vouch.ts`
- Create: `deploy/002_deploy_trusted_transfer.ts`

**Step 1: Update 001_deploy_vouch.ts for SDK 0.23.1**

Replace entire contents:

```typescript
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const contractPath = resolve(__dirname, "../contracts/vouch_protocol.py");
  const contractCode = new Uint8Array(readFileSync(contractPath));

  const account = createAccount();
  const client = createClient({ chain: testnetBradbury, account });

  console.log("Deploying VouchProtocol to Bradbury...");
  const deployTx = await client.deployContract({
    code: contractCode,
    args: [],
    value: 0n,
  });

  console.log(`Deploy TX: ${deployTx}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTx,
    retries: 200,
    interval: 5000,
  });

  console.log("Deploy receipt:", JSON.stringify(receipt, null, 2));

  const contractAddress =
    (receipt as any)?.data?.contract_address ||
    (receipt as any)?.contract_address ||
    (receipt as any)?.result?.contract_address;

  if (contractAddress) {
    console.log(`\nVouchProtocol deployed at: ${contractAddress}`);
    console.log(`\nAdd to frontend/.env:\nVITE_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    console.log("\nCould not extract address -- check receipt above.");
  }
}

main().catch(console.error);
```

**Step 2: Create 002_deploy_trusted_transfer.ts**

```typescript
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VOUCH_ADDRESS = process.env.VOUCH_CONTRACT_ADDRESS || "";

async function main() {
  if (!VOUCH_ADDRESS) {
    console.error("Set VOUCH_CONTRACT_ADDRESS env var first.");
    process.exit(1);
  }

  const contractPath = resolve(__dirname, "../contracts/trusted_transfer.py");
  const contractCode = new Uint8Array(readFileSync(contractPath));

  const account = createAccount();
  const client = createClient({ chain: testnetBradbury, account });

  console.log(`Deploying TrustedTransfer (vouch=${VOUCH_ADDRESS}, min=MODERATE)...`);
  const deployTx = await client.deployContract({
    code: contractCode,
    args: [VOUCH_ADDRESS, "MODERATE"],
    value: 0n,
  });

  console.log(`Deploy TX: ${deployTx}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTx,
    retries: 200,
    interval: 5000,
  });

  console.log("Deploy receipt:", JSON.stringify(receipt, null, 2));

  const contractAddress =
    (receipt as any)?.data?.contract_address ||
    (receipt as any)?.contract_address ||
    (receipt as any)?.result?.contract_address;

  if (contractAddress) {
    console.log(`\nTrustedTransfer deployed at: ${contractAddress}`);
  } else {
    console.log("\nCould not extract address -- check receipt above.");
  }
}

main().catch(console.error);
```

**Step 3: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git add deploy/001_deploy_vouch.ts deploy/002_deploy_trusted_transfer.ts
git commit -m "feat: update deploy scripts for genlayer-js 0.23.1

- Standalone scripts (no GenLayerClient param, self-contained)
- Use testnetBradbury chain
- Add TrustedTransfer deploy script"
```

---

### Task 9: Deploy to Bradbury testnet

**Step 1: Deploy VouchProtocol**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun" && npx tsx deploy/001_deploy_vouch.ts`

Expected: Contract address printed. Save it.

**Step 2: Create frontend .env**

Run: `echo "VITE_CONTRACT_ADDRESS=<address_from_step_1>" > "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend/.env"`

**Step 3: Deploy TrustedTransfer**

Run: `VOUCH_CONTRACT_ADDRESS=<address_from_step_1> npx tsx deploy/002_deploy_trusted_transfer.ts`

**Step 4: Test a vouch call**

Use genlayer CLI or a quick script to call `vouch("torvalds")` and verify the profile is readable via `get_profile_by_handle("torvalds")`.

**Step 5: Commit .env.example update**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git commit --allow-empty -m "chore: deployed to Bradbury testnet"
```

---

### Task 10: Build and deploy frontend

**Step 1: Build frontend**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend" && npm run build`

Expected: `dist/` directory created with built files.

**Step 2: Deploy to Vercel**

Run: `cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun/frontend" && npx vercel --prod`

Or if not set up: `npx vercel` and follow prompts. Set env var `VITE_CONTRACT_ADDRESS` in Vercel dashboard.

**Step 3: Verify live site**

Open the Vercel URL. Test: search "torvalds" → should show profile if previously vouched, or "Generate" button if not.

**Step 4: Commit**

```bash
cd "C:/Users/GUDMAN/Desktop/Github files/vouch-fun"
git commit --allow-empty -m "chore: frontend deployed to Vercel"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Rewrite contract for Bradbury | `contracts/vouch_protocol.py` |
| 2 | Create consumer contract | `contracts/trusted_transfer.py` |
| 3 | Add handle index helpers | `contracts/vouch_helpers.py` |
| 4 | Add handle index tests | `tests/test_handle_index.py` |
| 5 | Update frontend SDK | `package.json`, `frontend/package.json`, `frontend/src/lib/genlayer.ts` |
| 6 | Update Profile page | `frontend/src/pages/Profile.tsx`, `frontend/src/types.ts` |
| 7 | Update Integrate page | `frontend/src/pages/Integrate.tsx` |
| 8 | Update deploy scripts | `deploy/001_deploy_vouch.ts`, `deploy/002_deploy_trusted_transfer.ts` |
| 9 | Deploy to Bradbury | Manual deploy + test |
| 10 | Build + deploy frontend | Vercel deploy |
