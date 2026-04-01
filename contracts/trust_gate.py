# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class TrustGate(gl.Contract):
    """Dimension-gated registration — composability demo for vouch.fun.
    Any contract can gate actions behind a specific trust dimension check."""
    vouch_address: str
    required_dimension: str
    min_grade: str
    registrations: str
    reg_count: u32

    def __init__(self, vouch_address: str, dimension: str, min_grade: str):
        self.vouch_address = vouch_address
        self.required_dimension = dimension.strip().lower()
        self.min_grade = min_grade.strip().upper()
        self.registrations = "{}"
        self.reg_count = 0

    def _grade_val(self, g):
        return {"A":5,"B":4,"C":3,"D":2,"F":1,"N/A":0}.get(g.upper(),0)

    @gl.public.write
    def register(self, name: str) -> str:
        caller = str(gl.message.sender_account).lower()
        # Cross-contract call to vouch.fun
        vouch = gl.ContractAt(Address(self.vouch_address))
        dim_raw = str(vouch.get_dimension(caller, self.required_dimension))
        try:
            dim = json.loads(dim_raw)
            grade = dim.get("grade", "N/A")
            confidence = dim.get("confidence", "none")
        except:
            grade = "N/A"
            confidence = "none"
        if confidence == "none":
            raise Exception(f"No {self.required_dimension} data for your address")
        if self._grade_val(grade) < self._grade_val(self.min_grade):
            raise Exception(f"Insufficient {self.required_dimension}: {grade} (need {self.min_grade}+)")
        regs = json.loads(self.registrations) if self.registrations != "{}" else {}
        regs[caller] = json.dumps({"name": name, "grade": grade, "confidence": confidence})
        self.registrations = json.dumps(regs)
        self.reg_count += 1
        return json.dumps({"status": "registered", "name": name, "dimension": self.required_dimension, "grade": grade})

    @gl.public.view
    def get_registrations(self) -> str:
        return self.registrations

    @gl.public.view
    def get_config(self) -> str:
        return json.dumps({
            "vouch_address": self.vouch_address,
            "required_dimension": self.required_dimension,
            "min_grade": self.min_grade,
            "registration_count": self.reg_count
        })

    @gl.public.view
    def is_registered(self, address: str) -> str:
        regs = json.loads(self.registrations) if self.registrations != "{}" else {}
        return regs.get(address.strip().lower(), "{}")
