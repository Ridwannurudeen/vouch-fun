# vouch.fun — Trust, Verified.

Composable reputation oracle for GenLayer. Submit any GitHub handle or wallet address — AI scrapes public activity, synthesizes a trust profile with grades and reasoning, validators reach consensus. Stored on-chain, queryable by any contract.

## Track

Agentic Economy Infrastructure (Bradbury Builders Hackathon)

## Quick Start

### Contract

```bash
genlayer network localnet  # or testnet-bradbury
genlayer deploy --contract contracts/vouch_protocol.py
```

### Frontend

```bash
cd frontend
cp .env.example .env  # Set VITE_CONTRACT_ADDRESS
npm install && npm run dev
```

### Tests

```bash
pip install pytest
pytest tests/ -v
```

## API (Composable)

```python
# From any GenLayer contract:
tier = gl.call_contract(vouch_address, "get_trust_tier", [handle])
profile = gl.call_contract(vouch_address, "get_profile", [handle])
```

| Method | Returns | Cost |
|--------|---------|------|
| `vouch(handle)` | Full profile JSON | Write (LLM + scraping) |
| `vouch_address(address)` | Full profile JSON | Write (LLM + scraping) |
| `get_profile(handle)` | Cached profile JSON | View (free) |
| `get_trust_tier(handle)` | TRUSTED/MODERATE/LOW/UNKNOWN | View (free) |
| `get_stats()` | Profile + query counts | View (free) |
| `refresh(handle)` | Re-generated profile | Write (LLM + scraping) |

## Architecture

Two non-deterministic blocks per profile:

1. **Data Extraction** (`strict_eq`) — scrapes GitHub + Etherscan, LLM extracts structured facts
2. **Trust Synthesis** (`prompt_non_comparative`) — grades A-F per category, determines trust tier

Trust tiers: **TRUSTED** (both grades B+) | **MODERATE** (mixed) | **LOW** (any D-) | **UNKNOWN** (no data)

## Tech Stack

- **Contract**: Python (GenLayer Intelligent Contract)
- **Frontend**: React + Vite + Tailwind CSS
- **SDK**: GenLayerJS
- **Testing**: pytest (32 unit tests)
