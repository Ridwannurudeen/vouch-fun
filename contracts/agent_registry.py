# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class AgentRegistry(gl.Contract):
    vouch_address: str
    agents_data: str
    agent_count: u32

    def __init__(self, vouch_contract_address: str):
        self.vouch_address = vouch_contract_address
        self.agents_data = "{}"
        self.agent_count = 0

    @gl.public.write
    def register_agent(self, name: str, description: str) -> str:
        caller = str(gl.message.sender_account).lower()
        # Check trust tier via vouch.fun
        vouch = gl.ContractAt(self.vouch_address)
        tier = str(vouch.get_trust_tier(caller))
        if tier not in ("TRUSTED", "MODERATE"):
            raise Exception(f"Insufficient trust: {tier}. Need TRUSTED or MODERATE.")
        agents = self._get_agents()
        agents[caller] = json.dumps({
            "name": name[:100],
            "description": description[:500],
            "trust_tier": tier,
            "address": caller
        })
        self.agents_data = json.dumps(agents)
        self.agent_count += 1
        return agents[caller]

    @gl.public.view
    def get_agents(self) -> str:
        agents = self._get_agents()
        return json.dumps([json.loads(v) for v in agents.values()])

    @gl.public.view
    def get_agent(self, address: str) -> str:
        a = address.strip().lower()
        return self._get_agents().get(a, "{}")

    @gl.public.view
    def get_agent_count(self) -> str:
        return json.dumps({"agent_count": self.agent_count})

    def _get_agents(self) -> dict:
        try:
            return json.loads(self.agents_data)
        except Exception:
            return {}
