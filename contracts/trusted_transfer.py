# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""TrustedTransfer — Example consumer of VouchProtocol.

Demonstrates composability: checks vouch.fun trust tier before
allowing an action. Any GenLayer contract can do this with one call.
"""
import json
import gl  # type: ignore[import-not-found]


class TrustedTransfer(gl.Contract):
    vouch_address: str       # Address of deployed VouchProtocol
    min_tier: str            # Minimum required tier: "TRUSTED" or "MODERATE"
    transfer_count: u32      # Total successful transfers

    def __init__(self, vouch_contract_address: str, minimum_tier: str):
        self.vouch_address = vouch_contract_address
        self.min_tier = minimum_tier
        self.transfer_count = 0

    @gl.public.write
    def transfer_if_trusted(self, recipient_address: str) -> str:
        """Execute a transfer only if recipient meets trust requirements.
        Calls VouchProtocol.get_trust_tier() cross-contract."""
        tier = gl.ContractAt(self.vouch_address).get_trust_tier(recipient_address)

        allowed_tiers = ["TRUSTED"]
        if self.min_tier == "MODERATE":
            allowed_tiers.append("MODERATE")

        if tier not in allowed_tiers:
            raise Exception(
                f"Recipient trust tier '{tier}' does not meet minimum '{self.min_tier}'"
            )

        self.transfer_count += 1
        return json.dumps({
            "status": "approved",
            "recipient": recipient_address,
            "trust_tier": tier,
            "transfer_number": self.transfer_count,
        })

    @gl.public.view
    def get_transfer_count(self) -> str:
        return json.dumps({"transfer_count": self.transfer_count})
