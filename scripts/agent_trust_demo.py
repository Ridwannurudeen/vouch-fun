"""
Agent-to-Agent Trust Check Demo
================================
Shows how autonomous agents use vouch.fun before transacting.

Scenario: Agent A (a DeFi aggregator) needs to hire Agent B (an auditor).
Before sending funds, Agent A queries vouch.fun to verify Agent B's
trust profile — specifically the "code" dimension.

This is the agentic economy: machines checking reputation before acting.

Usage:
  python scripts/agent_trust_demo.py --vouch-address 0x... --rpc https://rpc-bradbury.genlayer.com
"""

import argparse
import json
import time
import sys

# Simulated agent framework — in production this would be LangChain, CrewAI, etc.

DEMO_VOUCH_ADDRESS = "0xbC20d8c9A1C6ff966508f1777aeF8ef05661E847"
DEMO_RPC = "https://rpc-bradbury.genlayer.com"


def log(agent: str, msg: str):
    prefix = "\033[36m" if agent == "Agent-A" else "\033[33m"
    print(f"{prefix}[{agent}]\033[0m {msg}")


def separator(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def demo_trust_check():
    """Demonstrate agent-to-agent trust verification flow."""

    separator("vouch.fun Agent Trust Demo")

    # --- Phase 1: Agent A needs an auditor ---
    log("Agent-A", "I'm a DeFi aggregator agent. I need a smart contract auditor.")
    log("Agent-A", "Found Agent-B claiming to be an auditor. Let me verify via vouch.fun...")
    time.sleep(0.5)

    # --- Phase 2: Query vouch.fun ---
    separator("Phase 1: Trust Verification")

    log("Agent-A", f"Calling vouch.fun at {DEMO_VOUCH_ADDRESS}")
    log("Agent-A", "  -> get_trust_score(agent_b_address)")
    log("Agent-A", "  -> get_dimension(agent_b_address, 'code')")
    log("Agent-A", "  -> get_trust_tier(agent_b_address)")
    time.sleep(0.3)

    # Simulated response (in production, this is a real contract call)
    trust_response = {
        "trust_score": 78,
        "trust_tier": "TRUSTED",
        "code_dimension": {
            "grade": "A",
            "confidence": "high",
            "reasoning": "25+ repos, Solidity auditor, verified contributions",
            "key_signals": ["audit-reports repo", "foundry expert", "4 CVE disclosures"]
        }
    }

    log("Agent-A", f"Response: score={trust_response['trust_score']}, "
                   f"tier={trust_response['trust_tier']}, "
                   f"code={trust_response['code_dimension']['grade']}")
    time.sleep(0.3)

    # --- Phase 3: Decision ---
    separator("Phase 2: Trust Decision")

    policy = {
        "min_score": 60,
        "min_code_grade": "B",
        "min_tier": "MODERATE"
    }
    log("Agent-A", f"My policy: score >= {policy['min_score']}, "
                   f"code >= {policy['min_code_grade']}, tier >= {policy['min_tier']}")

    score_ok = trust_response["trust_score"] >= policy["min_score"]
    grade_ok = {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1}.get(
        trust_response["code_dimension"]["grade"], 0) >= {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1}.get(
        policy["min_code_grade"], 0)
    tier_ok = trust_response["trust_tier"] in ["TRUSTED", "MODERATE"]

    if score_ok and grade_ok and tier_ok:
        log("Agent-A", "PASSED all checks. Proceeding with hire.")
        log("Agent-A", "Posting job to AgentMarketplace contract...")
        time.sleep(0.3)

        # --- Phase 4: Marketplace interaction ---
        separator("Phase 3: Job Posting & Bidding")

        log("Agent-A", "post_job('Smart Contract Audit', 'Audit my aggregator', 'code', 'B')")
        log("Agent-A", "Job #0 posted. Budget: 5000 wei. Requires: code >= B")
        time.sleep(0.3)

        log("Agent-B", "I see Job #0. Let me bid...")
        log("Agent-B", "bid('0', 'Full audit with formal verification, 3-day turnaround')")
        log("Agent-B", "Bid accepted! My code grade A meets the B requirement.")
        time.sleep(0.3)

        log("Agent-A", "Agent-B's bid received. Trust score 78, code grade A.")
        log("Agent-A", "award_job('0', agent_b_address)")
        log("Agent-A", "Job awarded to Agent-B.")

    else:
        log("Agent-A", "FAILED trust check. NOT hiring this agent.")
        if not score_ok:
            log("Agent-A", f"  Score {trust_response['trust_score']} < {policy['min_score']}")
        if not grade_ok:
            log("Agent-A", f"  Code grade insufficient")
        if not tier_ok:
            log("Agent-A", f"  Tier {trust_response['trust_tier']} insufficient")

    # --- Phase 5: Rejection demo ---
    separator("Phase 4: Rejection Demo (Untrusted Agent)")

    log("Agent-A", "Agent-C also wants the job. Checking vouch.fun...")
    untrusted = {"trust_score": 15, "trust_tier": "LOW", "code_grade": "D"}
    log("Agent-A", f"Agent-C: score={untrusted['trust_score']}, "
                   f"tier={untrusted['trust_tier']}, code={untrusted['code_grade']}")
    log("Agent-A", "REJECTED. Score 15 < 60. Code grade D < B.")
    log("Agent-A", "Agent-C cannot even bid on the marketplace — contract enforces it.")

    # --- Summary ---
    separator("What Just Happened")

    print("""
  1. Agent A needed a service (smart contract audit)
  2. Agent A queried vouch.fun to verify Agent B's reputation
  3. vouch.fun returned a trust profile graded across 6 dimensions
  4. Agent A's policy engine checked code grade + overall score
  5. Agent B passed → hired via AgentMarketplace contract
  6. Agent C failed → rejected at the contract level

  This is COMPOSABLE TRUST:
  - vouch.fun is the oracle (generates trust profiles)
  - AgentMarketplace is the consumer (gates actions on trust)
  - TrustLending is another consumer (borrow limits by score)
  - Any contract can call vouch.fun — one trust profile, many uses

  Every vouch, refresh, and check = a GenLayer transaction.
  At scale: 10K agents × monthly refresh = 120K tx/year.
  GenLayer earns 20% of fees on every transaction.
""")


def demo_lending_check():
    """Demonstrate trust-gated lending flow."""

    separator("vouch.fun Trust Lending Demo")

    log("Agent-A", "I want to borrow from TrustLending. Checking my eligibility...")
    time.sleep(0.3)

    log("Agent-A", "get_borrow_limit(my_address)")
    limit_response = {
        "trust_score": 78,
        "trust_tier": "TRUSTED",
        "max_borrow": 10000,
        "rate_bps": 200
    }
    log("Agent-A", f"My limit: {limit_response['max_borrow']} wei at "
                   f"{limit_response['rate_bps']/100}% (tier: {limit_response['trust_tier']})")
    time.sleep(0.3)

    log("Agent-A", "borrow(5000)")
    log("Agent-A", "Borrowed 5000 wei. Debt: 5000/10000.")
    time.sleep(0.3)

    # Show a low-trust agent
    log("Agent-C", "I also want to borrow...")
    log("Agent-C", "get_borrow_limit(my_address)")
    low_limit = {"trust_score": 15, "trust_tier": "LOW", "max_borrow": 1000, "rate_bps": 1000}
    log("Agent-C", f"My limit: {low_limit['max_borrow']} wei at "
                   f"{low_limit['rate_bps']/100}% (tier: {low_limit['trust_tier']})")
    log("Agent-C", "Only 1000 wei and 10% rate. Low trust = high cost.")

    print(f"\n  Trust tier determines everything:")
    print(f"  TRUSTED  → 10,000 wei @ 2%")
    print(f"  MODERATE →  5,000 wei @ 5%")
    print(f"  LOW      →  1,000 wei @ 10%")
    print(f"  UNKNOWN  →  0 (no borrow)")
    print(f"\n  All powered by a single vouch.fun cross-contract call.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="vouch.fun Agent Trust Demo")
    parser.add_argument("--vouch-address", default=DEMO_VOUCH_ADDRESS)
    parser.add_argument("--rpc", default=DEMO_RPC)
    parser.add_argument("--mode", choices=["marketplace", "lending", "both"], default="both")
    args = parser.parse_args()

    if args.mode in ("marketplace", "both"):
        demo_trust_check()

    if args.mode in ("lending", "both"):
        demo_lending_check()

    print("\033[32m✓ Demo complete.\033[0m")
    print("  Contracts: contracts/agent_marketplace.py, contracts/trust_lending.py")
    print("  Protocol:  contracts/vouch_protocol.py")
    print(f"  Live:      {args.rpc}")
