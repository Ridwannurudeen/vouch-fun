# vouch.fun — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Project**: vouch.fun — Trust, Verified. Composable Reputation Oracle for GenLayer.
**Track**: Agentic Economy Infrastructure (Bradbury Builders Hackathon)
**Date**: 2026-03-23
**Deadline**: 2026-04-03 (11 days)

## Overview

vouch.fun is a composable reputation oracle on GenLayer. Submit any GitHub handle or wallet address. The contract scrapes their public activity across sources, LLM synthesizes a structured trust profile with grades and reasoning, validators reach consensus. The profile is stored on-chain and queryable by any other contract.

This is the trust layer GenLayer's ecosystem is missing. Rally, MergeProof, Internet Court, and Argue.fun all need trust verification — vouch.fun provides it as composable infrastructure.

## Why This Wins

1. **Fills the ecosystem gap** — GenLayer has marketing (Rally), code reviews (MergeProof), disputes (Internet Court), debates (Argue.fun). It has NO trust layer. vouch.fun completes the stack.
2. **Makes every flagship app better** — Rally calls `get_trust_tier()` before accepting creators. MergeProof filters reviewers by Vouch score. Internet Court weighs party credibility. Every integration strengthens GenLayer's story.
3. **Deepest Equivalence Principle usage** — `strict_eq` for factual data extraction from web sources, `prompt_non_comparative` for subjective trust synthesis. Two non-det blocks with different consensus modes in one contract.
4. **The demo is personal** — Type a judge's GitHub handle. Their trust profile appears. No other project makes judges feel something about THEMSELVES.
5. **Impossible on Ethereum** — You cannot scrape GitHub, parse block explorers, and synthesize trust judgments on a deterministic chain.

## Architecture

### Intelligent Contract: `VouchProtocol`

**State Variables**:
- `profiles: TreeMap[str, str]` — handle → JSON profile string (cached)
- `profile_count: int` — total profiles generated
- `query_log: gl.DynArray[str]` — log of queries for stats

**Profile Output Structure** (JSON string):
```json
{
  "handle": "vitalik",
  "sources_scraped": ["github", "etherscan"],
  "generated_at": 1711929600,
  "breakdown": {
    "code_activity": {
      "grade": "A",
      "repos": 47,
      "commits_last_year": 312,
      "languages": ["Python", "Solidity", "JavaScript"],
      "stars_received": 15400,
      "reasoning": "Highly active contributor across multiple languages"
    },
    "onchain_activity": {
      "grade": "B+",
      "tx_count": 1842,
      "first_tx_age_days": 2900,
      "contracts_deployed": 12,
      "suspicious_patterns": false,
      "reasoning": "Long history, moderate contract deployment, no rug patterns"
    },
    "overall": {
      "trust_tier": "TRUSTED",
      "summary": "Veteran builder with strong code contributions and clean on-chain history"
    }
  }
}
```

Key design decisions:
- **Grades (A-F) + reasoning**, not numeric scores. Coarse grades are easier for validators to agree on.
- **Structured breakdown**, not a single number. Judges see the reasoning, not just a verdict.
- **Cached profiles** with 30-day TTL. Reads are cheap, generation is expensive.

### Methods

**Write methods** (`@gl.public.write`):
- `vouch(github_handle: str)` — Generate full profile from GitHub + linked wallet
- `vouch_address(address: str)` — Generate profile from wallet address (on-chain only if no GitHub linked)
- `refresh(handle: str)` — Re-generate stale profile (>30 days old)

**View methods** (`@gl.public.view`):
- `get_profile(handle: str)` — Return cached profile JSON (composable API)
- `get_trust_tier(handle: str)` — Return just the tier string: TRUSTED / MODERATE / LOW / UNKNOWN
- `get_stats()` — Return {profile_count, query_count}

### LLM Evaluation Flow

**Block 1 — Data Extraction** (via `gl.eq_principle_strict_eq`):

Non-det function scrapes GitHub profile page and block explorer:
```
gl.get_webpage("https://github.com/{handle}", mode="text")
→ LLM prompt: "Extract from this GitHub profile page:
   repos (int), commits_last_year (int), languages (list),
   stars_received (int), account_age_years (int), bio (str).
   Return ONLY valid JSON."

gl.get_webpage("https://etherscan.io/address/{address}", mode="text")
→ LLM prompt: "Extract from this Etherscan page:
   tx_count (int), first_tx_date (str), contracts_deployed (int),
   suspicious_patterns (bool), token_diversity (int).
   Return ONLY valid JSON."
```
Returns combined JSON of extracted facts. Uses `strict_eq` because data is factual.

**Block 2 — Trust Synthesis** (via `gl.eq_principle_prompt_non_comparative`):

```
Given this extracted data: {block_1_results}
Evaluate this entity's trustworthiness for the web3 ecosystem.

Grade each category A through F:
- A: Exceptional, top-tier activity and reputation
- B: Strong, consistent and reliable
- C: Average, moderate activity
- D: Below average, limited history or concerning patterns
- F: Poor, suspicious or harmful patterns

Return ONLY valid JSON:
{
  "code_activity": {"grade": "A-F", "repos": int, "commits_last_year": int,
                    "languages": [...], "stars_received": int, "reasoning": "..."},
  "onchain_activity": {"grade": "A-F", "tx_count": int, "first_tx_age_days": int,
                       "contracts_deployed": int, "suspicious_patterns": bool, "reasoning": "..."},
  "overall": {"trust_tier": "TRUSTED|MODERATE|LOW|UNKNOWN", "summary": "..."}
}
```

Uses `prompt_non_comparative` with:
- task: "Evaluate a web3 builder's trustworthiness based on GitHub and on-chain activity"
- criteria: "Grades should reflect activity level, consistency, and absence of suspicious patterns. TRUSTED = both grades B or above. MODERATE = mixed. LOW = any D or below. UNKNOWN = insufficient data."

### Composability API

Other GenLayer contracts call vouch.fun:
```python
# Inside Rally's contract:
tier = gl.call_contract(vouch_address, "get_trust_tier", [creator_handle])
if tier == "LOW" or tier == "UNKNOWN":
    raise Exception("Creator does not meet trust requirements")
```

Every call = transaction fee = revenue.

## Data Flow

```
User submits handle
       │
       ▼
┌──────────────────┐
│ Validate input   │
│ Check cache      │──── Fresh cache hit → return stored profile
└────────┬─────────┘
         │ Cache miss or stale
         ▼
┌────────────────────────────────────┐
│ Block 1: Extract (strict_eq)       │
│ Scrape GitHub → extract facts      │
│ Scrape Etherscan → extract facts   │
│ Return: combined factual JSON      │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ Block 2: Synthesize (non_comparative)  │
│ Given facts → grade each category      │
│ Determine trust tier + reasoning       │
│ Return: structured profile JSON        │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌──────────────────────┐
│ Store profile on-chain│
│ Increment counters    │
│ Return to caller      │
└──────────────────────┘
```

## Edge Cases

| Case | Handling |
|------|----------|
| Private GitHub profile | On-chain only profile, code_activity grade: "N/A" |
| No on-chain activity | GitHub only profile, onchain_activity grade: "N/A" |
| Both sources unavailable | Return tier: "UNKNOWN", summary: "Insufficient data" |
| GitHub scrape fails (rate limit) | Graceful degradation, mark github as "unavailable" |
| Etherscan scrape fails | Graceful degradation, mark onchain as "unavailable" |
| Cached and fresh (<30 days) | Return cached profile, no LLM cost |
| Malicious input (injection) | Sanitize: reject non-alphanumeric handles |
| Handle not found (404) | Return tier: "UNKNOWN", summary: "Entity not found" |

## Fee Structure

| Action | Fee Level | Why |
|--------|-----------|-----|
| `vouch()` / `vouch_address()` | Higher | LLM + web scraping cost |
| `refresh()` | Same as vouch | Re-scrapes everything |
| `get_profile()` | Low | Read from cache |
| `get_trust_tier()` | Lowest | Minimal data return |

## Frontend (React + Vite + Tailwind)

### Pages (3 only)

**1. Home / Search**
- Large search bar: "Enter GitHub handle or wallet address"
- Recent profiles feed below
- Stats bar: profiles generated, queries served
- "Trust, Verified." tagline

**2. Profile View**
- Trust tier badge at top (green TRUSTED / amber MODERATE / red LOW / gray UNKNOWN)
- Two-column card layout:
  - Left: Code Activity (grade badge, repos, commits, languages, stars, reasoning)
  - Right: On-chain Activity (grade badge, tx count, age, contracts, patterns, reasoning)
- Overall summary at bottom
- "Refresh" button for stale profiles
- Shareable URL: vouch.fun/profile/{handle}

**3. Integrate Page**
- Code examples for calling vouch.fun from other contracts
- "How Rally, MergeProof, and Internet Court can use Vouch"
- API reference: get_profile(), get_trust_tier()

### Visual Style
Data-forward, professional. White/light background. Monospace for data points. Grade badges: A=green, B=blue, C=amber, D=orange, F=red. Trust tier as large top badge. Think: GitHub profile meets credit report.

## What We're NOT Building (YAGNI)

- No Twitter/X scraping (blocked by robots.txt, unreliable)
- No custom scoring weights (fixed grading criteria)
- No dispute mechanism for profiles (v2)
- No historical score tracking (current snapshot only, v2)
- No token-gated features
- No multi-chain explorer support (Etherscan only, add others in v2)
- No user accounts or authentication

## Demo Script (2 minutes)

| Time | Action | Result |
|------|--------|--------|
| 0:00 | "Trust is the missing primitive on GenLayer." | Intro |
| 0:10 | Type well-known GitHub handle with rich history | Profile generates: Code Activity A, On-chain B+, TRUSTED |
| 0:30 | Show the breakdown — grades, reasoning, data points | "47 repos, 312 commits, clean on-chain history" |
| 0:45 | Type a fresh/empty handle | UNKNOWN — "2-day-old wallet, no GitHub, insufficient data" |
| 1:00 | "Now the real power — composability." | Switch to integrate page |
| 1:10 | Show: `vouch.get_trust_tier(handle)` | "Any contract calls this. Rally checks creators. MergeProof checks reviewers." |
| 1:30 | "Every profile, every query = transaction. I earn 20% forever. My revenue scales with GenLayer's entire ecosystem." | Revenue pitch |
| 1:50 | "vouch.fun — Trust, verified." | Close |

## Tech Stack

- **Contract**: Python (GenLayer Intelligent Contract, extends gl.Contract)
- **Frontend**: React + Vite + Tailwind CSS
- **SDK**: GenLayerJS SDK for frontend-contract interaction
- **Testing**: GenLayer Studio + GenLayer Test framework
- **Deployment**: Bradbury testnet
- **Domain**: vouch.fun (or vouch.xyz)

## GenLayer SDK Patterns (verified from working code)

```python
import json
import gl  # type: ignore[import-not-found]

class VouchProtocol(gl.Contract):
    profiles: TreeMap[str, str]
    profile_count: int

    def __init__(self):
        self.profile_count = 0

    @gl.public.write
    def vouch(self, github_handle: str) -> str:
        # Block 1: Extract facts (strict_eq)
        handle = github_handle  # capture for closure

        def _extract():
            github_url = f"https://github.com/{handle}"
            github_html = gl.get_webpage(github_url, mode="text")
            prompt = f"Extract from this GitHub profile: repos, commits... Return JSON.\n\n{github_html}"
            extracted = gl.exec_prompt(prompt)
            return extracted  # JSON string

        facts_json = gl.eq_principle_strict_eq(_extract)
        facts = json.loads(facts_json)

        # Block 2: Synthesize trust (non-comparative)
        def _synthesize():
            prompt = f"Given this data: {json.dumps(facts)}\nEvaluate trustworthiness... Return JSON."
            return gl.exec_prompt(prompt)

        profile_json = gl.eq_principle_prompt_non_comparative(
            _synthesize,
            task="Evaluate web3 builder trustworthiness from GitHub and on-chain data",
            criteria="Grades reflect activity, consistency, and absence of suspicious patterns",
        )

        # Store on-chain
        self.profiles[handle] = profile_json
        self.profile_count += 1
        return profile_json

    @gl.public.view
    def get_profile(self, handle: str) -> str:
        return self.profiles.get(handle, "{}")

    @gl.public.view
    def get_trust_tier(self, handle: str) -> str:
        raw = self.profiles.get(handle, "")
        if not raw:
            return "UNKNOWN"
        profile = json.loads(raw)
        return profile.get("overall", {}).get("trust_tier", "UNKNOWN")
```

## Timeline (11 days)

| Days | Task |
|------|------|
| 1-2 | Contract: vouch() with GitHub scraping + extraction (Block 1 with strict_eq) |
| 3-4 | Contract: Block explorer scraping + trust synthesis (Block 2 with non_comparative) + caching |
| 5-6 | Frontend: search page, profile view, integrate page |
| 7-8 | Deploy to Bradbury, test with 10+ diverse handles |
| 9-10 | Demo prep, documentation, polish, video |
| 11 | Buffer |
