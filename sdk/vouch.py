"""
vouch.fun Python SDK
====================
One-line trust checks for any GenLayer Intelligent Contract.

Usage:
    from vouch import VouchClient

    client = VouchClient("0xCEfF3FD4375B1B3437f181BcB30d4b06F84b2E4C")

    # Check trust score
    score = client.get_trust_score("0x1234...")
    if score >= 60:
        print("Trusted enough to proceed")

    # Check specific dimension
    code = client.get_dimension("0x1234...", "code")
    if code["grade"] in ("A", "B"):
        print("Strong coder")

    # Gate an action
    if client.meets_threshold("0x1234...", dimension="code", min_grade="B"):
        proceed_with_action()
"""

import json

try:
    from genlayer import gl, Address
    HAS_GENLAYER = True
except ImportError:
    HAS_GENLAYER = False

# Grade values for comparison
GRADE_VALUES = {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1, "N/A": 0}
VALID_DIMENSIONS = ("code", "onchain", "social", "governance", "defi", "identity")
VALID_TIERS = ("TRUSTED", "MODERATE", "LOW", "UNKNOWN")


class VouchClient:
    """Client for querying vouch.fun trust profiles."""

    def __init__(self, contract_address: str):
        """
        Args:
            contract_address: The deployed VouchProtocol address on GenLayer.
        """
        self.address = contract_address
        if HAS_GENLAYER:
            self._contract = gl.ContractAt(Address(contract_address))
        else:
            self._contract = None

    def _call(self, method: str, *args):
        """Call a contract view method."""
        if not self._contract:
            raise RuntimeError("genlayer not available — install genlayer SDK")
        fn = getattr(self._contract, method)
        return fn(*args)

    # --- Core queries ---

    def get_trust_score(self, address: str) -> int:
        """Get overall trust score (0-100) for an address."""
        return int(self._call("get_trust_score", address.strip().lower()))

    def get_trust_tier(self, address: str) -> str:
        """Get trust tier: TRUSTED, MODERATE, LOW, or UNKNOWN."""
        return str(self._call("get_trust_tier", address.strip().lower()))

    def get_dimension(self, address: str, dimension: str) -> dict:
        """Get a specific dimension score.

        Returns:
            dict with keys: grade, confidence, reasoning, key_signals
        """
        if dimension not in VALID_DIMENSIONS:
            raise ValueError(f"Invalid dimension: {dimension}. Use: {VALID_DIMENSIONS}")
        raw = str(self._call("get_dimension", address.strip().lower(), dimension))
        try:
            return json.loads(raw)
        except:
            return {"grade": "N/A", "confidence": "none", "reasoning": "Parse failed", "key_signals": []}

    def get_profile(self, address: str) -> dict:
        """Get full 6-dimension trust profile."""
        raw = str(self._call("get_profile", address.strip().lower()))
        try:
            return json.loads(raw)
        except:
            return {}

    def get_profile_by_handle(self, handle: str) -> dict:
        """Get profile by GitHub/ENS/Twitter handle."""
        raw = str(self._call("get_profile_by_handle", handle.strip().lower()))
        try:
            return json.loads(raw)
        except:
            return {}

    # --- Decision helpers ---

    def meets_threshold(self, address: str, dimension: str, min_grade: str) -> bool:
        """Check if address meets a minimum grade on a dimension.

        Example:
            if client.meets_threshold(addr, "code", "B"):
                allow_action()
        """
        dim = self.get_dimension(address, dimension)
        if dim.get("confidence") == "none":
            return False
        actual = GRADE_VALUES.get(dim.get("grade", "N/A"), 0)
        required = GRADE_VALUES.get(min_grade.upper(), 0)
        return actual >= required

    def meets_score(self, address: str, min_score: int) -> bool:
        """Check if address meets a minimum trust score."""
        return self.get_trust_score(address) >= min_score

    def is_trusted(self, address: str) -> bool:
        """Check if address has TRUSTED tier."""
        return self.get_trust_tier(address) == "TRUSTED"

    def gate_check(self, address: str, min_score: int = 0,
                   dimension: str = None, min_grade: str = None,
                   min_tier: str = None) -> dict:
        """Comprehensive gate check — combine score, dimension, and tier requirements.

        Returns:
            dict with passed (bool), details of each check
        """
        result = {"passed": True, "checks": {}}

        if min_score > 0:
            score = self.get_trust_score(address)
            ok = score >= min_score
            result["checks"]["score"] = {"value": score, "required": min_score, "passed": ok}
            if not ok:
                result["passed"] = False

        if dimension and min_grade:
            dim = self.get_dimension(address, dimension)
            grade = dim.get("grade", "N/A")
            ok = GRADE_VALUES.get(grade, 0) >= GRADE_VALUES.get(min_grade.upper(), 0)
            result["checks"]["dimension"] = {
                "dimension": dimension, "grade": grade,
                "required": min_grade, "passed": ok
            }
            if not ok:
                result["passed"] = False

        if min_tier:
            tier = self.get_trust_tier(address)
            tier_order = {t: i for i, t in enumerate(VALID_TIERS)}
            ok = tier_order.get(tier, 99) <= tier_order.get(min_tier, 99)
            result["checks"]["tier"] = {"value": tier, "required": min_tier, "passed": ok}
            if not ok:
                result["passed"] = False

        return result


# --- Convenience for Intelligent Contracts ---

def quick_check(vouch_address: str, target_address: str,
                dimension: str, min_grade: str) -> bool:
    """One-line trust gate for use inside Intelligent Contracts.

    Example (inside your contract):
        from vouch import quick_check
        if not quick_check(VOUCH_ADDR, caller, "code", "B"):
            raise Exception("Insufficient trust")
    """
    client = VouchClient(vouch_address)
    return client.meets_threshold(target_address, dimension, min_grade)
