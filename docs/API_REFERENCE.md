# vouch.fun API Reference

## Contract API

### Write Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `vouch(identifier)` | `str` --- GitHub handle, ENS, wallet, or @twitter | Generate 6-dimension trust profile via AI consensus |
| `refresh(identifier)` | `str` | Force full re-evaluation, replacing existing profile |
| `dispute(identifier, reason)` | `str, str` | Challenge a profile. Triggers re-evaluation with dispute context |
| `compare(id_a, id_b)` | `str, str` | AI-powered 6-dimension comparative assessment |
| `seed_profile(identifier, profile_json)` | `str, str` | Store a pre-evaluated profile |

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

## SDK

```python
from vouch import VouchClient

client = VouchClient("0x69690E34f49F29344A393707FF5f364eFc40B0A1")

# Simple checks
if client.is_trusted(addr): proceed()
if client.meets_threshold(addr, "code", "B"): hire()
if client.meets_score(addr, 60): allow_borrow()

# Comprehensive gate
result = client.gate_check(addr, min_score=60, dimension="code", min_grade="B")
```

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

### Transaction Economics

vouch.fun generates recurring transactions that scale linearly with adoption.

| Action | Fee | Frequency |
|--------|-----|-----------|
| `vouch()` | 1000 wei | Once per new profile |
| `refresh()` | 1000 wei | Every 90 days (score decay forces refresh) |
| `stake_vouch()` | 5000+ wei | Per endorsement |
| `dispute()` | 0 | Per challenge |

At 10K profiles: ~49K write transactions/year + 240K reads. At 100K profiles: ~490K writes/year.

The refresh cycle is the engine: profiles expire, agents must pay to maintain their tier. More consumer contracts = more reasons to vouch = more transactions.
