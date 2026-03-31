import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TrustBadge from "../components/TrustBadge";
import GradeBar from "../components/GradeBar";
import RadarChart from "../components/RadarChart";
import { readProfileByHandle } from "../lib/genlayer";
import type { TrustProfile } from "../types";

export default function Compare() {
  const { a, b } = useParams<{ a?: string; b?: string }>();
  const navigate = useNavigate();
  const [handleA, setHandleA] = useState(a || "");
  const [handleB, setHandleB] = useState(b || "");
  const [profileA, setProfileA] = useState<TrustProfile | null>(null);
  const [profileB, setProfileB] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProfiles = async (ha: string, hb: string) => {
    if (!ha.trim() || !hb.trim()) return;
    setLoading(true);
    const [pa, pb] = await Promise.all([
      readProfileByHandle(ha.trim()),
      readProfileByHandle(hb.trim()),
    ]);
    setProfileA(pa);
    setProfileB(pb);
    setLoading(false);
  };

  useEffect(() => {
    if (a && b) {
      setHandleA(a);
      setHandleB(b);
      loadProfiles(a, b);
    }
  }, [a, b]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleA.trim() && handleB.trim()) {
      navigate(`/compare/${encodeURIComponent(handleA.trim())}/${encodeURIComponent(handleB.trim())}`);
      loadProfiles(handleA, handleB);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Profiles</h1>
          <p className="text-gray-500">Side-by-side trust assessment comparison</p>
        </div>

        {/* Search inputs */}
        <form onSubmit={handleSubmit} className="flex gap-4 max-w-2xl mx-auto mb-10">
          <input
            type="text"
            value={handleA}
            onChange={(e) => setHandleA(e.target.value)}
            placeholder="First handle"
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-mono
                       focus:border-gray-900 focus:outline-none"
          />
          <span className="self-center text-gray-400 font-bold">vs</span>
          <input
            type="text"
            value={handleB}
            onChange={(e) => setHandleB(e.target.value)}
            placeholder="Second handle"
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-mono
                       focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!handleA.trim() || !handleB.trim()}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium
                       hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
          >
            Compare
          </button>
        </form>

        {loading && (
          <div className="text-center py-12 text-gray-400 font-mono">Loading profiles...</div>
        )}

        {!loading && profileA && profileB && (
          <>
            {/* Side-by-side badges */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="text-center border border-gray-200 rounded-xl p-6 bg-white">
                <h3 className="text-xl font-bold font-mono text-gray-900 mb-2">
                  {profileA.handle}
                </h3>
                <TrustBadge tier={profileA.overall.trust_tier} />
                <p className="text-sm text-gray-500 mt-3">{profileA.overall.summary}</p>
                <div className="mt-4 space-y-2">
                  <GradeBar label="Code" grade={profileA.code_activity.grade} />
                  <GradeBar label="On-chain" grade={profileA.onchain_activity.grade} />
                </div>
              </div>

              <div className="text-center border border-gray-200 rounded-xl p-6 bg-white">
                <h3 className="text-xl font-bold font-mono text-gray-900 mb-2">
                  {profileB.handle}
                </h3>
                <TrustBadge tier={profileB.overall.trust_tier} />
                <p className="text-sm text-gray-500 mt-3">{profileB.overall.summary}</p>
                <div className="mt-4 space-y-2">
                  <GradeBar label="Code" grade={profileB.code_activity.grade} />
                  <GradeBar label="On-chain" grade={profileB.onchain_activity.grade} />
                </div>
              </div>
            </div>

            {/* Radar chart */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Metric Comparison
              </h3>
              <RadarChart profileA={profileA} profileB={profileB} />
            </div>

            {/* Stats comparison table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Metric</th>
                    <th className="px-4 py-3 text-right text-indigo-600 font-mono">
                      {profileA.handle}
                    </th>
                    <th className="px-4 py-3 text-right text-amber-600 font-mono">
                      {profileB.handle}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Repos", profileA.code_activity.repos, profileB.code_activity.repos],
                    ["Commits/yr", profileA.code_activity.commits_last_year, profileB.code_activity.commits_last_year],
                    ["Stars", profileA.code_activity.stars_received, profileB.code_activity.stars_received],
                    ["Tx Count", profileA.onchain_activity.tx_count, profileB.onchain_activity.tx_count],
                    ["Account Age (days)", profileA.onchain_activity.first_tx_age_days, profileB.onchain_activity.first_tx_age_days],
                    ["Contracts Deployed", profileA.onchain_activity.contracts_deployed, profileB.onchain_activity.contracts_deployed],
                  ].map(([label, valA, valB]) => (
                    <tr key={label as string} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-600">{label}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {typeof valA === "number" ? valA.toLocaleString() : valA}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {typeof valB === "number" ? valB.toLocaleString() : valB}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !profileA && !profileB && !a && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Enter two GitHub handles to compare their trust profiles</p>
            <div className="flex flex-wrap gap-2 justify-center text-xs font-mono text-gray-500">
              <button
                onClick={() => {
                  setHandleA("vbuterin");
                  setHandleB("gakonst");
                }}
                className="underline hover:text-gray-900"
              >
                vbuterin vs gakonst
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  setHandleA("torvalds");
                  setHandleB("vbuterin");
                }}
                className="underline hover:text-gray-900"
              >
                torvalds vs vbuterin
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
