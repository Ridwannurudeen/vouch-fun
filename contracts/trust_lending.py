# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class TrustLending(gl.Contract):
    """Trust-gated lending — borrow limits scale by vouch.fun trust score.
    Demonstrates composability: any lending protocol can plug in vouch.fun
    to replace centralized credit checks with on-chain reputation."""
    vouch_address: str
    pool_balance: u32
    loans_data: str
    loan_count: u32
    config_data: str

    def __init__(self, vouch_address: str):
        self.vouch_address = vouch_address
        self.pool_balance = 0
        self.loans_data = "{}"
        self.loan_count = 0
        # Tier-based borrow limits (wei)
        self.config_data = json.dumps({
            "tiers": {
                "TRUSTED": {"max_borrow": 10000, "rate_bps": 200},
                "MODERATE": {"max_borrow": 5000, "rate_bps": 500},
                "LOW": {"max_borrow": 1000, "rate_bps": 1000},
                "UNKNOWN": {"max_borrow": 0, "rate_bps": 0}
            },
            "min_defi_grade": "C",
            "min_score": 20
        })

    def _grade_val(self, g):
        return {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1, "N/A": 0}.get(g.upper(), 0)

    def _get_config(self):
        return json.loads(self.config_data)

    def _get_loans(self):
        try:
            return json.loads(self.loans_data)
        except:
            return {}

    def _set_loans(self, loans):
        self.loans_data = json.dumps(loans)

    @gl.public.write
    def deposit(self) -> str:
        """Deposit into the lending pool."""
        if gl.message.value <= 0:
            raise Exception("Must deposit > 0")
        self.pool_balance += gl.message.value
        return json.dumps({"status": "deposited", "amount": gl.message.value, "pool": self.pool_balance})

    @gl.public.write
    def borrow(self, amount: u32) -> str:
        """Borrow from pool — limit determined by vouch.fun trust score."""
        caller = str(gl.message.sender_account).lower()

        # Cross-contract call to vouch.fun
        vouch = gl.ContractAt(Address(self.vouch_address))

        # Get trust score and tier
        score = int(vouch.get_trust_score(caller))
        tier = str(vouch.get_trust_tier(caller))

        # Check DeFi dimension specifically
        defi_raw = str(vouch.get_dimension(caller, "defi"))
        try:
            defi = json.loads(defi_raw)
            defi_grade = defi.get("grade", "N/A")
        except:
            defi_grade = "N/A"

        config = self._get_config()

        # Minimum score check
        if score < config["min_score"]:
            raise Exception(f"Trust score too low: {score} (need {config['min_score']}+)")

        # DeFi dimension check
        if self._grade_val(defi_grade) < self._grade_val(config["min_defi_grade"]):
            raise Exception(f"DeFi grade too low: {defi_grade} (need {config['min_defi_grade']}+)")

        # Get tier limits
        tier_config = config["tiers"].get(tier, config["tiers"]["UNKNOWN"])
        max_borrow = tier_config["max_borrow"]
        rate_bps = tier_config["rate_bps"]

        if max_borrow == 0:
            raise Exception("Unknown trust tier — vouch yourself first at vouch.fun")

        # Check existing loan
        loans = self._get_loans()
        existing = json.loads(loans[caller]) if caller in loans else None
        current_debt = existing["remaining"] if existing else 0

        if current_debt + amount > max_borrow:
            raise Exception(f"Exceeds limit: {current_debt}+{amount} > {max_borrow} (tier: {tier})")

        if amount > self.pool_balance:
            raise Exception(f"Insufficient pool: {amount} > {self.pool_balance}")

        # Issue loan
        self.pool_balance -= amount
        loan = {
            "borrower": caller,
            "amount": amount,
            "remaining": current_debt + amount,
            "rate_bps": rate_bps,
            "trust_tier": tier,
            "trust_score": score,
            "defi_grade": defi_grade
        }
        loans[caller] = json.dumps(loan)
        self._set_loans(loans)
        self.loan_count += 1

        return json.dumps({
            "status": "borrowed",
            "amount": amount,
            "total_debt": current_debt + amount,
            "max_allowed": max_borrow,
            "rate_bps": rate_bps,
            "tier": tier,
            "score": score
        })

    @gl.public.write
    def repay(self) -> str:
        """Repay loan with sent value."""
        caller = str(gl.message.sender_account).lower()
        if gl.message.value <= 0:
            raise Exception("Must send value to repay")

        loans = self._get_loans()
        if caller not in loans:
            raise Exception("No active loan")

        loan = json.loads(loans[caller])
        repay_amount = min(gl.message.value, loan["remaining"])
        loan["remaining"] -= repay_amount
        self.pool_balance += repay_amount

        if loan["remaining"] <= 0:
            del loans[caller]
            status = "fully_repaid"
        else:
            loans[caller] = json.dumps(loan)
            status = "partial_repay"

        self._set_loans(loans)
        return json.dumps({"status": status, "repaid": repay_amount, "remaining": loan["remaining"]})

    @gl.public.view
    def get_borrow_limit(self, address: str) -> str:
        """Check borrow limit for any address — shows composability."""
        a = address.strip().lower()
        vouch = gl.ContractAt(Address(self.vouch_address))
        score = int(vouch.get_trust_score(a))
        tier = str(vouch.get_trust_tier(a))
        config = self._get_config()
        tier_config = config["tiers"].get(tier, config["tiers"]["UNKNOWN"])
        return json.dumps({
            "address": a,
            "trust_score": score,
            "trust_tier": tier,
            "max_borrow": tier_config["max_borrow"],
            "rate_bps": tier_config["rate_bps"]
        })

    @gl.public.view
    def get_loan(self, address: str) -> str:
        a = address.strip().lower()
        loans = self._get_loans()
        return loans.get(a, "{}")

    @gl.public.view
    def get_pool_stats(self) -> str:
        return json.dumps({
            "pool_balance": self.pool_balance,
            "loan_count": self.loan_count,
            "vouch_address": self.vouch_address
        })
