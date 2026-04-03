# vouch.fun — Hackathon Submission

**One-liner:** Composable trust synthesis for the agentic economy — AI-graded reputation from 7 live data sources across 6 dimensions, queryable by any contract.

## Description

The agentic economy breaks down without trust infrastructure. When autonomous agents are hiring, gating, and transacting with strangers on-chain, "does this wallet have ETH" is not enough signal. vouch.fun is a composable trust oracle built on GenLayer that synthesizes reputation across six dimensions — code quality, on-chain history, social presence, governance participation, DeFi behavior, and identity verification — into structured, queryable scores that any smart contract can consume.

This is only possible on GenLayer. vouch.fun's Intelligent Contract uses `gl.nondet.web.render()` to fetch live data from **7 independent sources** — GitHub API, npm registry, Etherscan, Farcaster/Warpcast, Lens Protocol (Hey.xyz), Tally.xyz governance, and DefiLlama — at query time, then routes that evidence through `gl.eq_principle.prompt_comparative()` for 5-validator AI consensus. No other chain has deterministic AI reasoning over live web data built into the VM. On EVM, you'd need a centralized oracle, a trusted committee, or stale cached data. On GenLayer, the trust score *is* the consensus — produced by validators who independently fetch, grade, and agree on evidence pulled from across the developer, social, governance, and DeFi ecosystems, with provenance tracked as "web-grounded" vs "ai-only" so downstream consumers know what they're relying on.

The composable layer is where vouch.fun becomes infrastructure rather than a standalone app. Trust Gates let any contract define access policies against trust dimensions: a DevDAO requires `code >= C`, a DeFi Vault requires `defi >= B`, an airdrop requires `identity >= B`. These gates are deployed as separate Intelligent Contracts that query vouch.fun on-chain — the same pattern as Chainlink price feeds, but for human and agent reputation. The result is a permissionless trust primitive that any protocol in the GenLayer ecosystem can plug into without building their own scoring logic.

## Key Features

- 6-dimension trust scoring: code, on-chain, social, governance, DeFi, identity (each graded A-F with confidence weight)
- 7-source live data fetching via `gl.nondet.web.render()` — GitHub API, npm registry, Etherscan, Farcaster/Warpcast, Lens Protocol, Tally.xyz, and DefiLlama queried at proof generation time
- 5-validator AI consensus via `gl.eq_principle.prompt_comparative()` — deterministic agreement across independent validators
- Evidence provenance tagging: every profile marked "web-grounded" or "ai-only" per dimension
- Composable Trust Gates: contracts gate access by dimension + minimum grade (deployed and queryable on-chain)
- Trust Oracle API: any GenLayer Intelligent Contract can call `get_trust_score(address)` on-chain
- Score decay with 90-day TTL — stale scores auto-invalidate, incentivizing re-verification
- Dispute mechanism: subjects can flag incorrect scores for re-evaluation
- Owner access control with allowlisted evaluators
- 8 real profiles with AI-graded scores, 4 composable gates deployed and live

## Tech Stack

- GenLayer Intelligent Contract (Python) — `gl.nondet.web.render()`, `gl.eq_principle.prompt_comparative()`
- Contract: `0xCEfF3FD4375B1B3437f181BcB30d4b06F84b2E4C` on GenLayer Studio
- genlayer-js v0.28.2 — client, deploy, read/write contract interactions
- Vite + React/TypeScript frontend with Framer Motion
- Live data sources: GitHub REST API v3, npm registry, Etherscan API, Farcaster/Warpcast, Lens Protocol (Hey.xyz), Tally.xyz, DefiLlama

## Links

- Live app: https://vouch.gudman.xyz
- GitHub: https://github.com/Ridwannurudeen/vouch-fun
- Contract: `0xCEfF3FD4375B1B3437f181BcB30d4b06F84b2E4C` on GenLayer Studio

## Track

Agentic Economy
