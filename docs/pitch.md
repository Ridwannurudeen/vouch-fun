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
- **TrustGate** -- Consumer contract demonstrating dimension-gated registration via cross-contract calls
- **Economic model** -- Query fees (1000 wei/vouch), stake-to-vouch (5000 wei min), dispute slashing of wrong stakers
- **React frontend** -- 6-axis radar chart, dimension cards with confidence badges, trust scores (0-100), staking UI, universal search, comparison view, integration docs
- **6 demo profiles** -- Full-spectrum (vbuterin), domain-skewed (torvalds), honest-low-confidence (ridwannurudeen), and 3 more covering the assessment range

## Roadmap

| Version | Status       | Focus                                                   |
|---------|-------------|---------------------------------------------------------|
| v3      | Previous    | 6-dimension AI synthesis, confidence levels, TrustGate  |
| v4      | Now (live)  | Web-grounded data (gl.nondet.web.render), query fees, stake-to-vouch, slash-on-dispute |
| v5      | Mainnet     | Multi-chain indexers, enhanced staking economics, up to 20% protocol revenue share |

---

**One sentence:** vouch.fun is the first composable trust primitive where decentralized AI consensus fetches real web data and synthesizes evidence-grounded 6-dimensional judgment -- with query fees, staking, and slash economics -- for the agentic economy.
