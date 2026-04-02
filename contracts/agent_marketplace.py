# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class AgentMarketplace(gl.Contract):
    """Trust-gated agent marketplace — only qualified agents can bid on jobs.
    Demonstrates the agentic economy use case: Agent A posts a job,
    only agents with B+ code grade on vouch.fun can bid."""
    vouch_address: str
    jobs_data: str
    bids_data: str
    job_count: u32
    completed_count: u32

    def __init__(self, vouch_address: str):
        self.vouch_address = vouch_address
        self.jobs_data = "{}"
        self.bids_data = "{}"
        self.job_count = 0
        self.completed_count = 0

    def _grade_val(self, g):
        return {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1, "N/A": 0}.get(g.upper(), 0)

    def _get_jobs(self):
        try:
            return json.loads(self.jobs_data)
        except:
            return {}

    def _set_jobs(self, j):
        self.jobs_data = json.dumps(j)

    def _get_bids(self):
        try:
            return json.loads(self.bids_data)
        except:
            return {}

    def _set_bids(self, b):
        self.bids_data = json.dumps(b)

    @gl.public.write
    def post_job(self, title: str, description: str, required_dimension: str, min_grade: str) -> str:
        """Post a job with trust requirements. Any dimension + grade threshold."""
        caller = str(gl.message.sender_account).lower()
        dim = required_dimension.strip().lower()
        if dim not in "code,onchain,social,governance,defi,identity".split(","):
            raise Exception(f"Invalid dimension: {dim}")
        grade = min_grade.strip().upper()
        if grade not in "A,B,C,D,F".split(","):
            raise Exception(f"Invalid grade: {grade}")

        job_id = str(self.job_count)
        jobs = self._get_jobs()
        jobs[job_id] = json.dumps({
            "id": job_id,
            "poster": caller,
            "title": title[:100],
            "description": description[:500],
            "required_dimension": dim,
            "min_grade": grade,
            "budget": gl.message.value,
            "status": "open",
            "winner": ""
        })
        self._set_jobs(jobs)
        self.job_count += 1

        return json.dumps({"status": "posted", "job_id": job_id, "title": title[:100], "dimension": dim, "min_grade": grade})

    @gl.public.write
    def bid(self, job_id: str, proposal: str) -> str:
        """Bid on a job — vouch.fun trust check enforced."""
        caller = str(gl.message.sender_account).lower()

        jobs = self._get_jobs()
        if job_id not in jobs:
            raise Exception("Job not found")

        job = json.loads(jobs[job_id])
        if job["status"] != "open":
            raise Exception("Job not open for bids")

        # Cross-contract trust check via vouch.fun
        vouch = gl.ContractAt(Address(self.vouch_address))
        dim_raw = str(vouch.get_dimension(caller, job["required_dimension"]))
        try:
            dim = json.loads(dim_raw)
            grade = dim.get("grade", "N/A")
            confidence = dim.get("confidence", "none")
        except:
            grade = "N/A"
            confidence = "none"

        if confidence == "none":
            raise Exception(f"No {job['required_dimension']} profile — vouch yourself first at vouch.fun")

        if self._grade_val(grade) < self._grade_val(job["min_grade"]):
            raise Exception(f"{job['required_dimension']} grade {grade} insufficient (need {job['min_grade']}+)")

        # Also get overall score for ranking
        score = int(vouch.get_trust_score(caller))

        # Store bid
        bids = self._get_bids()
        if job_id not in bids:
            bids[job_id] = "[]"
        job_bids = json.loads(bids[job_id])
        job_bids.append({
            "bidder": caller,
            "proposal": proposal[:300],
            "dimension_grade": grade,
            "trust_score": score,
            "confidence": confidence
        })
        bids[job_id] = json.dumps(job_bids)
        self._set_bids(bids)

        return json.dumps({
            "status": "bid_placed",
            "job_id": job_id,
            "grade": grade,
            "trust_score": score,
            "bid_count": len(job_bids)
        })

    @gl.public.write
    def award_job(self, job_id: str, winner: str) -> str:
        """Job poster awards to a bidder."""
        caller = str(gl.message.sender_account).lower()
        winner_addr = winner.strip().lower()

        jobs = self._get_jobs()
        if job_id not in jobs:
            raise Exception("Job not found")

        job = json.loads(jobs[job_id])
        if job["poster"] != caller:
            raise Exception("Only job poster can award")
        if job["status"] != "open":
            raise Exception("Job not open")

        # Verify winner actually bid
        bids = self._get_bids()
        job_bids = json.loads(bids.get(job_id, "[]"))
        bidders = [b["bidder"] for b in job_bids]
        if winner_addr not in bidders:
            raise Exception("Winner has not bid on this job")

        job["status"] = "awarded"
        job["winner"] = winner_addr
        jobs[job_id] = json.dumps(job)
        self._set_jobs(jobs)
        self.completed_count += 1

        return json.dumps({"status": "awarded", "job_id": job_id, "winner": winner_addr})

    @gl.public.view
    def get_job(self, job_id: str) -> str:
        jobs = self._get_jobs()
        return jobs.get(job_id, "{}")

    @gl.public.view
    def get_bids(self, job_id: str) -> str:
        bids = self._get_bids()
        return bids.get(job_id, "[]")

    @gl.public.view
    def get_open_jobs(self) -> str:
        jobs = self._get_jobs()
        open_jobs = []
        for jid, jdata in jobs.items():
            job = json.loads(jdata)
            if job["status"] == "open":
                open_jobs.append(job)
        return json.dumps(open_jobs)

    @gl.public.view
    def check_eligibility(self, address: str, job_id: str) -> str:
        """Check if an agent meets a job's trust requirements — shows composability."""
        a = address.strip().lower()
        jobs = self._get_jobs()
        if job_id not in jobs:
            return json.dumps({"eligible": False, "reason": "Job not found"})

        job = json.loads(jobs[job_id])
        vouch = gl.ContractAt(Address(self.vouch_address))
        dim_raw = str(vouch.get_dimension(a, job["required_dimension"]))
        score = int(vouch.get_trust_score(a))

        try:
            dim = json.loads(dim_raw)
            grade = dim.get("grade", "N/A")
            confidence = dim.get("confidence", "none")
        except:
            grade = "N/A"
            confidence = "none"

        eligible = (confidence != "none" and
                    self._grade_val(grade) >= self._grade_val(job["min_grade"]))

        return json.dumps({
            "eligible": eligible,
            "address": a,
            "dimension": job["required_dimension"],
            "grade": grade,
            "required": job["min_grade"],
            "trust_score": score,
            "job_title": job["title"]
        })

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({
            "total_jobs": self.job_count,
            "completed_jobs": self.completed_count,
            "vouch_address": self.vouch_address
        })
