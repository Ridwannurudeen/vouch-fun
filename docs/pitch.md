# vouch.fun -- Composable Trust Synthesis Protocol

**Track:** Agentic Economy | **Chain:** GenLayer Bradbury Testnet
**Live:** https://vouch.gudman.xyz | **Code:** https://github.com/Ridwannurudeen/vouch-fun

---

## Problem

Trust in Web3 is binary and siloed. Gitcoin Passport tells you someone is human -- not whether they ship code. DegenScore rates DeFi behavior -- nothing about governance participation. GitHub shows commit counts -- zero on-chain context.

No composable primitive exists that synthesizes trust across dimensions. Every protocol builds its own isolated, single-axis check. Agents transacting with unknown counterparties have no shared trust layer to query.

## Solution

vouch.fun is a 6-dimension trust synthesis protocol. Five independent AI validators fetch real web data (GitHub API, Etherscan, ENS), then grade the evidence across code, on-chain, social, governance, DeFi, and identity -- reaching consensus via GenLayer's Equivalence Principle. The output is graded (A-F), grounded in real data, and tagged with honest confidence levels.

APIs give data. vouch.fun gives evidence-grounded judgment.

## Why Agentic Economy

Autonomous agents need to assess each other before transacting. An agent marketplace must know: can this provider actually build what it claims? A DeFi protocol must know: is this agent a responsible borrower? A DAO must know: does this delegate actually participate?

vouch.fun is the trust layer agents query. One cross-contract call returns the exact dimension that matters to the caller.

## The 6 Trust Dimensions

| Dimension    | Key          | What AI Evaluates                                      |
|--------------|--------------|--------------------------------------------------------|
| Code         | `code`       | Repos, commits, languages, stars, OSS impact           |
| On-Chain     | `onchain`    | Tx history, account age, contracts deployed, patterns  |
| Social       | `social`     | Followers, influence, community standing               |
| Governance   | `governance` | DAO votes, proposals, delegation history               |
| DeFi         | `defi`       | Protocol usage, LP history, risk appetite              |
| Identity     | `identity`   | ENS, Lens, Farcaster, cross-platform linkage           |

Each dimension returns a grade (A-F), confidence (high/medium/low/none), one-sentence reasoning, and key signals. Confidence is the honesty layer -- we tell you how certain we are, not just what we think.

## Composability

Any Intelligent Contract queries the exact dimension it needs. One line:

```python
vouch = gl.ContractAt(Address(VOUCH_ADDRESS))
code_grade = vouch.get_dimension(agent_address, "code")
```

TrustGate, our deployed consumer contract, demonstrates this: it gates registration behind a minimum grade on any dimension via cross-contract calls. An agent marketplace gates on code. A lending protocol gates on defi. A DAO gates on governance. Same trust layer, different consumers.

## Why Only GenLayer

This is not "call GPT-4 from Chainlink and store the result."

- **web.render**: Validators fetch real GitHub API, Etherscan, and ENS data. Grades are grounded in evidence, not hallucination.
- **exec_prompt**: Validators run LLMs natively to grade the fetched data. No oracle middleware, no API keys, no single point of failure.
- **Equivalence Principle**: Trust evaluation is subjective. Five validators independently assess and agree on equivalence -- not identity. This is impossible on deterministic chains.
- **Native composability**: `gl.ContractAt()` makes cross-contract trust queries a one-liner. No oracle interface to learn.
- **Optimistic Democracy**: Propose, validate, appeal. Incorrect evaluations get challenged through the protocol itself -- vouch.fun's dispute system leverages this directly.

No other chain has AI-native consensus with subjective agreement and native composability. This protocol literally cannot exist elsewhere.

## Competitive Edge

|                         | Gitcoin Passport | DegenScore | Galxe     | vouch.fun              |
|-------------------------|------------------|------------|-----------|------------------------|
| Dimensions              | 1 (personhood)   | 1 (DeFi)   | 1 (tasks) | 6                      |
| Output                  | Boolean          | Score      | Binary    | Graded + reasoned      |
| Confidence levels       | No               | No         | No        | Yes (4 levels)         |
| On-chain composable     | Limited          | No         | No        | Any contract, any dim  |
| Decentralized consensus | Partially        | No         | No        | 5 independent validators|

They give data. We give judgment with confidence.

## What's Built

- **VouchProtocol** -- Intelligent Contract with web-grounded 6-dimension evaluation via `gl.nondet.web.render()`, universal identifier input (GitHub/ENS/wallet/@twitter), query fees, stake-to-vouch, dispute+slash system, comparison engine
- **TrustGate** -- Consumer contract: dimension-gated registration via cross-contract calls
- **TrustLending** -- Consumer contract: borrow limits scale by trust score (TRUSTED: 10K, MODERATE: 5K, LOW: 1K). DeFi dimension gate + overall score threshold
- **AgentMarketplace** -- Consumer contract: agent hiring gate. Jobs require minimum grade on any dimension. Agents bid, contract enforces trust threshold, poster awards
- **Economic model** -- Query fees (1000 wei/vouch), stake-to-vouch (5000 wei min), dispute slashing of wrong stakers
- **Score Decay** -- Profiles expire after 90 days. Agents must `refresh()` to maintain their trust tier. Each refresh = a paid transaction. Stale profiles drop to UNKNOWN tier, losing access to gated services
- **Vouch Yourself** -- Viral onboarding: enter your GitHub handle, see your trust score, share it. "What's your vouch score?" drives organic growth
- **React frontend** -- 6-axis radar chart, dimension cards with confidence badges, trust scores (0-100), staking UI, universal search, comparison view, vouch-yourself flow, social sharing
- **Agent trust demo** -- End-to-end script showing Agent A verifying Agent B via vouch.fun before hiring through AgentMarketplace

## Transaction Volume Projections

vouch.fun generates recurring transactions at scale. Every profile action is an on-chain transaction paying fees.

| Action | Fee | Frequency | Notes |
|--------|-----|-----------|-------|
| `vouch()` | 1000 wei | Once per profile | New profile creation |
| `refresh()` | 1000 wei | Every 90 days | Score decay forces refresh to keep tier |
| `stake_vouch()` | 5000+ wei | Per endorsement | Skin-in-the-game staking |
| `dispute()` | 0 | Per challenge | Re-evaluates with slash on wrong stakers |
| `gate_check()` | 0 (view) | Per consumer call | Free reads incentivize consumer adoption |

**Conservative projection at 10K profiles:**

| Metric | Monthly | Annual |
|--------|---------|--------|
| New vouches | 500 | 6,000 |
| Refreshes (90-day cycle) | 3,333 | 40,000 |
| Staked vouches | 200 | 2,400 |
| Disputes | 50 | 600 |
| **Total write tx** | **4,083** | **49,000** |
| Gate checks (reads) | 20,000+ | 240,000+ |

The refresh cycle is the engine: 10K profiles × 4 refreshes/year = 40K paid transactions minimum. More profiles = linear growth. More consumer contracts = exponential gate checks driving new vouches.

**At 100K profiles:** 490K write tx/year + 2.4M reads. GenLayer earns 20% of fees on every write.

## Composability Network Effect

The more consumer contracts integrate vouch.fun, the more valuable each profile becomes:

```
                    ┌─────────────┐
                    │  vouch.fun  │  ← The trust oracle
                    │  (1 profile)│
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
     ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
     │ TrustGate │  │  Lending  │  │ Marketplace│
     │ (register)│  │ (borrow)  │  │  (hire)    │
     └───────────┘  └───────────┘  └───────────┘
```

Each consumer contract is a reason to vouch. Each new reason drives more transactions. GenLayer benefits from every single one.

## Roadmap

| Version | Status       | Focus                                                   |
|---------|-------------|---------------------------------------------------------|
| v3      | Previous    | 6-dimension AI synthesis, confidence levels, TrustGate  |
| v4      | Now (live)  | Web-grounded data, query fees, stake-to-vouch, slash-on-dispute, consumer contracts (lending + marketplace) |
| v5      | Next        | Score decay enforcement (90-day expiry), profile refresh loop, enhanced staking economics |
| v6      | Mainnet     | Multi-chain indexers, SDK package, up to 20% protocol revenue share, consumer contract ecosystem |

---

**One sentence:** vouch.fun is a composable trust oracle where decentralized AI consensus fetches real web data and synthesizes 6-dimensional judgment -- with query fees, staking, score decay, and consumer contracts -- generating recurring transactions that scale linearly with adoption for the agentic economy.
