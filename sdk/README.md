# vouch.fun SDK

One-line trust checks for any GenLayer Intelligent Contract.

## Quick Start

```python
from vouch import VouchClient

VOUCH_ADDRESS = "0xbC20d8c9A1C6ff966508f1777aeF8ef05661E847"
client = VouchClient(VOUCH_ADDRESS)

# Simple: is this address trusted?
if client.is_trusted("0x1234..."):
    proceed()

# Dimension check: does this agent have B+ code?
if client.meets_threshold("0x1234...", "code", "B"):
    hire_agent()

# Score check: minimum 60/100?
if client.meets_score("0x1234...", 60):
    allow_borrow()

# Comprehensive gate: combine all checks
result = client.gate_check(
    "0x1234...",
    min_score=60,
    dimension="code",
    min_grade="B",
    min_tier="MODERATE"
)
if result["passed"]:
    proceed()
```

## Inside Intelligent Contracts

```python
from vouch import quick_check

VOUCH_ADDR = "0xbC20d8c9A1C6ff966508f1777aeF8ef05661E847"

class MyContract(gl.Contract):
    @gl.public.write
    def gated_action(self):
        caller = str(gl.message.sender_account).lower()
        if not quick_check(VOUCH_ADDR, caller, "code", "B"):
            raise Exception("Need B+ code grade on vouch.fun")
        # ... proceed with action
```

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `get_trust_score(addr)` | `int` | Overall score 0-100 |
| `get_trust_tier(addr)` | `str` | TRUSTED/MODERATE/LOW/UNKNOWN |
| `get_dimension(addr, dim)` | `dict` | Grade, confidence, reasoning, signals |
| `get_profile(addr)` | `dict` | Full 6-dimension profile |
| `meets_threshold(addr, dim, grade)` | `bool` | Does address meet grade? |
| `meets_score(addr, score)` | `bool` | Does address meet score? |
| `is_trusted(addr)` | `bool` | Is tier TRUSTED? |
| `gate_check(addr, ...)` | `dict` | Combined check with details |
| `quick_check(vouch, target, dim, grade)` | `bool` | One-liner for contracts |

## Dimensions

`code` · `onchain` · `social` · `governance` · `defi` · `identity`

## Grades

`A` (5) > `B` (4) > `C` (3) > `D` (2) > `F` (1) > `N/A` (0)
