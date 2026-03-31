# vouch.fun — Trust, Verified.

Composable reputation oracle for GenLayer. AI-evaluated trust profiles for GitHub developers, stored on-chain and queryable by any Intelligent Contract.

**Live:** https://vouch.gudman.xyz

**Track:** Agentic Economy — GenLayer Bradbury Builders Hackathon

## What It Does

vouch.fun evaluates a developer's trustworthiness through GenLayer's Optimistic Democracy consensus. When you search a GitHub handle, validators independently evaluate the developer using LLM analysis, reach consensus on a structured trust profile, and store the result on-chain.

Any GenLayer contract can then query these trust profiles with a single cross-contract call — enabling trust-gated actions across the ecosystem.

### How It Works

1. **Search** — Enter a GitHub handle on the frontend
2. **Evaluate** — GenLayer validators independently assess the developer via LLM consensus
3. **Store** — Consensus result is stored on-chain as a structured JSON profile
4. **Query** — Any contract calls `get_trust_tier(address)` to gate actions based on trust

### Trust Tiers

| Tier | Meaning |
|------|---------|
| **TRUSTED** | Both code + on-chain grades B or above |
| **MODERATE** | Mixed grades or average activity |
| **LOW** | Any category graded D or below |
| **UNKNOWN** | Insufficient data |

### Profile Structure

Each profile includes letter grades (A-F) with reasoning for:
- **Code Activity** — repos, commits, languages, stars, OSS impact
- **On-Chain Activity** — transactions, account age, contracts deployed, suspicious patterns

## Architecture

```
User searches handle ──> VouchProtocol contract
                              │
                              ├── Builds evaluation prompt
                              └── gl.nondet.exec_prompt()
                                  (each validator evaluates independently)
                              │
                              ▼
                    gl.eq_principle.prompt_non_comparative()
                    (validators reach consensus on trust evaluation)
                              │
                              ▼
                    Profile stored on-chain as JSON
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            Frontend displays     Other contracts call
            grades + reasoning    get_trust_tier()
```

## Composability

The key differentiator: any GenLayer contract can gate actions based on trust.

```python
# In your contract — one line to check trust
tier = gl.ContractAt(VOUCH_ADDRESS).get_trust_tier(recipient)
if tier not in ["TRUSTED", "MODERATE"]:
    raise Exception("Insufficient trust")
```

Use cases:
- **Rally** — Check creator trust before accepting campaign applications
- **MergeProof** — Filter code reviewers by code_activity grade
- **Internet Court** — Weight party credibility using trust tiers in dispute resolution

## Contract API

### Write Methods
- `vouch(github_handle)` — Generate trust profile via LLM consensus
- `refresh(github_handle)` — Force re-evaluation
- `seed_profile(handle, profile_json)` — Store pre-evaluated profile (deterministic)

### View Methods (Composable, free)
- `get_profile(address)` — Full profile JSON by wallet address
- `get_profile_by_handle(handle)` — Resolve handle, return profile
- `get_trust_tier(address)` — Returns TRUSTED / MODERATE / LOW / UNKNOWN
- `lookup_address(handle)` — Resolve GitHub handle to wallet address
- `get_stats()` — Profile and query counts

## Tech Stack

- **Contract:** Python Intelligent Contract on GenLayer Bradbury
- **Consensus:** Optimistic Democracy with `prompt_non_comparative` equivalence principle
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **SDK:** genlayer-js 0.23.1

## Local Development

```bash
# Frontend
cd frontend && npm install
cp .env.example .env  # set VITE_CONTRACT_ADDRESS
npm run dev

# Deploy contract
cd .. && npm install
DEPLOY_KEY=your_private_key node scripts/deploy_seeded.mjs

# Tests
python -m pytest tests/ -v
```

## Project Structure

```
contracts/
  vouch_protocol.py      # Main reputation oracle (single prompt_non_comparative block)
frontend/src/
  lib/genlayer.ts        # GenLayer SDK integration
  pages/                 # Home, Profile, Integrate
  components/            # TrustBadge, GradeCard, SearchBar, StatsBar
scripts/                 # Deploy and test scripts
tests/                   # Unit tests
```

## Design Decisions

1. **Single LLM evaluation per consensus block** — Each `vouch()` call runs one `gl.nondet.exec_prompt()` inside a `prompt_non_comparative` block. Validators evaluate independently and reach consensus on equivalent trust assessments. This avoids the fragility of multi-step web scraping where HTML differs between validators.

2. **String-only storage** — Bradbury's `TreeMap` type is currently broken. All profiles stored as serialized JSON in `str` primitives with manual JSON parsing.

3. **Handle index** — Separate mapping of GitHub handles to wallet addresses enables search-by-handle without address knowledge.

4. **Seeded profiles** — Constructor bootstraps sample profiles (vbuterin, gakonst, ridwannurudeen) so the demo works immediately after deploy.
