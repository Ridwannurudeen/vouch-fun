# vouch.fun v3 — Multi-Signal Trust Synthesis Protocol

## The Problem With v2 (Brutal Self-Assessment)

v2 evaluates 2 dimensions (code + on-chain), frames them as "verified" when they're LLM-generated, has zero real composability demos, and is indistinguishable from a frontend with hardcoded data when testnet is down. A grant evaluator would reject it because:

1. The AI doesn't query real data sources — it synthesizes from training knowledge
2. The composability story is a README snippet, not a deployed demo
3. 2 dimensions is too thin to be infrastructure
4. The framing ("AI evaluates real activity") overpromises

## What v3 Fixes — Everything

### 1. Narrative Reframe (Critical)

**OLD (misleading):** "AI-verified trust profiles from GitHub and on-chain activity"

**NEW (honest + stronger):** "Multi-dimensional trust synthesis via decentralized AI consensus — 5 independent validators evaluate 6 trust dimensions and reach agreement through GenLayer's Equivalence Principle. The first composable reputation primitive that provides *judgment*, not just data."

Key messaging shifts:
- "Verify" → "Synthesize" — we don't claim to verify, we claim to synthesize judgment
- "GitHub checker" → "Trust protocol" — we're infrastructure, not a tool
- "2 grades" → "6-dimensional trust profile" — deep enough to be composable
- Add explicit "Confidence" levels — honest about what the AI knows vs. guesses
- Explain WHY AI consensus matters: "A GitHub API gives you numbers. vouch.fun gives you judgment — is this person trustworthy? That's a subjective question that requires intelligence, not an API call."

### 2. The 6 Trust Dimensions

| Dimension | Key | What AI Evaluates | Why It Matters |
|-----------|-----|-------------------|----------------|
| Code Activity | `code` | Repos, commits, languages, stars, OSS impact, code quality signals | Developer capability |
| On-Chain Activity | `onchain` | Tx history, account age, contracts deployed, suspicious patterns | Blockchain behavior |
| Social Presence | `social` | Twitter/X influence, content quality, community standing, thought leadership | Public reputation |
| Governance | `governance` | DAO participation, proposals, voting history, delegation, protocol contributions | Protocol citizenship |
| DeFi Behavior | `defi` | Protocol interactions, LP history, liquidation patterns, risk appetite | Financial responsibility |
| Identity | `identity` | ENS, Lens, Farcaster, proof-of-personhood signals, cross-platform linkage | Verification depth |

Each dimension returns:
```json
{
  "grade": "A",
  "confidence": "high",
  "reasoning": "Active DAO voter with 3 authored proposals on Uniswap governance",
  "key_signals": ["47 governance votes", "3 proposals authored", "delegate for 12k UNI"]
}
```

**Confidence levels:**
- `high` — Well-known entity, AI has strong basis for assessment
- `medium` — Some signals available, moderate certainty
- `low` — Limited information, assessment is speculative
- `none` — No information available, dimension graded N/A

This is the honesty layer that makes the project credible. We don't pretend to know everything — we tell you how confident we are.

### 3. Universal Input Resolution

Accept ANY identifier, not just GitHub handles:

| Input | Example | Resolution |
|-------|---------|------------|
| GitHub handle | `vbuterin` | Evaluate directly |
| ENS name | `vitalik.eth` | Resolve to address, evaluate both identity + on-chain |
| Wallet address | `0xd8dA...` | Evaluate on-chain, attempt to link other identities |
| Twitter/X handle | `@VitalikButerin` | Evaluate social, attempt to link GitHub/on-chain |

The contract's `vouch()` method accepts a string. A helper function detects the type:
- Starts with `0x` + 40 hex chars → wallet address
- Ends with `.eth` → ENS name
- Starts with `@` → Twitter handle
- Otherwise → GitHub handle

### 4. Contract Architecture (v3)

```python
# Core storage (same string-based approach for Bradbury compat)
class VouchProtocol(gl.Contract):
    profiles_data: str      # JSON: {address: profile_json}
    handle_index: str       # JSON: {identifier: address}
    profile_count: u32
    query_count: u32
    dispute_count: u32
    comparisons_data: str
```

**Profile schema (v3):**
```json
{
  "identifier": "vbuterin",
  "identifier_type": "github",
  "evaluated_at": "2026-04-01",
  "code": {
    "grade": "A", "confidence": "high",
    "reasoning": "...", "key_signals": [...]
  },
  "onchain": {
    "grade": "A", "confidence": "high",
    "reasoning": "...", "key_signals": [...]
  },
  "social": {
    "grade": "A", "confidence": "high",
    "reasoning": "...", "key_signals": [...]
  },
  "governance": {
    "grade": "B", "confidence": "medium",
    "reasoning": "...", "key_signals": [...]
  },
  "defi": {
    "grade": "B", "confidence": "medium",
    "reasoning": "...", "key_signals": [...]
  },
  "identity": {
    "grade": "A", "confidence": "high",
    "reasoning": "...", "key_signals": [...]
  },
  "overall": {
    "trust_tier": "TRUSTED",
    "trust_score": 87,
    "summary": "...",
    "top_signals": ["Ethereum co-founder", "45k GitHub stars", "3M Twitter followers"]
  }
}
```

**New view methods for granular composability:**
```python
# Existing
get_trust_tier(address) -> str          # "TRUSTED"
get_profile(address) -> str             # Full JSON

# NEW — dimension-specific queries (the composability unlock)
get_dimension(address, dimension) -> str  # Single dimension grade + confidence
get_trust_score(address) -> u32           # 0-100 numeric score
get_confidence(address, dimension) -> str # "high"/"medium"/"low"/"none"
```

This means:
- An agent marketplace calls `get_dimension(addr, "code")` — only cares about dev skill
- A DeFi protocol calls `get_dimension(addr, "defi")` — only cares about financial behavior
- A DAO calls `get_dimension(addr, "governance")` — only cares about participation
- A social app calls `get_dimension(addr, "social")` — only cares about reputation

THAT is composable infrastructure. Each consumer uses the dimension relevant to them.

### 5. Tier Calculation (v3)

More nuanced than v2:

```
trust_score = weighted average of all dimensions where confidence != "none"
  code:       weight 1.0
  onchain:    weight 1.0
  social:     weight 0.7
  governance: weight 0.6
  defi:       weight 0.8
  identity:   weight 0.5

Grade to points: A=95, B=80, C=60, D=35, F=10

TRUSTED:   score >= 75 AND no dimension below C
MODERATE:  score >= 50 OR mixed grades
LOW:       score < 50 OR any dimension F
UNKNOWN:   all confidence = "none"
```

### 6. Prompt Engineering (v3)

The prompt must be compact (Bradbury contract size limit) but produce structured 6-dimension output:

```python
_DIMS = "code,onchain,social,governance,defi,identity"
_SCHEMA = ('{"code":{"grade":"<A-F>","confidence":"<high|medium|low|none>",'
           '"reasoning":"<1 sent>","key_signals":["<signal>"]},'
           '"onchain":{...},"social":{...},"governance":{...},'
           '"defi":{...},"identity":{...},'
           '"overall":{"trust_tier":"<TRUSTED|MODERATE|LOW|UNKNOWN>",'
           '"trust_score":<0-100>,"summary":"<1 sent>",'
           '"top_signals":["<top 3 signals>"]}}')

def _prompt(identifier, id_type):
    return (
        f"Evaluate '{identifier}' ({id_type}). "
        f"Assess 6 dimensions: {_DIMS}. "
        "Grade each A-F. Confidence: high (well-known), medium (some info), "
        "low (speculative), none (no info, grade N/A). "
        "Be honest about confidence. "
        f"Return ONLY JSON:\n{_SCHEMA}"
    )
```

The key addition: **"Be honest about confidence."** This single instruction makes validators self-report uncertainty, which is the credibility unlock.

### 7. Seeded Profiles (v3)

3 seed profiles demonstrating the full 6-dimension range:

**vbuterin** — All dimensions strong (A/A/A/B/B/A), all high confidence
**torvalds** — Code legendary, zero crypto presence (A/F/B/F/F/C), mixed confidence
**A lesser-known builder** — Moderate across the board (B/C/C/C/C/B), medium-low confidence

These 3 seeds demonstrate:
- Full-spectrum trust (vbuterin)
- Domain-specific excellence without cross-domain presence (torvalds)
- Honest low-confidence assessment (realistic case)

### 8. Composability Demo — Deployed Consumer Contract

**This is the single biggest gap in v2.** We MUST deploy a real consumer contract.

**TrustGate** — a minimal contract that gates an action behind a specific dimension check:

```python
class TrustGate(gl.Contract):
    vouch_address: str
    required_dimension: str    # "code", "defi", etc.
    required_grade: str        # "B" = B or above
    registrations: str         # JSON dict

    @gl.public.write
    def register(self, name: str) -> str:
        caller = str(gl.message.sender_account).lower()
        vouch = gl.ContractAt(Address(self.vouch_address))
        dim = str(vouch.get_dimension(caller, self.required_dimension))
        # Parse dimension JSON, check grade
        ...
        if grade > self.required_grade:
            raise Exception(f"Insufficient {self.required_dimension}: {grade}")
        # Register
        ...
```

Deploy it. Call it. Show the cross-contract call working. That's the composability proof.

### 9. Frontend Changes

#### Home Page
- New hero: "The Trust Layer for the Agentic Economy" (drop "GenLayer's" — it's bigger than one chain)
- 6-dimension visual: hexagonal/radar preview showing the 6 axes
- Subtitle: "Multi-dimensional trust synthesis via decentralized AI consensus"

#### Profile Page (major overhaul)
- **6-dimension radar chart** replacing the 2 grade bars
- Each dimension as an expandable card with grade, confidence badge, reasoning, key signals
- Confidence indicators: green dot (high), yellow (medium), red (low), gray (none)
- Overall trust score (0-100) displayed prominently alongside tier badge
- "Top Signals" section highlighting the 3 strongest trust indicators

#### Search
- Accept any identifier type (show placeholder: "GitHub, ENS, wallet, or @twitter")
- Auto-detect type and show appropriate icon

#### Explore Page
- Filter by dimension grade (show me everyone with code >= B)
- Sort by trust score

#### Compare Page
- 6-axis radar chart overlay (currently uses ~4 metrics from 2 dimensions)
- Dimension-by-dimension comparison table

#### New: Integrate Page Update
- Show dimension-specific query examples
- "Agent marketplace checks code, DeFi protocol checks defi" use cases
- Live contract address for TrustGate consumer

### 10. README Overhaul

Structure:
1. **One-liner:** Composable multi-dimensional trust synthesis via decentralized AI consensus
2. **Why it exists:** No tool synthesizes code + on-chain + social + governance + DeFi + identity into composable trust. APIs give data. vouch.fun gives judgment.
3. **The 6 dimensions** — table with what each evaluates
4. **How it works** — AI consensus explainer (honest about LLM synthesis, emphasize confidence levels)
5. **Composability** — real examples with deployed contract addresses
6. **Architecture** — diagram showing identifier input → prompt → 5 validators → consensus → 6D profile → consumer contracts
7. **API reference** — all view/write methods
8. **Deployed contracts** — VouchProtocol + TrustGate addresses
9. **Roadmap** — v3 (now), v4 (verified data feeds via indexers), v5 (mainnet + fee model)

### 11. What Makes This Grant-Worthy (The Grant Narrative)

**Problem:** Trust in the agentic economy is binary (KYC or nothing) and siloed (GitHub doesn't talk to on-chain doesn't talk to social). There's no composable primitive for multi-dimensional trust.

**Solution:** vouch.fun is a 6-dimensional trust synthesis protocol where 5 independent AI validators reach consensus on subjective trust assessments. Any contract queries the specific dimension it cares about.

**Why GenLayer:** This is impossible on any other chain. It requires:
- Validators that run LLMs (AI-native consensus)
- The Equivalence Principle (subjective agreement, not exact match)
- Composable view calls (one-line trust lookups from any contract)

**Differentiation:**
| | GitHub API | Gitcoin Passport | vouch.fun |
|---|-----------|-----------------|-----------|
| Dimensions | 1 (code) | 1 (personhood) | 6 |
| Output | Raw numbers | Boolean pass/fail | Graded + reasoned |
| Composable on-chain | No | Limited | Any contract, any dimension |
| Subjective synthesis | No | No | Yes (AI consensus) |
| Decentralized | No | Partially | Fully (5 validators) |

**Revenue path:** GenLayer mainnet gives up to 20% of transaction fees to deployed contracts. vouch.fun as widely-used trust infrastructure generates query fees from every contract that checks trust.

**Roadmap:**
- **v3 (now):** 6-dimension AI synthesis with confidence levels
- **v4 (post-hackathon):** Verified data feeds — GitHub API indexer, on-chain indexer, social API aggregator feed real data to validators alongside LLM synthesis
- **v5 (mainnet):** Fee model, staking for profile generation, challenge/dispute economics

### 12. Addressing Every Judge Objection

| Objection | Answer |
|-----------|--------|
| "The AI makes up data" | We don't claim to verify — we synthesize. Confidence levels are honest about certainty. v4 adds real data feeds. |
| "I can just call GitHub API" | GitHub gives you repo count. vouch.fun gives you a trust JUDGMENT across 6 dimensions. You can't API-call someone's governance participation synthesized with their DeFi behavior. |
| "No users" | Infrastructure launches before users. You don't ask DNS to have users before deploying it. |
| "Anyone can fork this" | The value is the deployed contract with accumulated profiles, not the code. Network effects compound. |
| "2 days left, can you ship this?" | Contract changes are prompt engineering + schema changes. Frontend is component updates. The architecture doesn't change — the evaluation depth does. |

### 13. Economic Mechanism — Skin in the Game

**The problem:** v2 has zero cost for generating or disputing profiles. Anyone can spam. No consequences for bad assessments. A grant reviewer sees: "no economic design = toy project."

**Vouch Bonds:**

When someone calls `vouch(identifier)`, they bond a small amount of GEN (the gas cost already does this implicitly, but we make it explicit in the protocol design):

```
vouch(identifier) → caller bonds gas
  → 5 validators evaluate independently
  → consensus reached → profile stored
  → profile linked to voucher's address
```

**Dispute Economics:**

When someone calls `dispute(identifier, reason)`:
- The dispute triggers a full re-evaluation with the challenger's context
- If the re-evaluation changes the trust tier (e.g., TRUSTED → MODERATE), the original voucher's profile is replaced
- The dispute is recorded permanently — visible on the profile as "disputed: true, dispute_reason: ..."

**On-chain accountability:**
- Every profile stores `vouched_by` — the address that initiated the evaluation
- Dispute history is immutable — you can see who vouched, who challenged, and what changed
- This creates a reputation-of-the-reputation: if someone's vouches are frequently disputed and overturned, consumers can weight their vouches lower

**v5 (mainnet) enhancement:**
- Explicit bond amount (e.g., 10 GEN) locked when vouching
- If 3+ disputes successfully change the tier, bond is slashed
- Slashed bonds go to successful disputers → incentivizes honest challenges
- Creates a market for accurate trust assessment

**Why this matters for the grant:** It shows we've thought beyond "call LLM, store result." There's a game-theoretic design for honest evaluation even when the assessors are AI.

### 14. Competitive Landscape — Why vouch.fun Is Different

A grant reviewer will compare us to existing reputation protocols. Here's the honest map:

| Protocol | What It Does | Strengths | vouch.fun Advantage |
|----------|-------------|-----------|-------------------|
| **Gitcoin Passport** | Aggregates identity stamps (GitHub, Twitter, ENS, etc.) into a humanity score | Established, multi-signal, sybil-resistant | Passport gives a boolean (human/not). vouch.fun gives 6 graded dimensions with reasoning. Passport can't tell you if someone is a good developer or responsible DeFi user. |
| **DegenScore** | On-chain activity scoring for DeFi users | Real data, established DeFi user base | Single-dimension (DeFi only). Not composable on-chain. Centralized API. vouch.fun covers 6 dimensions and lives fully on-chain. |
| **Galxe (Credential)** | Campaign-based credential system | Large user base, gamified | Campaign-based (did you do X task?), not holistic assessment. No AI synthesis. Credentials are binary, not graded. |
| **Karma3Labs / EigenTrust** | Graph-based reputation using trust propagation | Mathematical rigor, peer-to-peer trust | Requires existing trust graph. vouch.fun evaluates from scratch — you don't need existing connections. AI synthesis vs. graph math is a different approach for a different use case. |
| **Worldcoin** | Biometric proof of personhood | Strong sybil resistance | Proves you're human, tells you nothing about trustworthiness. vouch.fun is complementary — you can be human AND untrustworthy. |
| **Trusta Labs** | On-chain sybil detection + reputation | Data-driven, anti-sybil focused | Focused on sybil detection (is this a bot?), not holistic trust assessment. Single-chain typically. |
| **Nomis** | Multi-chain wallet scoring | Cross-chain, real on-chain data | Wallet-only. No code activity, no social, no governance. Centralized scoring algorithm. |

**vouch.fun's unique position:**

None of these protocols:
1. Synthesize across ALL 6 dimensions (code + on-chain + social + governance + DeFi + identity)
2. Provide graded assessments with reasoning (not just scores or booleans)
3. Include AI-generated confidence levels (honest about what's known vs. speculative)
4. Are fully composable on-chain (any contract queries any dimension)
5. Use decentralized AI consensus (5 independent validators reaching subjective agreement)

**The category we create:** vouch.fun isn't competing with oracles (Chainlink gives data) or identity systems (Worldcoin proves humanity). vouch.fun is a **trust judgment protocol** — the first system that uses decentralized AI to answer "how trustworthy is this entity?" across multiple dimensions, with consensus-backed confidence.

### 15. Why "Only Possible on GenLayer" Is Actually True

A skeptic says: "I could call GPT-4 from a Chainlink Function and store the result on Ethereum."

Here's why that doesn't work:

**1. Single point of failure**
Chainlink + GPT-4 = one LLM instance evaluating trust. One model, one prompt, one result. If GPT-4 has a bias or hallucinates, there's no check. vouch.fun has 5 independent LLM instances — each validator might use a different model, different reasoning, different weights. The Equivalence Principle catches outliers.

**2. No subjective consensus mechanism**
On Ethereum, consensus means "all nodes compute the same deterministic result." AI evaluation is inherently non-deterministic — ask the same LLM the same question twice, you get different answers. GenLayer's Equivalence Principle is specifically designed for this: validators compare their subjective assessments and agree if they're "equivalent," not identical. This is impossible on any deterministic blockchain.

**3. No composable view calls**
A Chainlink oracle stores data, but reading it requires knowing the oracle's interface. On GenLayer, any Intelligent Contract calls `get_trust_tier()` or `get_dimension()` directly via `gl.ContractAt()`. The composability is native, not bolted on.

**4. The Optimistic Democracy model**
GenLayer's consensus model (propose → validate → appeal) means incorrect evaluations can be challenged. This is built into the protocol, not an afterthought. vouch.fun's dispute system leverages this directly — a dispute triggers a new round of consensus that supersedes the original.

**In one sentence:** vouch.fun requires AI-native consensus with subjective agreement and native composability — features that exist on GenLayer and literally nowhere else.

---

## Implementation Priority (Deadline: Apr 3)

### PHASE 1 — Contract v3 (MUST HAVE, grant-blocking)
1. Rewrite `vouch_protocol.py` with 6-dimension prompt, v3 schema, confidence levels
2. Add new view methods: `get_dimension()`, `get_trust_score()`, `get_confidence()`
3. Add universal identifier detection (GitHub/ENS/wallet/@handle)
4. Build 3 diverse seed profiles (vbuterin full-spectrum, torvalds domain-skewed, lesser-known honest-low)
5. Add dispute economics: `vouched_by` tracking, dispute history, tier-change recording
6. Write TrustGate consumer contract (dimension-gated registration)
7. Deploy both contracts when testnet allows + retry script for auto-deploy

### PHASE 2 — Frontend v3 (MUST HAVE, grant-blocking)
8. Profile page: 6-dimension radar chart, confidence badges, key signals, trust score (0-100)
9. Home page: updated hero text + 6-dimension visual teaser
10. Search: universal input (placeholder: "GitHub, ENS, wallet, or @twitter"), auto-detect icon
11. Compare page: 6-axis radar overlay + dimension comparison table
12. Explore page: filter by dimension, sort by trust score
13. Integrate page: dimension-specific query examples, TrustGate address, new use cases
14. Update fallback demo profiles with v3 schema (6 dimensions + confidence)

### PHASE 3 — Positioning & Docs (MUST HAVE, grant-blocking)
15. README full rewrite: honest framing, 6 dimensions, competitive landscape, grant narrative
16. Competitive analysis section in README (vs DegenScore, Gitcoin Passport, Galxe, etc.)
17. Architecture diagram updated for v3 flow
18. Roadmap section: v3 → v4 (verified data feeds) → v5 (mainnet + economics)
19. "Why Only GenLayer" section addressing the Chainlink objection directly

### PHASE 4 — Polish & Submission (SHOULD HAVE)
20. Screen recording of full evaluation flow (backup for testnet downtime)
21. Build and deploy frontend to VPS
22. Push all code to GitHub
23. Commit design doc
24. Final grant application review — read as a judge, fix any remaining gaps

### Execution Order
Phases 1-3 can be partially parallelized:
- Contract work (Phase 1) and frontend work (Phase 2) are independent until deploy
- README/docs (Phase 3) depends on contract API being finalized
- Phase 4 is sequential after 1-3 complete

### Time Budget (realistic for 2 days)
- Phase 1 (contract): ~3-4 hours (prompt engineering + schema + view methods + TrustGate)
- Phase 2 (frontend): ~4-5 hours (profile page redesign + radar chart + explore/compare updates)
- Phase 3 (docs): ~2 hours (README rewrite + competitive analysis)
- Phase 4 (polish): ~1-2 hours (deploy + recording + final review)
- **Total: ~10-13 hours of focused work**
