import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { contractAddress } from "../lib/genlayer";

const PYTHON_EXAMPLE = `# Inside your GenLayer contract:
from genlayer import *
import json

class MyContract(gl.Contract):
    vouch_address: str  # Set to deployed VouchProtocol address

    @gl.public.write
    def do_something(self, user_address: str):
        vouch = gl.ContractAt(Address(self.vouch_address))

        # Check overall trust tier
        tier = str(vouch.get_trust_tier(user_address))
        if tier in ("LOW", "UNKNOWN"):
            raise Exception("Insufficient trust")

        # Check specific dimension (code, onchain, social, governance, defi, identity)
        code_raw = str(vouch.get_dimension(user_address, "code"))
        code = json.loads(code_raw)
        if code.get("grade") == "F":
            raise Exception("Code reputation too low")

        # Check numeric score (0-100)
        score = int(str(vouch.get_trust_score(user_address)))
        if score < 50:
            raise Exception("Trust score below threshold")`;

const JS_EXAMPLE = `import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });
const VOUCH = "0x_VOUCH_CONTRACT_ADDRESS";

// Read trust tier (free, no gas)
const tier = await client.readContract({
  address: VOUCH,
  functionName: "get_trust_tier",
  args: ["0x_ADDRESS"],
});

// Read specific dimension (free, no gas)
const codeDim = await client.readContract({
  address: VOUCH,
  functionName: "get_dimension",
  args: ["0x_ADDRESS", "code"],
});

// Read numeric trust score (free, no gas)
const score = await client.readContract({
  address: VOUCH,
  functionName: "get_trust_score",
  args: ["0x_ADDRESS"],
});

// Read confidence level for a dimension
const confidence = await client.readContract({
  address: VOUCH,
  functionName: "get_confidence",
  args: ["0x_ADDRESS", "defi"],
});`;

const TRUSTGATE_EXAMPLE = `# TrustGate: dimension-gated registration (included in repo)
from genlayer import *
import json

class TrustGate(gl.Contract):
    vouch_address: str
    required_dimension: str   # e.g. "code"
    min_grade: str            # e.g. "B"

    def __init__(self, vouch_address, dimension, min_grade):
        self.vouch_address = vouch_address
        self.required_dimension = dimension
        self.min_grade = min_grade

    @gl.public.write
    def register(self, name: str) -> str:
        vouch = gl.ContractAt(Address(self.vouch_address))
        dim = json.loads(str(vouch.get_dimension(
            str(gl.message.sender_account), self.required_dimension
        )))
        grade = dim.get("grade", "N/A")
        if grade_val(grade) < grade_val(self.min_grade):
            raise Exception(f"Need {self.min_grade}+ in {self.required_dimension}")
        # Register user...`;

const USE_CASES = [
  {
    app: "Agent Marketplace",
    use: "Gate agent registration by code dimension grade",
    call: 'get_dimension(addr, "code") -> reject if grade < B',
  },
  {
    app: "DeFi Protocol",
    use: "Check DeFi experience before large swaps",
    call: 'get_dimension(addr, "defi") -> check confidence level',
  },
  {
    app: "DAO Governance",
    use: "Weight voting power by governance dimension",
    call: 'get_dimension(addr, "governance") -> adjust vote weight',
  },
  {
    app: "Social dApp",
    use: "Filter content creators by social reputation",
    call: 'get_dimension(addr, "social") -> check grade >= C',
  },
];

const API_METHODS = [
  { sig: "get_trust_tier(address) -> str", desc: "Returns: TRUSTED | MODERATE | LOW | UNKNOWN", type: "read" as const },
  { sig: "get_trust_score(address) -> u32", desc: "Returns: 0-100 numeric trust score", type: "read" as const },
  { sig: "get_dimension(address, dimension) -> str", desc: "Returns: JSON with grade, confidence, reasoning, key_signals for one dimension", type: "read" as const },
  { sig: "get_confidence(address, dimension) -> str", desc: "Returns: high | medium | low | none", type: "read" as const },
  { sig: "get_profile(address) -> str", desc: "Returns: Full JSON profile with all 6 dimensions + overall", type: "read" as const },
  { sig: "get_profile_by_handle(identifier) -> str", desc: "Returns: Full profile resolved by GitHub/ENS/Twitter handle", type: "read" as const },
  { sig: "lookup_address(identifier) -> str", desc: "Returns: Wallet address for an identifier", type: "read" as const },
  { sig: "get_all_handles() -> str", desc: "Returns: JSON array of all registered identifiers", type: "read" as const },
  { sig: "get_stats() -> str", desc: "Returns: { profile_count, query_count, dispute_count, fee_pool }", type: "read" as const },
  { sig: "get_comparison(id_a, id_b) -> str", desc: "Returns: Stored comparison result", type: "read" as const },
  { sig: "get_stakes(identifier) -> str", desc: "Returns: Active stakes per dimension for an identifier", type: "read" as const },
  { sig: "get_fee_pool() -> str", desc: "Returns: { fee_pool, query_fee, min_stake }", type: "read" as const },
  { sig: "vouch(identifier)", desc: "Synthesize trust profile from real web data via AI consensus (fee: 1000 wei)", type: "write" as const },
  { sig: "refresh(identifier)", desc: "Re-evaluate with fresh web data (fee: 1000 wei)", type: "write" as const },
  { sig: "stake_vouch(identifier, dimension, grade)", desc: "Stake tokens endorsing a grade \u2014 slashed on dispute (min: 5000 wei)", type: "write" as const },
  { sig: "dispute(identifier, reason)", desc: "Challenge a score \u2014 triggers re-evaluation + stake slashing", type: "write" as const },
  { sig: "compare(id_a, id_b)", desc: "AI consensus synthesis comparing two profiles", type: "write" as const },
  { sig: "seed_profile(identifier, profile_json)", desc: "Seed a pre-computed profile", type: "write" as const },
];

export default function Integrate() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Integrate vouch.fun</h1>
        <p className="text-gray-400 mb-8">
          Add 6-dimension trust synthesis checks to your GenLayer contract. Query trust tiers, specific dimensions, numeric scores, or confidence levels.
        </p>

        {/* Contract address */}
        {contractAddress && (
          <div className="mb-8 glass rounded-xl p-4 flex items-center justify-between gap-4 border border-accent/20">
            <div>
              <div className="text-xs text-accent font-medium mb-1">Live Contract Address</div>
              <code className="text-sm font-mono text-gray-300 break-all">{contractAddress}</code>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-bright transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">API Reference</h2>
          <div className="space-y-2">
            {API_METHODS.map((m) => (
              <div key={m.sig} className="glass rounded-lg p-3 flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 text-xs font-mono px-2 py-0.5 rounded ${
                  m.type === "write"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-green-500/15 text-green-400"
                }`}>
                  {m.type}
                </span>
                <div>
                  <code className="text-sm font-mono text-accent-bright">{m.sig}</code>
                  <p className="text-sm text-gray-500 mt-0.5">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            From Another Contract (Python)
          </h2>
          <pre className="bg-tn-bg text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono border border-glass-border">
            {PYTHON_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            From Frontend (TypeScript)
          </h2>
          <pre className="bg-tn-bg text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono border border-glass-border">
            {JS_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            TrustGate: Dimension-Gated Registration
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Gate access behind specific trust dimensions. Require a minimum code grade for developer tools,
            DeFi experience for protocols, or governance participation for DAOs.
          </p>
          <pre className="bg-tn-bg text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono border border-glass-border">
            {TRUSTGATE_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Use Cases by Dimension
          </h2>
          <div className="space-y-3">
            {USE_CASES.map((uc) => (
              <div key={uc.app} className="glass rounded-lg p-4">
                <div className="font-semibold text-white">{uc.app}</div>
                <div className="text-sm text-gray-400">{uc.use}</div>
                <code className="text-xs font-mono text-gray-500 mt-1 block">
                  {uc.call}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="glass rounded-2xl p-8 text-center border border-accent/20">
          <h2 className="text-xl font-bold text-white mb-2">Ready to try it?</h2>
          <p className="text-sm text-gray-400 mb-4">
            Search any identifier and see a 6-dimension trust profile synthesized by AI consensus.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-bright transition-colors"
          >
            Try vouch.fun
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

