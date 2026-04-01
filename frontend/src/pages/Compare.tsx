import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-mono text-sm">Loading profiles...</p>
          </div>
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
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium mb-2">Compare two developers side by side</p>
            <p className="text-sm text-gray-400 mb-6">See how trust profiles stack up across code activity and on-chain presence</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  setHandleA("vbuterin");
                  setHandleB("gakonst");
                  navigate("/compare/vbuterin/gakonst");
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono
                           hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                vbuterin <span className="text-gray-400">vs</span> gakonst
              </button>
              <button
                onClick={() => {
                  setHandleA("torvalds");
                  setHandleB("vbuterin");
                  navigate("/compare/torvalds/vbuterin");
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono
                           hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                torvalds <span className="text-gray-400">vs</span> vbuterin
              </button>
              <button
                onClick={() => {
                  setHandleA("haydenzadams");
                  setHandleB("samczsun");
                  navigate("/compare/haydenzadams/samczsun");
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono
                           hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                haydenzadams <span className="text-gray-400">vs</span> samczsun
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
