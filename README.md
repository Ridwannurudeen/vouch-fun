# vouch.fun --- Composable Trust Synthesis for the Agentic Economy

Web-grounded trust synthesis via decentralized AI consensus. 5 independent validators fetch real data from GitHub API, Etherscan, and ENS via `gl.nondet.web.render()`, then grade 6 trust dimensions through GenLayer's Equivalence Principle. Evidence-grounded judgment with query fees, stake-to-vouch, and dispute slashing.

**Live:** https://vouch.gudman.xyz

**Track:** Agentic Economy --- Bradbury Builders Hackathon

---

## Screenshots

| Home | Profile | Gates |
|------|---------|-------|
| ![Home](docs/screenshots/home.png) | ![Profile](docs/screenshots/profile.png) | ![Gates](docs/screenshots/gates.png) |

> **To add screenshots:** take 3 browser screenshots and save them to `docs/screenshots/`:
> - `home.png` — the landing page (hero section + stats bar)
> - `profile.png` — a profile page showing samczsun with all 6 trust dimensions and the radar chart
> - `gates.png` — the consumer contracts / trust gates section showing the 4 gated examples

---

## Why vouch.fun?

In the agentic economy, autonomous agents hire each other, delegate tasks, and transact on behalf of users. Before any interaction, an agent needs to answer: **"Can I trust this entity?"**

That question has no good answer today. Trust is binary (KYC or nothing) and siloed (GitHub doesn't talk to on-chain doesn't talk to social). An agent marketplace can't check whether a candidate has real code skills. A DeFi protocol can't verify a user's governance participation. A DAO can't weight votes by on-chain reputation.

APIs give you numbers. Gitcoin Passport gives you a boolean. DegenScore gives you a single axis. None of them answer the subjective question agents actually need answered: **"How trustworthy is this entity, across what dimensions, and how confident are we?"**

vouch.fun is the trust layer that agents and contracts query before acting:

- **Agent hires auditor** --- `get_dimension(addr, "code")` returns grade + confidence. Only B+ code grade with high confidence gets the contract.
- **Protocol gates access** --- `get_dimension(addr, "defi")` checks DeFi experience before allowing large swaps.
- **DAO weights votes** --- `get_dimension(addr, "governance")` scales voting power by participation history.

We are honest about what this means:

- We **synthesize**, not verify. 5 independent LLMs evaluate an identifier and reach consensus through GenLayer's Equivalence Principle.
- Every assessment includes a **confidence level** --- high, medium, low, or none --- so agents know exactly how much weight to give each dimension.
- Profiles are **composable on-chain** --- any agent or contract queries the specific dimension it cares about with a single view call.

The result is trust infrastructure for the agentic economy: not an oracle, not an identity system, but a **trust judgment protocol** that any autonomous agent can query in one line.

---

## The 6 Trust Dimensions

| Dimension | Key | What AI Evaluates | Why It Matters |
|-----------|-----|-------------------|----------------|
| Code Activity | `code` | Repos, commits, languages, stars, OSS impact, code quality signals | Developer capability |
| On-Chain Activity | `onchain` | Tx history, account age, contracts deployed, suspicious patterns | Blockchain behavior |
| Social Presence | `social` | Twitter/X influence, content quality, community standing, thought leadership | Public reputation |
| Governance | `governance` | DAO participation, proposals, voting history, delegation, protocol contributions | Protocol citizenship |
| DeFi Behavior | `defi` | Protocol interactions, LP history, liquidation patterns, risk appetite | Financial responsibility |
| Identity | `identity` | ENS, Lens, Farcaster, proof-of-personhood signals, cross-platform linkage | Verification depth |

Each dimension returns a structured assessment:

```json
{
  "grade": "A",
  "confidence": "high",
  "reasoning": "Active DAO voter with 3 authored proposals on Uniswap governance",
  "key_signals": ["47 governance votes", "3 proposals authored", "delegate for 12k UNI"]
}
```

---

## How It Works

```
1. Identifier Input
   User submits any identifier: GitHub handle, ENS name, wallet address, or @twitter handle

2. Type Detection
   Contract auto-detects input type:
   - 0x + 40 hex chars  -->  wallet address
   - Ends with .eth     -->  ENS name
   - Starts with @      -->  Twitter handle
   - Otherwise          -->  GitHub handle

3. Web Data Fetching (NEW in v4)
   Validators use gl.nondet.web.render() to fetch REAL data:
   - GitHub: api.github.com/users/{handle} --> repos, stars, followers, created_at
   - Etherscan: etherscan.io/address/{addr} --> tx count, balance, contract interactions
   - ENS: app.ens.domains/{name} --> resolution, records
   AI grades are grounded in actual evidence, not hallucinated from training data.

4. Evidence-Grounded Evaluation
   5 GenLayer validators each grade the fetched data via gl.nondet.exec_prompt()
   Confidence is HIGH only when real data supports it; NONE when no evidence exists

5. Equivalence Principle Consensus
   gl.eq_principle.prompt_non_comparative() compares subjective assessments
   Validators agree on "equivalent" evaluations, not identical ones
   Outliers are filtered --- this is impossible on deterministic blockchains

6. On-Chain Storage + Fee Collection
   Consensus profile stored as JSON. Query fee (1000 wei) added to protocol fee pool.

7. Stake, Query, or Dispute
   Any contract queries specific dimensions. Users stake tokens endorsing grades.
   Disputes trigger re-evaluation with fresh web data --- wrong stakers get slashed.
```

---

## Confidence Levels

This is the honesty layer. We do not pretend to know everything --- we tell you how confident we are.

| Level | Meaning | When It Applies |
|-------|---------|-----------------|
| **high** | Strong basis for assessment | Well-known entity with clear public record |
| **medium** | Some signals available, moderate certainty | Partial information, recognizable but not prominent |
| **low** | Limited information, assessment is speculative | Obscure entity, few public signals |
| **none** | No information available, dimension graded N/A | Complete absence of data for this dimension |

Consumers decide how to use confidence. A DeFi protocol might require `high` confidence on the `defi` dimension. An agent marketplace might accept `medium` on `code`. The protocol provides the data; the consumer sets the threshold.

---

## Economic Model

vouch.fun has a three-layer economic model:

| Mechanism | Amount | Purpose |
|-----------|--------|---------|
| **Query Fee** | 1000 wei per vouch/refresh | Sustainable revenue for protocol operations |
| **Stake-to-Vouch** | 5000 wei minimum | Users endorse specific dimension grades with skin in the game |
| **Dispute Slashing** | Staked amount | Wrong stakers lose their stake when dispute re-evaluation disagrees |

```python
# Stake that torvalds deserves an A in code
stake_vouch("torvalds", "code", "A")  # 5000 wei locked

# Later, someone disputes with fresh evidence
dispute("torvalds", "grade inflated")
# --> Validators re-fetch GitHub data + re-grade
# --> If new grade is C (2+ grades below staked A), stake is slashed
```

Fees accumulate in the contract's `fee_pool`. Stakes create incentive alignment --- you don't just trust the AI, you put money behind your assessment.

---

## Composability

This is the key differentiator. Any GenLayer contract can gate actions based on specific trust dimensions with a single cross-contract call.

### VouchProtocol --- the trust oracle

```python
# Get overall trust tier
tier = gl.ContractAt(VOUCH_ADDRESS).get_trust_tier(address)
# Returns: "TRUSTED", "MODERATE", "LOW", or "UNKNOWN"

# Get a specific dimension
dim = gl.ContractAt(VOUCH_ADDRESS).get_dimension(address, "code")
# Returns: {"grade": "A", "confidence": "high", "reasoning": "...", "key_signals": [...]}

# Get numeric trust score
score = gl.ContractAt(VOUCH_ADDRESS).get_trust_score(address)
# Returns: 0-100
```

### Consumer Contracts --- 3 deployed examples

**TrustGate** --- dimension-gated registration:
```python
vouch = gl.ContractAt(Address(self.vouch_address))
grade = vouch.get_dimension(caller, "code")  # One line
if grade < min_grade: raise Exception("Insufficient trust")
```

**TrustLending** --- borrow limits by trust score:
```python
score = vouch.get_trust_score(caller)   # 0-100
tier = vouch.get_trust_tier(caller)     # TRUSTED/MODERATE/LOW/UNKNOWN
# TRUSTED: 10K wei @ 2% | MODERATE: 5K @ 5% | LOW: 1K @ 10% | UNKNOWN: 0
```

**AgentMarketplace** --- trust-gated agent hiring:
```python
# Post a job requiring B+ code grade
post_job("Audit my contract", "Full audit", "code", "B")
# Only agents with B+ code on vouch.fun can bid
bid("0", "I'll audit with formal verification")  # Contract enforces grade check
```

### SDK --- one-line integration

```python
from vouch import VouchClient

client = VouchClient("0xbC20d8c9A1C6ff966508f1777aeF8ef05661E847")

# Simple checks
if client.is_trusted(addr): proceed()
if client.meets_threshold(addr, "code", "B"): hire()
if client.meets_score(addr, 60): allow_borrow()

# Comprehensive gate
result = client.gate_check(addr, min_score=60, dimension="code", min_grade="B")
```

### Use Cases

Each consumer picks the dimension it cares about:

| Consumer | Checks | Why |
|----------|--------|-----|
| Agent Marketplace | `get_dimension(addr, "code")` | Only devs with proven code skills bid on jobs |
| Lending Protocol | `get_trust_score(addr)` + `get_dimension(addr, "defi")` | Borrow limits scale by trust |
| DAO | `get_dimension(addr, "governance")` | Weight votes by participation history |
| Social App | `get_dimension(addr, "social")` | Filter by public reputation |
| Identity Gate | `get_confidence(addr, "identity")` | Require high-confidence identity verification |

One trust profile, many consumers. The same `vouch()` transaction serves every use case.

---

## Competitive Landscape

| Protocol | Dimensions | Output | On-Chain Composable | AI Consensus | Confidence Levels |
|----------|-----------|--------|--------------------|--------------|--------------------|
| **Gitcoin Passport** | 1 (personhood) | Boolean pass/fail | Limited | No | No |
| **DegenScore** | 1 (DeFi) | Numeric score | No (centralized API) | No | No |
| **Galxe** | Task-based | Binary credentials | Partial | No | No |
| **Karma3Labs** | Graph-based | Trust propagation score | Partial | No | No |
| **Worldcoin** | 1 (humanity) | Boolean proof | No | No | No |
| **Nomis** | 1 (wallet) | Numeric score | No | No | No |
| **vouch.fun** | **6** | **Graded + reasoned** | **Any contract, any dimension** | **5 validators** | **Yes** |

vouch.fun creates a new category. Existing protocols answer narrow questions: "Is this a human?" "How active is this wallet?" "Did this person complete a task?" vouch.fun answers: "How trustworthy is this entity, across what dimensions, and how confident are we?"

---

## Why Only GenLayer

A skeptic says: "Just call GPT-4 from a Chainlink Function and store the result."

Here is why that does not work:

### 1. Single Point of Failure vs. 5 Independent Validators
Chainlink + GPT-4 = one LLM instance, one prompt, one result. If that model hallucinates, there is no check. vouch.fun runs 5 independent validator instances. Each may use different models, different reasoning, different internal weights. The Equivalence Principle catches outliers before consensus is reached.

### 2. No Subjective Consensus Mechanism
On Ethereum, consensus means "all nodes compute the same deterministic result." AI evaluation is inherently non-deterministic --- the same LLM returns different answers to the same question. GenLayer's Equivalence Principle is designed for exactly this: validators compare subjective assessments and agree if they are "equivalent," not identical. This mechanism does not exist on any deterministic blockchain.

### 3. Native Composability via `gl.ContractAt`
Chainlink stores data behind an oracle interface. On GenLayer, any Intelligent Contract calls `get_trust_tier()` or `get_dimension()` directly. The composability is native to the runtime, not bolted on through adapter contracts.

### 4. Optimistic Democracy Dispute Model
GenLayer's consensus model (propose, validate, appeal) means incorrect evaluations can be challenged through the protocol itself. vouch.fun's dispute system leverages this directly --- a dispute triggers a new round of consensus that supersedes the original assessment.

**In one sentence:** vouch.fun requires AI-native consensus with subjective agreement and native composability --- features that exist on GenLayer and literally nowhere else.

---

## Economic Design

### Vouch Bonds
When someone calls `vouch(identifier)`, they are the voucher. The profile permanently records `vouched_by` --- the address that initiated the evaluation. This creates accountability: your vouches are your reputation.

### Dispute Accountability
When someone calls `dispute(identifier, reason)`:
- A full re-evaluation runs with the challenger's context injected into the prompt
- If the trust tier changes (e.g., TRUSTED to MODERATE), the original profile is replaced
- The dispute is recorded permanently: `disputed: true`, `dispute_reason: "..."`
- Dispute history is immutable --- visible to any consumer reading the profile

### Voucher Tracking
Every profile stores its provenance:
- `vouched_by` --- who initiated the evaluation
- `sources` --- `["ai_consensus"]`, `["seed"]`, or `["ai_consensus", "dispute"]`
- If someone's vouches are frequently disputed and overturned, consumers can weight their vouches accordingly

### v5 Slashing Roadmap
- Explicit bond amount (e.g., 10 GEN) locked when vouching
- If 3+ disputes successfully change the trust tier, the bond is slashed
- Slashed bonds go to successful disputers, incentivizing honest challenges
- Creates a market for accurate trust assessment

---

## Contract API

### Write Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `vouch(identifier)` | `str` --- GitHub handle, ENS, wallet, or @twitter | Generate 6-dimension trust profile via AI consensus. Returns cached if caller already has a profile. |
| `refresh(identifier)` | `str` | Force full re-evaluation, replacing existing profile |
| `dispute(identifier, reason)` | `str, str` | Challenge a profile. Triggers re-evaluation with dispute context. Records dispute permanently. |
| `compare(id_a, id_b)` | `str, str` | AI-powered 6-dimension comparative assessment between two identifiers |
| `seed_profile(identifier, profile_json)` | `str, str` | Store a pre-evaluated profile (must include `overall` key) |

### View Methods (composable, free)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `get_profile(address)` | `str` | Full profile JSON | Complete 6-dimension profile by wallet address |
| `get_profile_by_handle(identifier)` | `str` | Full profile JSON | Resolve identifier, return profile |
| `get_trust_tier(address)` | `str` | `"TRUSTED"` / `"MODERATE"` / `"LOW"` / `"UNKNOWN"` | Overall trust classification |
| `get_trust_score(address)` | `str` | `u32` (0-100) | Numeric trust score |
| `get_dimension(address, dimension)` | `str, str` | Dimension JSON | Single dimension: grade, confidence, reasoning, key signals |
| `get_confidence(address, dimension)` | `str, str` | `"high"` / `"medium"` / `"low"` / `"none"` | Confidence level for a specific dimension |
| `lookup_address(identifier)` | `str` | Address string | Resolve identifier to wallet address |
| `get_all_handles()` | --- | JSON array | List all evaluated identifiers |
| `get_stats()` | --- | JSON | Profile count, query count, dispute count |
| `get_comparison(id_a, id_b)` | `str, str` | Comparison JSON | Read stored comparison result |

### Consumer Contract APIs

**TrustGate** --- dimension-gated registration:
| Method | Description |
|--------|-------------|
| `register(name)` | Register if caller meets dimension + grade requirement |
| `get_registrations()` | All registered addresses and their grades |
| `is_registered(address)` | Check if address is registered |

**TrustLending** --- trust-scored lending:
| Method | Description |
|--------|-------------|
| `deposit()` | Deposit into lending pool (send value) |
| `borrow(amount)` | Borrow up to tier limit (TRUSTED: 10K, MODERATE: 5K, LOW: 1K) |
| `repay()` | Repay loan with sent value |
| `get_borrow_limit(address)` | Check max borrow + rate for any address |

**AgentMarketplace** --- trust-gated hiring:
| Method | Description |
|--------|-------------|
| `post_job(title, desc, dimension, min_grade)` | Post job with trust requirements |
| `bid(job_id, proposal)` | Bid on job (contract enforces grade check) |
| `award_job(job_id, winner)` | Poster awards job to bidder |
| `check_eligibility(address, job_id)` | Check if agent qualifies for a job |

---

## Architecture

```
                        vouch.fun --- Trust Synthesis Protocol

  Identifier Input              AI Consensus                    On-Chain Profile
  +-----------------+     +-------------------------+     +---------------------+
  | GitHub: vbuterin|     |   Validator 1 (LLM A)   |     | code:    A (high)   |
  | ENS: vitalik.eth| --> |   Validator 2 (LLM B)   | --> | onchain: A (high)   |
  | Wallet: 0xd8dA..|     |   Validator 3 (LLM C)   |     | social:  A (high)   |
  | Twitter: @vitalik|     |   Validator 4 (LLM D)   |     | governance: B (high)|
  +-----------------+     |   Validator 5 (LLM E)   |     | defi:    B (medium) |
         |                +-------------------------+     | identity: A (high)  |
         v                         |                      | score: 91 / TRUSTED |
  +-----------------+              v                      +---------------------+
  | Type Detection  |     +-------------------------+              |
  | github/ens/     |     | Equivalence Principle   |     +-------+-------+
  | wallet/twitter  |     | Subjective consensus    |     |               |
  +-----------------+     | (equivalent, not        |     v               v
         |                |  identical)              |  Frontend      Consumer Contracts
         v                +-------------------------+  displays      query via gl.ContractAt
  +-----------------+                                   grades +     +------------------+
  | Prompt Builder  |                                   radar    --> | TrustGate        |
  | 6 dimensions    |                                   chart        | AgentRegistry    |
  | grade + conf    |                                                | Any contract...  |
  +-----------------+                                                +------------------+
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Contracts | Python Intelligent Contracts on GenLayer Studio |
| Consensus | Optimistic Democracy with `prompt_non_comparative` equivalence principle |
| AI Evaluation | `gl.nondet.exec_prompt()` --- 5 independent validator instances |
| Composability | `gl.ContractAt()` for native cross-contract trust queries |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Visualization | Recharts (6-axis radar charts) + Framer Motion (animations) |
| SDK | genlayer-js 0.28.2 |

---

## Deployed Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| VouchProtocol v4 | `0xbC20d8c9A1C6ff966508f1777aeF8ef05661E847` (GenLayer Studio) | Core trust synthesis oracle --- web-grounded data, 6 dimensions, economic model |
| Frontend | https://vouch.gudman.xyz | Live web application |

---

## Transaction Economics

vouch.fun generates **recurring transactions** that scale linearly with adoption.

| Action | Fee | Frequency |
|--------|-----|-----------|
| `vouch()` | 1000 wei | Once per new profile |
| `refresh()` | 1000 wei | Every 90 days (score decay forces refresh) |
| `stake_vouch()` | 5000+ wei | Per endorsement |
| `dispute()` | 0 | Per challenge |

**At 10K profiles:** ~49K write transactions/year + 240K reads. At 100K profiles: ~490K writes/year.

The refresh cycle is the engine: profiles expire, agents must pay to maintain their tier. More consumer contracts = more reasons to vouch = more transactions. GenLayer earns up to 20% of fees on every write.

## Roadmap

### v4 (now) --- Web-Grounded Trust Synthesis + Consumer Contracts
- 6 trust dimensions with graded assessments + confidence levels
- **Real web data**: validators use `gl.nondet.web.render()` to fetch GitHub API, Etherscan, ENS
- Query fees (1000 wei), stake-to-vouch (5000 wei min), dispute slashing
- 3 consumer contracts: TrustGate, TrustLending, AgentMarketplace
- Python SDK for one-line integration
- Vouch Yourself viral flow + social sharing

### v5 --- Score Decay + Refresh Loop
- 90-day profile expiry --- stale profiles drop to UNKNOWN tier
- `refresh()` required to maintain access to gated services
- Each refresh = paid transaction (the recurring revenue engine)

### v6 --- Mainnet + Enhanced Economics
- GenLayer mainnet deployment with transaction fee revenue (up to 20%)
- Explicit vouch bonds (10 GEN locked per evaluation)
- Slashing mechanism for frequently-disputed vouches
- Consumer contract ecosystem growth

---

## Project Structure

```
vouch-fun/
  contracts/
    vouch_protocol.py          # Core trust oracle: web-grounded 6-dimension AI synthesis
    trust_gate.py              # Consumer: dimension-gated registration
    trust_lending.py           # Consumer: borrow limits by trust score/tier
    agent_marketplace.py       # Consumer: trust-gated agent hiring marketplace
  sdk/
    vouch.py                   # Python SDK: VouchClient + quick_check() one-liner
    README.md                  # SDK documentation and usage examples
  frontend/
    src/
      lib/genlayer.ts          # GenLayer SDK integration + demo profiles
      types.ts                 # TrustProfile, DimensionScore types
      pages/
        Home.tsx               # Landing: vouch-yourself flow, agent use cases, social proof
        Profile.tsx            # 6-axis radar, confidence badges, trust score, sharing
        Explore.tsx            # Filterable profile grid by tier
        Compare.tsx            # Side-by-side 6-axis radar comparison
        HowItWorks.tsx         # Scroll-animated consensus explainer
        Integrate.tsx          # API reference, consumer contract examples
      components/              # RadarChart, GradeCard, SearchBar, ConsensusAnimation, etc.
  scripts/
    deploy_v3.mjs              # VouchProtocol deployment
    deploy_trustgate.mjs       # TrustGate deployment
    agent_trust_demo.py        # Agent-to-agent trust verification demo
    test_vouch_v3.mjs          # Contract integration tests
  tests/                       # 194 tests: helpers, schema validation
  docs/
    plans/                     # Design documents
    pitch.md                   # Hackathon submission pitch
```

---

## Local Development

```bash
# Frontend
cd frontend && npm install
cp .env.example .env  # set VITE_CONTRACT_ADDRESS and optional VITE_DEMO_PRIVATE_KEY
npm run dev

# Deploy contracts (requires Bradbury testnet private key with GEN)
DEPLOY_KEY=0x... node scripts/deploy_v3.mjs
DEPLOY_KEY=0x... VOUCH_ADDRESS=0x... node scripts/deploy_trustgate.mjs

# Run tests (194 tests)
python -m pytest tests/ -v
```

---

## Design Decisions

1. **6 dimensions, not 2** --- v2 evaluated code + on-chain. That is too thin to be infrastructure. 6 dimensions cover the full trust surface: what you build, how you transact, your public reputation, your governance participation, your financial behavior, and your identity linkage. Each dimension is independently queryable, making the protocol genuinely composable.

2. **Confidence levels** --- This is the credibility unlock. Instead of claiming certainty we do not have, every dimension includes a confidence level (high/medium/low/none). A profile for Vitalik Buterin has `high` confidence across most dimensions. A profile for an anonymous wallet has `low` confidence on social and `none` on governance. Consumers decide their own confidence thresholds.

3. **String storage (Bradbury constraint)** --- GenLayer Bradbury's `TreeMap` type is currently broken --- deployed contracts with `TreeMap` have unreadable state. All data is stored as serialized JSON in `str` primitives. This is a pragmatic constraint that will be revisited when `TreeMap` is fixed.

4. **Seeded profiles** --- The constructor bootstraps 3 profiles demonstrating the full range: vbuterin (all dimensions strong, high confidence), torvalds (legendary code, zero crypto presence), ridwannurudeen (moderate across the board, mixed confidence). Judges see meaningful data immediately after deploy.

5. **Universal input resolution** --- Accept any identifier type (GitHub handle, ENS name, wallet address, Twitter handle) through a single `vouch()` method. The contract auto-detects the type and adjusts the evaluation prompt accordingly. This removes the friction of "which identifier do I need?" --- the answer is "whatever you have."

6. **Evidence-grounded synthesis** --- v4 validators fetch real data via `gl.nondet.web.render()` from GitHub API, Etherscan, and ENS before grading. AI grades are grounded in actual evidence (real repo counts, transaction history, ENS records), not hallucinated from training data. The value is in the judgment --- 5 independent AI validators reaching consensus on a subjective question, informed by real evidence --- combining data aggregation with AI synthesis.
