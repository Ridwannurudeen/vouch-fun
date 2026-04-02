import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  listGates,
  gateInfo,
  gateCheck,
  trustQuery,
  trustBatchQuery,
  getDecayInfo,
  getProfileAge,
  contractAddress,
  chainName,
} from "../lib/genlayer";

const PRESET_GATES = [
  { name: "DevDAO", dimension: "code", minGrade: "B", desc: "Developer communities — requires code grade B+" },
  { name: "DeFi Vault", dimension: "defi", minGrade: "B", desc: "DeFi protocol access — requires DeFi grade B+" },
  { name: "Security Auditors", dimension: "code", minGrade: "A", desc: "Premium security talent — requires code grade A" },
  { name: "Agent Marketplace", dimension: "code", minGrade: "C", desc: "Agent listing — requires code grade C+" },
];

function GradeColor({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "text-green-400", B: "text-blue-400", C: "text-yellow-400",
    D: "text-orange-400", F: "text-red-400",
  };
  return <span className={`font-bold ${colors[grade] || "text-gray-400"}`}>{grade}</span>;
}

export default function Gates() {
  const [gates, setGates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Oracle query state
  const [oracleHandle, setOracleHandle] = useState("");
  const [oracleDim, setOracleDim] = useState("code");
  const [oracleGrade, setOracleGrade] = useState("B");
  const [oracleResult, setOracleResult] = useState<any>(null);
  const [oracleLoading, setOracleLoading] = useState(false);

  // Batch query state
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Gate check state
  const [checkHandle, setCheckHandle] = useState("");
  const [checkGate, setCheckGate] = useState("DevDAO");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  // Decay info
  const [decay, setDecay] = useState<any>(null);
  const [ageHandle, setAgeHandle] = useState("");
  const [ageResult, setAgeResult] = useState<any>(null);

  useEffect(() => {
    loadGates();
    getDecayInfo().then(setDecay);
  }, []);

  async function loadGates() {
    setLoading(true);
    try {
      const gateList = await listGates();
      const detailed = await Promise.all(
        gateList.map((g: any) => gateInfo(g.name))
      );
      setGates(detailed);
    } catch {
      setGates([]);
    }
    setLoading(false);
  }

  async function runOracleQuery() {
    if (!oracleHandle.trim()) return;
    setOracleLoading(true);
    setOracleResult(null);
    const result = await trustQuery(oracleHandle, oracleDim, oracleGrade);
    setOracleResult(result);
    setOracleLoading(false);
  }

  async function runBatchQuery() {
    setBatchLoading(true);
    setBatchResult(null);
    const handles = ["vbuterin", "gakonst", "torvalds", "samczsun", "ridwannurudeen"];
    const result = await trustBatchQuery(handles, "code", "B");
    setBatchResult(result);
    setBatchLoading(false);
  }

  async function runGateCheck() {
    if (!checkHandle.trim()) return;
    setCheckLoading(true);
    setCheckResult(null);
    const preset = PRESET_GATES.find(g => g.name === checkGate);
    const result = await gateCheck(checkHandle, preset?.dimension || "code", preset?.minGrade || "B");
    setCheckResult(result);
    setCheckLoading(false);
  }

  async function checkAge() {
    if (!ageHandle.trim()) return;
    const result = await getProfileAge(ageHandle);
    setAgeResult(result);
  }

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Trust Gates & Oracle</h1>
        <p className="text-gray-400 mb-8">
          Live composability demo — trust-gated communities, one-line oracle queries, and profile decay.
        </p>

        {/* Active Gates */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Active Trust Gates
          </h2>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading gates...</div>
          ) : gates.length === 0 ? (
            <div className="text-gray-500 text-sm">No gates deployed yet.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {gates.map((g) => {
                const preset = PRESET_GATES.find(p => p.name === g.gate);
                return (
                  <div key={g.gate} className="glass rounded-xl p-5 border border-glass-border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{g.gate}</h3>
                      <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                        {g.member_count} members
                      </span>
                    </div>
                    {preset && (
                      <p className="text-xs text-gray-400 mb-3">{preset.desc}</p>
                    )}
                    {g.members && Object.keys(g.members).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(g.members).map(([handle, info]: [string, any]) => (
                          <Link
                            key={handle}
                            to={`/profile/${handle}`}
                            className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded-md transition-colors"
                          >
                            {handle} <GradeColor grade={info.grade} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Gate eligibility checker */}
          <div className="mt-6 glass rounded-xl p-5 border border-glass-border">
            <h3 className="text-sm font-semibold text-white mb-3">Check Gate Eligibility</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="GitHub handle..."
                value={checkHandle}
                onChange={e => setCheckHandle(e.target.value)}
                className="flex-1 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              <select
                value={checkGate}
                onChange={e => setCheckGate(e.target.value)}
                className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {PRESET_GATES.map(g => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
              <button
                onClick={runGateCheck}
                disabled={checkLoading || !checkHandle.trim()}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-bright transition-colors disabled:opacity-50"
              >
                {checkLoading ? "Checking..." : "Check"}
              </button>
            </div>
            {checkResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${checkResult.eligible ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                <span className={checkResult.eligible ? "text-green-400" : "text-red-400"}>
                  {checkResult.eligible ? "ELIGIBLE" : "BLOCKED"}
                </span>
                {" — "}
                <span className="text-gray-300">
                  {checkResult.handle}: grade <GradeColor grade={checkResult.grade || "?"} />, required {checkResult.required}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Trust Oracle */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-1">Trust Oracle</h2>
          <p className="text-gray-500 text-sm mb-4">One-line integration — any agent calls <code className="text-accent text-xs">trust_query()</code> to get pass/fail with confidence.</p>

          <div className="glass rounded-xl p-5 border border-glass-border">
            <h3 className="text-sm font-semibold text-white mb-3">Query the Oracle</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Handle (e.g. gakonst)"
                value={oracleHandle}
                onChange={e => setOracleHandle(e.target.value)}
                className="flex-1 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              <select
                value={oracleDim}
                onChange={e => setOracleDim(e.target.value)}
                className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {["code", "onchain", "social", "governance", "defi", "identity"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={oracleGrade}
                onChange={e => setOracleGrade(e.target.value)}
                className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {["A", "B", "C", "D", "F"].map(g => (
                  <option key={g} value={g}>≥ {g}</option>
                ))}
              </select>
              <button
                onClick={runOracleQuery}
                disabled={oracleLoading || !oracleHandle.trim()}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-bright transition-colors disabled:opacity-50"
              >
                {oracleLoading ? "Querying..." : "Query"}
              </button>
            </div>
            {oracleResult && (
              <div className="mt-4 bg-black/30 rounded-lg p-4 font-mono text-xs">
                <div className="text-gray-500 mb-2">trust_query("{oracleResult.handle}", "{oracleResult.dimension}", "{oracleResult.required}")</div>
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-500">pass: </span>
                    <span className={oracleResult.pass ? "text-green-400" : "text-red-400"}>
                      {oracleResult.pass ? "true" : "false"}
                    </span>
                  </div>
                  <div><span className="text-gray-500">grade: </span><GradeColor grade={oracleResult.grade || "?"} /></div>
                  <div><span className="text-gray-500">confidence: </span><span className="text-gray-300">{oracleResult.confidence}</span></div>
                  <div><span className="text-gray-500">overall_score: </span><span className="text-gray-300">{oracleResult.overall_score}</span></div>
                  <div><span className="text-gray-500">overall_tier: </span><span className="text-gray-300">{oracleResult.overall_tier}</span></div>
                  <div><span className="text-gray-500">fresh: </span><span className={oracleResult.fresh ? "text-green-400" : "text-yellow-400"}>{String(oracleResult.fresh)}</span></div>
                  <div><span className="text-gray-500">age_days: </span><span className="text-gray-300">{oracleResult.age_days}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Batch query */}
          <div className="mt-4 glass rounded-xl p-5 border border-glass-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Batch Query (5 profiles, code ≥ B)</h3>
              <button
                onClick={runBatchQuery}
                disabled={batchLoading}
                className="px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                {batchLoading ? "Running..." : "Run Batch"}
              </button>
            </div>
            {batchResult && (
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">
                  Total: {batchResult.total} | Passed: <span className="text-green-400">{batchResult.passed}</span> | Failed: <span className="text-red-400">{batchResult.total - batchResult.passed}</span>
                </div>
                <div className="space-y-1">
                  {batchResult.results?.map((r: any) => (
                    <div key={r.handle} className="flex items-center gap-2 text-xs font-mono">
                      <span className={`w-12 ${r.pass ? "text-green-400" : "text-red-400"}`}>
                        {r.pass ? "PASS" : "FAIL"}
                      </span>
                      <Link to={`/profile/${r.handle}`} className="text-accent hover:text-accent-bright">{r.handle}</Link>
                      <span className="text-gray-500">grade:</span>
                      <GradeColor grade={r.grade} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Score Decay */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-1">Score Decay</h2>
          <p className="text-gray-500 text-sm mb-4">Profiles expire after {decay?.ttl_days || 90} days. Stale profiles get their trust tier downgraded. Refresh to restore.</p>

          <div className="glass rounded-xl p-5 border border-glass-border">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{decay?.ttl_days || 90}</div>
                <div className="text-xs text-gray-500">TTL (days)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">-1 tier</div>
                <div className="text-xs text-gray-500">Decay penalty</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">refresh()</div>
                <div className="text-xs text-gray-500">Restores tier</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-black/20 rounded-lg p-3">
              {decay?.decay_rule || "Profiles older than 90 days are downgraded one trust tier. Refresh to restore."}
            </div>

            {/* Profile age checker */}
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                placeholder="Check profile age..."
                value={ageHandle}
                onChange={e => setAgeHandle(e.target.value)}
                className="flex-1 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              <button
                onClick={checkAge}
                disabled={!ageHandle.trim()}
                className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                Check Age
              </button>
            </div>
            {ageResult && ageResult.handle && (
              <div className="mt-3 bg-black/30 rounded-lg p-3 text-xs font-mono space-y-1">
                <div><span className="text-gray-500">handle: </span><span className="text-gray-300">{ageResult.handle}</span></div>
                <div><span className="text-gray-500">age: </span><span className="text-gray-300">{ageResult.age_days} days ({ageResult.age_seconds}s)</span></div>
                <div>
                  <span className="text-gray-500">fresh: </span>
                  <span className={ageResult.fresh ? "text-green-400" : "text-red-400"}>
                    {ageResult.fresh ? "yes" : "EXPIRED"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Contract info */}
        <div className="glass rounded-xl p-5 border border-accent/20 text-center">
          <div className="text-xs text-gray-500 mb-1">Contract Address</div>
          <code className="text-sm font-mono text-accent break-all">{contractAddress}</code>
          <div className="text-xs text-green-400 mt-1 font-mono">{chainName}</div>
          <div className="mt-3 flex justify-center gap-3">
            <Link to="/integrate" className="text-xs text-gray-400 hover:text-white transition-colors">API Docs</Link>
            <Link to="/explore" className="text-xs text-gray-400 hover:text-white transition-colors">Explore Profiles</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
