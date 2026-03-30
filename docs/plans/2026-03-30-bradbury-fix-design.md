# vouch.fun — Bradbury Fix & Ship Design

**Date**: 2026-03-30
**Deadline**: April 3, 2026 (Bradbury Builders Hackathon)
**Track**: Agentic Economy Infrastructure

## Problem

The existing vouch.fun contract uses `TreeMap[str, str]` for profile storage, which is broken on Bradbury testnet (state unreadable). The GenLayer Python API has also changed — old `gl.exec_prompt()` / `gl.eq_principle_strict_eq()` calls cause transaction reverts. The frontend uses genlayer-js 0.18.x with the old RPC endpoint.

## Solution: Fix & Ship

Rearchitect storage for Bradbury compatibility, update all GenLayer API calls, add a composable example consumer contract, update the frontend SDK.

---

## 1. Contract Storage Rearchitecture

### State Variables

```python
profiles: TreeMap[Address, str]   # wallet_address → JSON profile string
handle_index: str                 # JSON dict: '{"handle":"0xaddr",...}'
profile_count: u32
query_count: u32
```

- `TreeMap[Address, str]` — works on Bradbury (Address keys verified in official contracts)
- `handle_index: str` — single primitive string storing serialized JSON dict for handle→address resolution. Primitives work. Scales to ~100 profiles for hackathon demo.
- `u32` for counters — verified working on Bradbury

### API Methods

| Method | Type | Signature | Description |
|--------|------|-----------|-------------|
| `vouch` | write | `vouch(github_handle: str) -> str` | Generate profile, store under `msg.sender`, index handle |
| `refresh` | write | `refresh(github_handle: str) -> str` | Re-scrape and regenerate for `msg.sender` |
| `get_profile` | view | `get_profile(address: str) -> str` | Lookup by address (composable) |
| `get_profile_by_handle` | view | `get_profile_by_handle(handle: str) -> str` | Resolve handle→address, return profile |
| `get_trust_tier` | view | `get_trust_tier(address: str) -> str` | Return TRUSTED/MODERATE/LOW/UNKNOWN |
| `lookup_address` | view | `lookup_address(handle: str) -> str` | Return address for a handle |
| `get_stats` | view | `get_stats() -> str` | Return JSON with profile_count, query_count |

### Removed

- `vouch_address(address)` — removed. All profiles are keyed by caller address now. The caller provides their GitHub handle; on-chain data is scraped based on the caller's address.

### GenLayer API Migration

| Old (broken) | New (working) |
|---|---|
| `gl.exec_prompt(p)` | `gl.nondet.exec_prompt(p)` |
| `gl.get_webpage(url, mode='text')` | `gl.nondet.web.render(url, mode='text')` |
| `gl.eq_principle_strict_eq(fn)` | `gl.eq_principle.strict_eq(fn)` |
| `gl.eq_principle_prompt_non_comparative(fn, task=, criteria=)` | `gl.eq_principle.prompt_non_comparative(fn, task=, criteria=)` |

### Depends Header

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

MUST use pinned hash. `"py-genlayer:test"` causes all validators to DISAGREE and state becomes unreadable.

---

## 2. Example Consumer Contract — TrustedTransfer

Small contract demonstrating composability. Shows that any GenLayer contract can gate actions behind vouch.fun trust scores with one cross-contract call.

```python
class TrustedTransfer(gl.Contract):
    vouch_address: str    # Address of deployed VouchProtocol
    min_tier: str         # "TRUSTED" or "MODERATE"

    @gl.public.write
    def transfer_if_trusted(self, recipient_address: str):
        tier = gl.ContractAt(self.vouch_address).get_trust_tier(recipient_address)
        if tier == "LOW" or tier == "UNKNOWN":
            raise Exception(f"Recipient trust too low: {tier}")
        # proceed with action
```

---

## 3. Frontend Updates

### SDK Upgrade

- genlayer-js: `0.18.x` → `0.23.1`
- RPC: old endpoint → `https://rpc-bradbury.genlayer.com`
- Chain: use `testnetBradbury` from `genlayer-js/chains`
- Client: `createClient({ chain: testnetBradbury, account })`

### Search Flow

1. User enters GitHub handle → call `get_profile_by_handle(handle)`
2. Found → display profile with TrustBadge, GradeCards
3. Not found → show "Generate Trust Profile" button → call `vouch(handle)` (write tx, wait for consensus ~60s)
4. User enters 0x address → call `get_profile(address)` directly

### No structural changes

Same 3 pages (Home, Profile, Integrate), same 5 components. Just SDK/API call updates.

---

## 4. Testing

- Update existing 25 unit tests for new function signatures
- Manual deploy + vouch + readback integration test on Bradbury
- Test handle_index `str` state with 5-10 profiles
- Test TrustedTransfer cross-contract call

---

## 5. Timeline

| Day | Tasks |
|-----|-------|
| Mar 30 (today) | Contract rearchitecture + API fixes + consumer contract |
| Mar 31 | Frontend SDK update + test deploy to Bradbury |
| Apr 1 | End-to-end testing, fix issues, polish UI |
| Apr 2 | Record demo, write submission, deploy final |

---

## 6. Deploy

1. Deploy VouchProtocol to Bradbury with pinned Depends hash
2. Extract contract address from receipt
3. Deploy TrustedTransfer with VouchProtocol address
4. Set `VITE_CONTRACT_ADDRESS` in frontend `.env`
5. Build frontend → deploy to Vercel

---

## Key Constraints (Bradbury)

- `TreeMap[str, ...]` — BROKEN (unreadable state)
- `TreeMap[Address, ...]` — WORKS
- `u32`, `bool`, `str` primitives — WORK
- `int`, `DynArray[str]` — BROKEN
- Depends: MUST use pinned hash, not `"py-genlayer:test"`
- API: MUST use `gl.nondet.*` / `gl.eq_principle.*` namespace
