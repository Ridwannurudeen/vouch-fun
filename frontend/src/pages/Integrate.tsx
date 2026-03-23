import Header from "../components/Header";

const PYTHON_EXAMPLE = `# Inside your GenLayer contract:
import gl

class MyContract(gl.Contract):
    vouch_address: str  # Set to deployed VouchProtocol address

    @gl.public.write
    def do_something(self, user_handle: str):
        # Check trust before allowing action
        tier = gl.call_contract(
            self.vouch_address,
            "get_trust_tier",
            [user_handle]
        )
        if tier == "LOW" or tier == "UNKNOWN":
            raise Exception("User does not meet trust requirements")
        # Proceed with action...`;

const JS_EXAMPLE = `import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

// Read trust tier (free, no gas)
const tier = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_trust_tier",
  args: ["torvalds"],
});

// Read full profile (free, no gas)
const profile = await client.readContract({
  address: "0x_VOUCH_CONTRACT_ADDRESS",
  functionName: "get_profile",
  args: ["torvalds"],
});`;

const USE_CASES = [
  {
    app: "Rally",
    use: "Check creator trust before accepting campaign applications",
    call: 'get_trust_tier(creator) -> reject if LOW/UNKNOWN',
  },
  {
    app: "MergeProof",
    use: "Filter code reviewers by reputation",
    call: 'get_profile(reviewer) -> check code_activity.grade',
  },
  {
    app: "Internet Court",
    use: "Weight party credibility in disputes",
    call: 'get_profile(party) -> factor overall.trust_tier into verdict',
  },
];

export default function Integrate() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrate vouch.fun</h1>
        <p className="text-gray-500 mb-8">
          Add trust verification to your GenLayer contract in one call.
        </p>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Reference</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <code className="text-sm font-mono text-blue-600">
                get_trust_tier(handle: str) -&gt; str
              </code>
              <p className="text-sm text-gray-500 mt-1">
                Returns: TRUSTED | MODERATE | LOW | UNKNOWN
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <code className="text-sm font-mono text-blue-600">
                get_profile(handle: str) -&gt; str
              </code>
              <p className="text-sm text-gray-500 mt-1">
                Returns: Full JSON profile with grades, reasoning, and data
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <code className="text-sm font-mono text-blue-600">
                get_stats() -&gt; str
              </code>
              <p className="text-sm text-gray-500 mt-1">
                Returns: {`{ "profile_count": int, "query_count": int }`}
              </p>
            </div>
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
      </main>
    </div>
  );
}
