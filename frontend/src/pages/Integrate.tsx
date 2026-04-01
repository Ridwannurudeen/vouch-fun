import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { contractAddress } from "../lib/genlayer";

const PYTHON_EXAMPLE = `# Inside your GenLayer contract:
import gl

class MyContract(gl.Contract):
    vouch_address: str  # Set to deployed VouchProtocol address

    @gl.public.write
    def do_something(self, user_address: str):
        # One line to check trust before allowing action
        tier = gl.ContractAt(self.vouch_address).get_trust_tier(user_address)
        if tier == "LOW" or tier == "UNKNOWN":
            raise Exception("User does not meet trust requirements")
        # Proceed with action...`;

const JS_EXAMPLE = `import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

// Read trust tier by address (free, no gas)
const tier = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_trust_tier",
  args: ["0x_RECIPIENT_ADDRESS"],
});

// Read full profile by handle (free, no gas)
const profile = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_profile_by_handle",
  args: ["torvalds"],
});`;

const COMPOSABILITY_EXAMPLE = `# AgentRegistry: gate agent registration by trust score
import gl

class AgentRegistry(gl.Contract):
    vouch_address: str
    agents: TreeMap[Address, str]

    @gl.public.write
    def register_agent(self, agent_name: str):
        tier = gl.ContractAt(self.vouch_address).get_trust_tier(gl.message.sender_account)
        if tier in ("LOW", "UNKNOWN"):
            raise Exception("Insufficient trust to register as agent")
        self.agents[gl.message.sender_account] = agent_name`;

const USE_CASES = [
  {
    app: "Rally",
    use: "Check creator trust before accepting campaign applications",
    call: 'get_trust_tier(creator_address) -> reject if LOW/UNKNOWN',
  },
  {
    app: "MergeProof",
    use: "Filter code reviewers by reputation",
    call: 'get_profile(reviewer_address) -> check code_activity.grade',
  },
  {
    app: "Internet Court",
    use: "Weight party credibility in disputes",
    call: 'get_profile(party_address) -> factor overall.trust_tier into verdict',
  },
];

const API_METHODS = [
  {
    sig: "get_trust_tier(address: str) -> str",
    desc: "Returns: TRUSTED | MODERATE | LOW | UNKNOWN",
    type: "read" as const,
  },
  {
    sig: "get_profile(address: str) -> str",
    desc: "Returns: Full JSON profile with grades, reasoning, and data (by address)",
    type: "read" as const,
  },
  {
    sig: "get_profile_by_handle(handle: str) -> str",
    desc: "Returns: Full JSON profile resolved by GitHub handle",
    type: "read" as const,
  },
  {
    sig: "lookup_address(handle: str) -> str",
    desc: "Returns: Wallet address associated with a GitHub handle",
    type: "read" as const,
  },
  {
    sig: "get_stats() -> str",
    desc: 'Returns: { "profile_count": int, "query_count": int, "dispute_count": int }',
    type: "read" as const,
  },
  {
    sig: "get_all_handles() -> str",
    desc: "Returns: JSON array of all registered GitHub handles",
    type: "read" as const,
  },
  {
    sig: "get_comparison(handle_a: str, handle_b: str) -> str",
    desc: "Returns: Stored comparison result with summary, winner, and reasoning",
    type: "read" as const,
  },
  {
    sig: "vouch(handle: str)",
    desc: "Triggers AI consensus to generate a new trust profile (requires GEN for gas)",
    type: "write" as const,
  },
  {
    sig: "refresh(handle: str)",
    desc: "Re-evaluates an existing profile via AI consensus (requires GEN for gas)",
    type: "write" as const,
  },
  {
    sig: "dispute(handle: str, reason: str)",
    desc: "Challenges a trust score for re-evaluation (requires GEN for gas)",
    type: "write" as const,
  },
  {
    sig: "compare(handle_a: str, handle_b: str)",
    desc: "Triggers AI consensus comparison of two profiles (requires GEN for gas)",
    type: "write" as const,
  },
];

export default function Integrate() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrate vouch.fun</h1>
        <p className="text-gray-500 mb-8">
          Add trust verification to your GenLayer contract in one call.
        </p>

        {/* Contract address */}
        {contractAddress && (
          <div className="mb-8 border border-indigo-200 bg-indigo-50 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-indigo-600 font-medium mb-1">Live Contract Address</div>
              <code className="text-sm font-mono text-gray-900 break-all">{contractAddress}</code>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Reference</h2>
          <div className="space-y-3">
            {API_METHODS.map((m) => (
              <div key={m.sig} className="border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 text-xs font-mono px-2 py-0.5 rounded ${
                  m.type === "write"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {m.type === "write" ? "write" : "read"}
                </span>
                <div>
                  <code className="text-sm font-mono text-blue-600">{m.sig}</code>
                  <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            From Another Contract (Python)
          </h2>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono">
            {PYTHON_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            From Frontend (TypeScript)
          </h2>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono">
            {JS_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Composable AgentRegistry Example
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Gate agent registration behind a trust check — any GenLayer contract can query vouch.fun as a composable oracle.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono">
            {COMPOSABILITY_EXAMPLE}
          </pre>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Integration Examples
          </h2>
          <div className="space-y-3">
            {USE_CASES.map((uc) => (
              <div key={uc.app} className="border border-gray-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900">{uc.app}</div>
                <div className="text-sm text-gray-600">{uc.use}</div>
                <code className="text-xs font-mono text-gray-400 mt-1 block">
                  {uc.call}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to try it?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Search any GitHub handle and see the trust profile generated by AI consensus.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Try vouch.fun
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
