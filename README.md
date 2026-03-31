# vouch.fun — Trust, Verified.

Composable reputation oracle for GenLayer. AI-verified trust profiles from GitHub and on-chain activity, stored on-chain and queryable by any Intelligent Contract.

**Live:** https://vouch.gudman.xyz

**Track:** Agentic Economy — Bradbury Builders Hackathon

## What It Does

vouch.fun scrapes a builder's GitHub profile (and optionally their Etherscan activity if an ETH address is found in their bio), runs the data through LLM analysis via GenLayer's Optimistic Democracy consensus, and produces a structured trust profile with letter grades and reasoning.

Any GenLayer contract can query trust tiers with a single cross-contract call — enabling trust-gated actions like transfers, governance votes, or marketplace access.

### Trust Tiers

| Tier | Meaning | Criteria |
|------|---------|----------|
| **TRUSTED** | Top-tier builder | Both code + on-chain grades B or above |
| **MODERATE** | Mixed signals | Some strong, some weak areas |
| **LOW** | Concerning patterns | Any category graded D or below |
| **UNKNOWN** | Insufficient data | Not enough information from either source |

## Architecture

```
User searches handle ──> VouchProtocol contract
                              │
                              ├── gl.nondet.web.render("github.com/{handle}")
                              ├── gl.nondet.exec_prompt(extract GitHub data)
                              ├── gl.nondet.web.render("etherscan.io/...")  [optional]
                              ├── gl.nondet.exec_prompt(extract on-chain data)
                              └── gl.nondet.exec_prompt(synthesize trust profile)
                              │
                              ▼
                    gl.eq_principle.prompt_non_comparative()
                    (validators reach consensus on trust evaluation)
                              │
                              ▼
                    Profile stored on-chain ──> Frontend displays
                              │
                              ▼
                    Other contracts call get_trust_tier()
                              │
                              ▼
                    TrustedTransfer (composability demo)
```

## Composability

The key differentiator: any GenLayer contract can gate actions based on trust.

```python
# In your contract — one line to check trust
tier = gl.ContractAt(VOUCH_ADDRESS).get_trust_tier(recipient)
if tier not in ["TRUSTED", "MODERATE"]:
    raise Exception("Insufficient trust")
```

**TrustedTransfer** (included) demonstrates this — it only allows transfers to recipients meeting a minimum trust tier, verified cross-contract against VouchProtocol.

## Contract API

### Write Methods
- `vouch(github_handle)` — Generate trust profile from GitHub + optional Etherscan
- `refresh(github_handle)` — Force re-scrape and re-evaluate

### View Methods (Composable)
- `get_profile(address)` — Full profile JSON by wallet address
- `get_profile_by_handle(handle)` — Resolve handle, return profile
- `get_trust_tier(address)` — Returns TRUSTED / MODERATE / LOW / UNKNOWN
- `lookup_address(handle)` — Resolve GitHub handle to wallet address
- `get_stats()` — Profile and query counts

## Tech Stack

- **Contract:** Python Intelligent Contract on GenLayer Bradbury
- **Consensus:** Optimistic Democracy with prompt_non_comparative equivalence principle
- **Frontend:** React + Vite + Tailwind CSS
- **SDK:** genlayer-js 0.23.1

## Deployed Contracts (Bradbury Testnet)

| Contract | Address |
|----------|---------|
| VouchProtocol | See frontend/.env |
| TrustedTransfer | See deploy output |

## Local Development

```bash
cd frontend && npm install
cp .env.example .env  # set VITE_CONTRACT_ADDRESS
npm run dev

# Tests
cd .. && python -m pytest tests/ -v
```

## Project Structure

```
contracts/
  vouch_protocol.py      # Main reputation oracle
  trusted_transfer.py    # Composability demo
  vouch_helpers.py       # Pure helpers for unit testing
frontend/src/
  lib/genlayer.ts        # GenLayer SDK integration
  pages/                 # Home, Profile, Integrate
  components/            # TrustBadge, GradeCard, SearchBar
deploy/                  # Deploy scripts
tests/                   # 46 unit tests
```

## Design Decisions

1. **Single non-det block** — All scraping + synthesis in one `prompt_non_comparative` block. Web scraping produces different HTML per validator; `strict_eq` fails. `prompt_non_comparative` lets validators agree on equivalent trust evaluations.

2. **String-only storage** — Bradbury's `TreeMap` is broken. Profiles stored as serialized JSON in `str` primitives.

3. **Handle index** — Separate mapping of handles to addresses enables search-by-handle.
