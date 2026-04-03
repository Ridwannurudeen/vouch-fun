# vouch.fun --- Composable Trust Synthesis for the Agentic Economy

5 independent AI validators fetch real data from GitHub, Etherscan, and ENS, then grade 6 trust dimensions through GenLayer's Equivalence Principle. Evidence-grounded. Stake-backed. Composable on-chain.

<p align="center">
  <a href="https://vouch.gudman.xyz"><strong>Try it live</strong></a> · <a href="https://vouch.gudman.xyz/explore?view=marketplace">Marketplace</a> · <a href="https://vouch.gudman.xyz/explore?view=marketplace">Explore</a> · <a href="docs/API_REFERENCE.md">API Reference</a>
</p>

<p align="center">
  <img src="docs/screenshots/marketplace-demo.gif" alt="vouch.fun Marketplace Demo" width="720" />
</p>

---

## What It Does

An agent needs to answer **"Can I trust this entity?"** before hiring, lending, or delegating. That question has no good answer today --- trust is binary (KYC or nothing) and siloed (GitHub doesn't talk to on-chain doesn't talk to social).

vouch.fun is the trust layer that agents and contracts query before acting:

```python
tier = vouch.get_trust_tier(address)           # "TRUSTED" / "MODERATE" / "LOW" / "UNKNOWN"
dim  = vouch.get_dimension(address, "code")    # {"grade": "A", "confidence": "high", ...}
score = vouch.get_trust_score(address)          # 0-100
```

- **Agent hires auditor** --- `get_dimension(addr, "code")` returns grade + confidence. Only B+ gets the contract.
- **Protocol gates access** --- `get_dimension(addr, "defi")` checks DeFi experience before allowing large swaps.
- **DAO weights votes** --- `get_dimension(addr, "governance")` scales voting power by participation history.

---

## The 6 Trust Dimensions

| Dimension | Key | What AI Evaluates |
|-----------|-----|-------------------|
| Code Activity | `code` | Repos, commits, languages, stars, OSS impact |
| On-Chain Activity | `onchain` | Tx history, account age, contracts deployed |
| Social Presence | `social` | Twitter/X influence, content quality, thought leadership |
| Governance | `governance` | DAO participation, proposals, voting history |
| DeFi Behavior | `defi` | Protocol interactions, LP history, risk appetite |
| Identity | `identity` | ENS, Lens, Farcaster, cross-platform linkage |

Each dimension returns a grade (A--F), confidence (high/medium/low/none), reasoning, and key signals.

---

## Trust Marketplace

Category browsing, featured experts, rich profile cards with role tags, signal evidence, confidence summaries, and a clear hiring flow.

<p align="center">
  <img src="docs/screenshots/marketplace.png" alt="Trust Marketplace" width="720" />
</p>

- **6 role categories** --- Security, Developer, DeFi, Governance, Social, On-Chain --- click to filter
- **Featured experts** --- top 3 by trust score, highlighted with accent styling
- **Rich cards** --- all roles as colored tags, top 3 key signals, strongest dimension bar, data source dots, confidence summary
- **Role-aware sorting** --- filtering by "Security Expert" sorts by code grade first
- **Marketplace stats** --- verified experts, unique roles, avg trust score, total sources verified
- **How Hiring Works** --- 3-step discover/verify/hire flow at page bottom

---

## How It Works

```
1. Submit any identifier: GitHub handle, ENS name, wallet address, or @twitter handle
2. Contract auto-detects type and builds evaluation prompt for 6 dimensions
3. Validators fetch REAL data via gl.nondet.web.render() (GitHub API, Etherscan, ENS)
4. 5 independent validators each grade the fetched data via gl.nondet.exec_prompt()
5. Equivalence Principle consensus --- validators agree on "equivalent" evaluations, not identical
6. Profile stored on-chain as JSON. Query fee (1000 wei) added to fee pool.
7. Any contract queries specific dimensions. Disputes trigger re-evaluation with fresh data.
```

---

## Composability

Any GenLayer contract gates actions on specific trust dimensions with one cross-contract call:

```python
# TrustGate --- dimension-gated registration
grade = vouch.get_dimension(caller, "code")
if grade < min_grade: raise Exception("Insufficient trust")

# TrustLending --- borrow limits by trust score
score = vouch.get_trust_score(caller)   # TRUSTED: 10K @ 2% | MODERATE: 5K @ 5%

# AgentMarketplace --- trust-gated hiring
post_job("Audit my contract", "Full audit", "code", "B")  # Only B+ can bid
```

3 consumer contracts deployed: **TrustGate**, **TrustLending**, **AgentMarketplace**.

Python SDK for one-line integration:

```python
from vouch import VouchClient
client = VouchClient("0xCEfF3FD4375B1B3437f181BcB30d4b06F84b2E4C")
if client.is_trusted(addr): proceed()
if client.meets_threshold(addr, "code", "B"): hire()
```

Full API reference: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## Why Only GenLayer

| Requirement | Ethereum + Chainlink | GenLayer |
|------------|---------------------|----------|
| Independent AI evaluation | 1 LLM, 1 result, no check | 5 validators, outlier filtering |
| Subjective consensus | Impossible (deterministic) | Equivalence Principle |
| Native composability | Oracle adapter contracts | `gl.ContractAt()` direct calls |
| Dispute resolution | Custom implementation | Built-in optimistic democracy |

vouch.fun requires AI-native consensus with subjective agreement and native composability --- features that exist on GenLayer and literally nowhere else.

---

## Competitive Landscape

| Protocol | Dimensions | Output | On-Chain | AI Consensus | Confidence |
|----------|-----------|--------|----------|--------------|------------|
| Gitcoin Passport | 1 | Boolean | Limited | No | No |
| DegenScore | 1 | Score | No | No | No |
| Worldcoin | 1 | Boolean | No | No | No |
| **vouch.fun** | **6** | **Graded + reasoned** | **Any contract** | **5 validators** | **Yes** |

---

## Economics

| Mechanism | Amount | Purpose |
|-----------|--------|---------|
| Query Fee | 1000 wei per vouch/refresh | Protocol revenue |
| Stake-to-Vouch | 5000 wei minimum | Skin-in-the-game endorsement |
| Dispute Slashing | Staked amount | Wrong stakers lose their stake |

Profiles expire after 90 days --- `refresh()` creates recurring transaction revenue. Full economics: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Contracts | Python Intelligent Contracts on GenLayer Bradbury |
| Consensus | Optimistic Democracy with `prompt_comparative` equivalence |
| AI Evaluation | `gl.nondet.exec_prompt()` --- 5 independent validators |
| Web Data | `gl.nondet.web.render()` --- GitHub API, Etherscan, ENS |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Visualization | Recharts (6-axis radar) + Framer Motion |
| SDK | genlayer-js 0.28.2 |

---

## Deployed

| Contract | Address |
|----------|---------|
| VouchProtocol v4 | `0xCEfF3FD4375B1B3437f181BcB30d4b06F84b2E4C` (Bradbury testnet) |
| Frontend | https://vouch.gudman.xyz |

---

## Architecture

```
  Identifier Input              AI Consensus                    On-Chain Profile
  +-----------------+     +-------------------------+     +---------------------+
  | GitHub: vbuterin|     |   Validator 1 (LLM A)   |     | code:    A (high)   |
  | ENS: vitalik.eth| --> |   Validator 2 (LLM B)   | --> | onchain: A (high)   |
  | Wallet: 0xd8dA..|     |   Validator 3 (LLM C)   |     | social:  A (high)   |
  | Twitter: @vitalik|    |   Validator 4 (LLM D)   |     | governance: B (high)|
  +-----------------+     |   Validator 5 (LLM E)   |     | defi:    B (medium) |
                          +-------------------------+     | score: 91 / TRUSTED |
                                    |                      +---------------------+
                                    v                              |
                          +-------------------------+     +--------+--------+
                          | Equivalence Principle   |     |                 |
                          | Subjective consensus    |  Frontend      Consumer Contracts
                          +-------------------------+  (marketplace)  (TrustGate, Lending,
                                                                      AgentMarketplace)
```

---

## Project Structure

```
vouch-fun/
  contracts/
    vouch_protocol.py          # Core: 6-dimension AI trust synthesis
    trust_gate.py              # Consumer: dimension-gated registration
    trust_lending.py           # Consumer: borrow limits by trust score
    agent_marketplace.py       # Consumer: trust-gated agent hiring
  sdk/
    vouch.py                   # Python SDK: VouchClient one-liner
  frontend/src/
    pages/
      Home.tsx                 # Landing: vouch-yourself flow, radar visualization
      Explore.tsx              # Marketplace: category cards, featured experts, rich filtering
      Profile.tsx              # 6-axis radar, confidence badges, dispute flow
      Compare.tsx              # Side-by-side 6-axis comparison
    components/                # RadarChart, ProfileCard, TrustBadge, etc.
  tests/                       # Schema validation + helper tests
  docs/
    API_REFERENCE.md           # Full contract API, SDK, economics
```

---

## Local Development

```bash
cd frontend && npm install
cp .env.example .env  # set VITE_CONTRACT_ADDRESS
npm run dev

# Deploy contracts (requires Bradbury testnet key with GEN)
DEPLOY_KEY=0x... node scripts/deploy_v3.mjs

# Tests
python -m pytest tests/ -v
```

---

## Roadmap

**v4 (current)** --- Web-grounded trust synthesis, 3 consumer contracts, marketplace with category browsing + featured experts, Python SDK, stake-to-vouch economics

**v5** --- 90-day profile decay + paid refresh loop (recurring revenue engine)

**v6** --- GenLayer mainnet, explicit vouch bonds, slashing for disputed vouches, consumer contract ecosystem
