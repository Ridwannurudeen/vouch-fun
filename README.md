# vouch.fun --- Composable Trust Synthesis for the Agentic Economy

Web-grounded trust synthesis via decentralized AI consensus. 5 independent validators fetch real data from GitHub API, Etherscan, and ENS via `gl.nondet.web.render()`, then grade 6 trust dimensions through GenLayer's Equivalence Principle. Evidence-grounded judgment with query fees, stake-to-vouch, and dispute slashing.

**Live:** https://vouch.gudman.xyz

**Track:** Agentic Economy --- Bradbury Builders Hackathon

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

### TrustGate --- dimension-gated consumer contract

```python
class TrustGate(gl.Contract):
    vouch_address: str
    required_dimension: str   # "code", "defi", "governance", etc.
    min_grade: str            # "B" = B or above required

    @gl.public.write
    def register(self, name: str) -> str:
        caller = str(gl.message.sender_account).lower()
        vouch = gl.ContractAt(Address(self.vouch_address))
        dim_raw = str(vouch.get_dimension(caller, self.required_dimension))
        dim = json.loads(dim_raw)
        grade = dim.get("grade", "N/A")
        confidence = dim.get("confidence", "none")
        if confidence == "none":
            raise Exception(f"No {self.required_dimension} data")
        if grade_val(grade) < grade_val(self.min_grade):
            raise Exception(f"Insufficient: {grade} (need {self.min_grade}+)")
        # Register the caller
        ...
```

### Use Cases

Each consumer picks the dimension it cares about:

| Consumer | Checks | Why |
|----------|--------|-----|
| Agent Marketplace | `get_dimension(addr, "code")` | Only devs with proven code skills register agents |
| DeFi Protocol | `get_dimension(addr, "defi")` | Gate pool access on financial responsibility |
| DAO | `get_dimension(addr, "governance")` | Weight votes by governance participation history |
| Social App | `get_dimension(addr, "social")` | Filter by public reputation |
| Identity Gate | `get_confidence(addr, "identity")` | Require high-confidence identity verification |

That is composable infrastructure. The same trust profile serves every use case without modification.

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

### TrustGate Consumer API

| Method | Parameters | Description |
|--------|------------|-------------|
| `register(name)` | `str` | Register if caller meets dimension + grade requirement |
| `get_registrations()` | --- | All registered addresses and their grades |
| `get_config()` | --- | Gate configuration: vouch address, required dimension, min grade |
| `is_registered(address)` | `str` | Check if address is registered |

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
| Contracts | Python Intelligent Contracts on GenLayer Bradbury |
| Consensus | Optimistic Democracy with `prompt_non_comparative` equivalence principle |
| AI Evaluation | `gl.nondet.exec_prompt()` --- 5 independent validator instances |
| Composability | `gl.ContractAt()` for native cross-contract trust queries |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Visualization | Recharts (6-axis radar charts) + Framer Motion (animations) |
| SDK | genlayer-js 0.23.1 |

---

## Deployed Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| VouchProtocol | `0x3F32FeD0eC4A1D34C81316DE8773674cBB4ea507` (Bradbury) | Core trust synthesis oracle --- 6 dimensions, 3 seed profiles |
| TrustGate | Pending deploy (Bradbury validators recovering) | Dimension-gated registration consumer (composability demo) |
| Frontend | https://vouch.gudman.xyz | Live web application |

---

## Roadmap

### v3 (now) --- Multi-Dimensional AI Synthesis
- 6 trust dimensions with graded assessments
- Confidence levels for honest uncertainty reporting
- Universal input resolution (GitHub, ENS, wallet, Twitter)
- Composable view methods: `get_dimension()`, `get_trust_score()`, `get_confidence()`
- TrustGate consumer contract proving cross-contract composability
- Dispute system with permanent accountability tracking

### v4 --- Verified Data Feeds
- GitHub API indexer providing real repo/commit/star data to validators
- On-chain indexer feeding actual transaction history and contract deployments
- Social API aggregator for Twitter/Farcaster/Lens activity data
- Validators receive real data alongside LLM synthesis, increasing confidence levels

### v5 --- Mainnet + Economics
- GenLayer mainnet deployment with transaction fee revenue (up to 20% to deployed contracts)
- Explicit vouch bonds (e.g., 10 GEN locked per evaluation)
- Slashing mechanism for frequently-disputed vouches
- Staking for profile generation
- Challenge/dispute economics with disputer rewards

---

## Project Structure

```
vouch-fun/
  contracts/
    vouch_protocol.py          # Core trust oracle: 6-dimension AI synthesis (11,977 bytes)
    trust_gate.py              # Dimension-gated consumer contract (composability demo)
  frontend/
    index.html                 # OG meta tags, favicon, Inter font
    src/
      lib/genlayer.ts          # GenLayer SDK integration + 6 demo profiles
      types.ts                 # TrustProfile, DimensionScore, DIMENSIONS, DIMENSION_LABELS
      pages/
        Home.tsx               # Agent use cases, 6-dimension grid, trust flow teaser
        Profile.tsx            # 6-axis radar, confidence badges, trust score, key signals
        Explore.tsx            # Filterable + sortable profile grid by tier
        Compare.tsx            # Side-by-side 6-axis radar + dimension comparison table
        HowItWorks.tsx         # Scroll-animated 5-step consensus explainer
        Integrate.tsx          # Full v3 API reference, TrustGate examples, use cases
      components/
        ConsensusAnimation.tsx # Animated 5-node validator consensus pentagon
        RadarChart.tsx         # Recharts 6-axis radar (single + comparison mode)
        GradeCard.tsx          # Dimension card: grade, confidence badge, key signals
        GradeBar.tsx           # Animated horizontal grade bar
        ProfileCard.tsx        # Profile card with 6 dimension badges
        DisputeModal.tsx       # Challenge score submission modal
        SearchBar.tsx          # Universal input: GitHub, ENS, wallet, or @twitter
        TrustBadge.tsx         # Colored trust tier badge
        StatsBar.tsx           # Live profile/query/dispute counts
  scripts/
    deploy_v3.mjs              # VouchProtocol v3 deployment + polling
    deploy_trustgate.mjs       # TrustGate deployment with dimension config
    test_trustgate.mjs         # Cross-contract registration test
    test_vouch_v3.mjs          # Contract integration tests
  tests/
    test_v3_helpers.py         # 62 unit tests: type detection, sanitization, parsing, grades
    test_v3_schema.py          # 132 schema validation tests for all 6 demo profiles
    test_validators.py         # Validator input validation tests
    test_prompts.py            # Prompt construction tests
    test_handle_index.py       # Handle-to-address resolution tests
    fixtures/
      demo_profiles.json       # 6 demo profiles matching frontend fallback data
  docs/
    plans/                     # Design documents
    pitch.md                   # Hackathon submission pitch one-pager
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

# Run tests (240 tests)
python -m pytest tests/ -v
```

---

## Design Decisions

1. **6 dimensions, not 2** --- v2 evaluated code + on-chain. That is too thin to be infrastructure. 6 dimensions cover the full trust surface: what you build, how you transact, your public reputation, your governance participation, your financial behavior, and your identity linkage. Each dimension is independently queryable, making the protocol genuinely composable.

2. **Confidence levels** --- This is the credibility unlock. Instead of claiming certainty we do not have, every dimension includes a confidence level (high/medium/low/none). A profile for Vitalik Buterin has `high` confidence across most dimensions. A profile for an anonymous wallet has `low` confidence on social and `none` on governance. Consumers decide their own confidence thresholds.

3. **String storage (Bradbury constraint)** --- GenLayer Bradbury's `TreeMap` type is currently broken --- deployed contracts with `TreeMap` have unreadable state. All data is stored as serialized JSON in `str` primitives. This is a pragmatic constraint that will be revisited when `TreeMap` is fixed.

4. **Seeded profiles** --- The constructor bootstraps 3 profiles demonstrating the full range: vbuterin (all dimensions strong, high confidence), torvalds (legendary code, zero crypto presence), ridwannurudeen (moderate across the board, mixed confidence). Judges see meaningful data immediately after deploy.

5. **Universal input resolution** --- Accept any identifier type (GitHub handle, ENS name, wallet address, Twitter handle) through a single `vouch()` method. The contract auto-detects the type and adjusts the evaluation prompt accordingly. This removes the friction of "which identifier do I need?" --- the answer is "whatever you have."

6. **Synthesis, not verification** --- We are explicit: vouch.fun synthesizes trust judgment from AI consensus. We do not claim to scrape APIs or verify data in real-time (that is v4). The value is in the judgment --- 5 independent AI validators reaching consensus on a subjective question --- not in raw data aggregation. This honest framing is stronger than overclaiming.
