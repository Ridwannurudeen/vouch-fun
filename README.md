# vouch.fun — The Trust Layer for GenLayer's Agentic Economy

Composable reputation oracle powered by AI consensus. vouch.fun evaluates developers using GenLayer's Optimistic Democracy — 5 independent AI validators assess GitHub and on-chain activity, reach consensus via the Equivalence Principle, and store verified trust profiles on-chain.

**Live:** https://vouch.gudman.xyz

**Track:** Agentic Economy — GenLayer Bradbury Builders Hackathon

## Why vouch.fun?

Traditional reputation systems rely on subjective human reviews and centralized APIs. vouch.fun is fundamentally different:

- **AI evaluates real activity** — code, commits, on-chain history (not peer opinions)
- **5 validators reach consensus independently** — no single point of failure or bias
- **Fully on-chain** — no API keys, no rate limits, no centralized authority
- **Composable** — any contract queries trust with one view call
- **Impossible on any other chain** — requires GenLayer's AI-native consensus

## Features

### Consensus Visualization
When a profile is generating (60-120s), an animated pentagon shows 5 validator nodes progressing through consensus phases — submitting, evaluating, comparing via Equivalence Principle, and reaching agreement. This is the demo centerpiece.

### Explore
Filterable grid of all evaluated profiles. Filter by trust tier (TRUSTED / MODERATE / LOW). Each card shows handle, trust badge, code and on-chain grade pills, and summary.

### Compare
Side-by-side profile comparison with radar chart overlay. Six axes: Repos, Commits, Stars, Tx Count, Account Age, Contracts Deployed. Visual and tabular comparison at a glance.

### How It Works
Scroll-animated explainer of GenLayer's consensus flow — from search to validator evaluation to Equivalence Principle comparison to on-chain storage to composable queries. Includes comparison with traditional reputation systems (Ethos, etc.).

### Dispute System
Challenge any profile's trust assessment. Validators re-evaluate with the challenger's context, producing a new consensus score. Enables self-correction without centralized moderation.

### Trust Profiles
Each profile includes letter grades (A-F) with reasoning for:
- **Code Activity** — repos, commits, languages, stars, OSS impact
- **On-Chain Activity** — transactions, account age, contracts deployed, suspicious patterns

### Trust Tiers

| Tier | Meaning |
|------|---------|
| **TRUSTED** | Both code + on-chain grades B or above |
| **MODERATE** | Mixed grades or average activity |
| **LOW** | Any category graded D or below |
| **UNKNOWN** | Insufficient data |

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
                                        │
                                        ▼
                                  AgentRegistry
                                  (trust-gated registration)
```

## Composability

The key differentiator: any GenLayer contract can gate actions based on trust.

**VouchProtocol** — the oracle:
```python
tier = gl.ContractAt(VOUCH_ADDRESS).get_trust_tier(recipient)
if tier not in ["TRUSTED", "MODERATE"]:
    raise Exception("Insufficient trust")
```

**AgentRegistry** — included consumer contract that demonstrates composability:
```python
# Only TRUSTED or MODERATE developers can register agents
vouch = gl.ContractAt(self.vouch_address)
tier = str(vouch.get_trust_tier(caller))
if tier not in ("TRUSTED", "MODERATE"):
    raise Exception(f"Insufficient trust: {tier}")
```

Use cases:
- **Agent Marketplaces** — Only trust-verified developers register autonomous agents
- **Code Review** — Filter reviewers by code_activity grade
- **DeFi** — Trust-gated participation in pools or governance
- **Dispute Resolution** — Weight party credibility using trust tiers

## Contract API

### Write Methods
| Method | Description |
|--------|-------------|
| `vouch(handle)` | Generate trust profile via LLM consensus |
| `refresh(handle)` | Force re-evaluation of existing profile |
| `dispute(handle, reason)` | Challenge a score — validators re-evaluate with context |
| `compare(handle_a, handle_b)` | AI-powered comparative assessment |
| `seed_profile(handle, json)` | Store pre-evaluated profile |

### View Methods (Composable, free)
| Method | Description |
|--------|-------------|
| `get_profile(address)` | Full profile JSON by wallet address |
| `get_profile_by_handle(handle)` | Resolve handle, return profile |
| `get_trust_tier(address)` | Returns TRUSTED / MODERATE / LOW / UNKNOWN |
| `lookup_address(handle)` | GitHub handle to wallet address |
| `get_all_handles()` | List all evaluated handles |
| `get_stats()` | Profile, query, and dispute counts |
| `get_comparison(a, b)` | Read stored comparison result |

### AgentRegistry API
| Method | Description |
|--------|-------------|
| `register_agent(name, desc)` | Register agent (requires TRUSTED/MODERATE trust) |
| `get_agents()` | List all registered agents |
| `get_agent(address)` | Get agent by address |
| `get_agent_count()` | Total registered agents |

## Tech Stack

- **Contracts:** Python Intelligent Contracts on GenLayer Bradbury
- **Consensus:** Optimistic Democracy with `prompt_non_comparative` equivalence principle
- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **Visualization:** Recharts (radar charts) + Framer Motion (animations)
- **SDK:** genlayer-js 0.23.1

## Deployed

| Component | Location |
|-----------|----------|
| Frontend | https://vouch.gudman.xyz |
| VouchProtocol | `0x3F32FeD0eC4A1D34C81316DE8773674cBB4ea507` (Bradbury) |

## Local Development

```bash
# Frontend
cd frontend && npm install
cp .env.example .env  # set VITE_CONTRACT_ADDRESS
npm run dev

# Deploy contract
GENLAYER_PRIVATE_KEY=0x... node deploy/001_deploy_vouch.ts

# Tests
python -m pytest tests/ -v
```

## Project Structure

```
contracts/
  vouch_protocol.py        # Main reputation oracle (v2: dispute, compare, handle index)
  agent_registry.py        # Trust-gated agent registration (composability demo)
  vouch_helpers.py         # Pure Python helpers (testable without GenLayer)
  trusted_transfer.py      # Example consumer contract
frontend/src/
  lib/genlayer.ts          # GenLayer SDK integration + 8 demo profiles
  pages/
    Home.tsx               # Hero, search, featured profiles, trust flow teaser
    Profile.tsx            # Trust display, consensus animation, dispute, grade bars
    Explore.tsx            # Filterable profile grid by trust tier
    Compare.tsx            # Side-by-side comparison with radar chart
    HowItWorks.tsx         # Scroll-animated consensus explainer
    Integrate.tsx          # API reference + code examples
  components/
    ConsensusAnimation.tsx # Animated 5-node validator consensus visualization
    ProfileCard.tsx        # Reusable profile card for grids
    RadarChart.tsx         # Recharts radar overlay for comparisons
    GradeBar.tsx           # Animated horizontal grade fill bars
    GradeCard.tsx          # Grade display with stats + reasoning
    DisputeModal.tsx       # Challenge score submission modal
    TrustBadge.tsx         # Colored trust tier badge
    SearchBar.tsx          # Handle/address search input
    StatsBar.tsx           # Live profile/query counts
    Header.tsx             # Navigation (Search, Explore, Compare, How It Works, Integrate)
deploy/                    # Deployment scripts
tests/                     # Unit tests (prompts, validators, handle index)
```

## Design Decisions

1. **Single LLM evaluation per consensus block** — Each `vouch()` call runs one `gl.nondet.exec_prompt()` inside a `prompt_non_comparative` block. Validators evaluate independently and reach consensus on equivalent trust assessments. Avoids multi-step web scraping fragility.

2. **String-only storage** — Bradbury's `TreeMap` type is currently broken. All data stored as serialized JSON in `str` primitives.

3. **Handle index** — Separate handle-to-address mapping enables search-by-handle without address knowledge.

4. **Seeded profiles** — Constructor bootstraps 3 profiles so the demo works immediately after deploy.

5. **Fallback-first frontend** — 8 demo profiles ensure the frontend works perfectly even when testnet is down. Judges see a fully functional platform regardless of network state.

6. **Contract under 12KB** — Bradbury has a contract size limit. Refactored prompts into shared templates and compressed helper methods to stay at ~10KB.
