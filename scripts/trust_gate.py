# Depends: py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6
from genlayer import *
import json

@gl.contract
class TrustGate:
    """Composability demo: gate access based on vouch.fun trust grades.
    Requires code grade >= B to register. Shows how any protocol
    can use vouch.fun trust dimensions to gate access."""

    registered: str
    profiles_cache: str
    gate_name: str
    min_grade: str
    gate_dimension: str

    def __init__(self):
        self.registered = "{}"
        self.profiles_cache = "{}"
        self.gate_name = "Developer DAO Gate"
        self.min_grade = "B"
        self.gate_dimension = "code"

    def _gv(self, g: str) -> u32:
        m = {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1}
        return m.get(g.upper(), 0)

    @gl.public.write
    def submit_profile(self, handle: str, grade: str) -> str:
        h = handle.strip().lower()
        g = grade.strip().upper()
        if g not in ["A","B","C","D","F"]:
            return json.dumps({"status": "error", "reason": "Invalid grade"})
        try: cache = json.loads(self.profiles_cache)
        except: cache = {}
        cache[h] = {"grade": g, "by": str(gl.message.sender_address).lower()}
        self.profiles_cache = json.dumps(cache)
        return json.dumps({"status": "submitted", "handle": h, "grade": g})

    @gl.public.view
    def check_eligible(self, handle: str) -> str:
        h = handle.strip().lower()
        try: cache = json.loads(self.profiles_cache)
        except: cache = {}
        entry = cache.get(h)
        if not entry:
            return json.dumps({"eligible": False, "reason": "No profile", "handle": h})
        g = entry.get("grade", "F")
        ok = self._gv(g) >= self._gv(self.min_grade)
        return json.dumps({"eligible": ok, "handle": h, "grade": g, "required": self.min_grade, "gate": self.gate_name})

    @gl.public.write
    def register(self, handle: str) -> str:
        h = handle.strip().lower()
        try: reg = json.loads(self.registered)
        except: reg = {}
        if h in reg:
            return json.dumps({"status": "already_registered", "handle": h})
        try: cache = json.loads(self.profiles_cache)
        except: cache = {}
        entry = cache.get(h)
        if not entry:
            return json.dumps({"status": "rejected", "reason": "No profile"})
        g = entry.get("grade", "F")
        if self._gv(g) < self._gv(self.min_grade):
            return json.dumps({"status": "rejected", "reason": f"{g} < {self.min_grade}", "handle": h})
        reg[h] = {"grade": g, "by": str(gl.message.sender_address).lower()}
        self.registered = json.dumps(reg)
        return json.dumps({"status": "registered", "handle": h, "grade": g})

    @gl.public.view
    def get_registered(self) -> str:
        return self.registered

    @gl.public.view
    def get_gate_info(self) -> str:
        try: c = len(json.loads(self.registered))
        except: c = 0
        return json.dumps({"name": self.gate_name, "dimension": self.gate_dimension, "min_grade": self.min_grade, "registered_count": c})
