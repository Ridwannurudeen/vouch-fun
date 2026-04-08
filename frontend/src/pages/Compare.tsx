import { useState, useEffect, Suspense, lazy } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TrustBadge from "../components/TrustBadge";
import GradeBar from "../components/GradeBar";
import { readProfileByHandle } from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

const RadarChart = lazy(() => import("../components/RadarChart"));

const GRADE_RANK: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1, "N/A": 0 };

function ChartFallback() {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-gray-700 border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-mono text-sm">Loading chart...</p>
      </div>
    </div>
  );
}

function normalizeIdentifier(raw: string) {
  let value = decodeURIComponent(raw).trim();
  value = value.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  value = value.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "@");
  value = value.replace(/\/$/, "");
  if (value.startsWith("0x") && value.length === 42) return value.toLowerCase();
  if (value.endsWith(".eth")) return value.toLowerCase();
  if (value.startsWith("@")) return `@${value.slice(1).toLowerCase()}`;
  return value;
}

function getProfileId(profile: TrustProfile | null, fallback: string) {
  return profile?.identifier || (profile as any)?.handle || fallback;
}

export default function Compare() {
  const { a, b } = useParams<{ a?: string; b?: string }>();
  const navigate = useNavigate();
  const [handleA, setHandleA] = useState(a || "");
  const [handleB, setHandleB] = useState(b || "");
  const [profileA, setProfileA] = useState<TrustProfile | null>(null);
  const [profileB, setProfileB] = useState<TrustProfile | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProfiles = async (ha: string, hb: string) => {
    const normalizedA = normalizeIdentifier(ha);
    const normalizedB = normalizeIdentifier(hb);
    if (!normalizedA || !normalizedB) return;

    setLoading(true);
    setError("");
    setMissing([]);

    try {
      const [pa, pb] = await Promise.all([
        readProfileByHandle(normalizedA),
        readProfileByHandle(normalizedB),
      ]);

      setProfileA(pa);
      setProfileB(pb);

      const nextMissing: string[] = [];
      if (!pa) nextMissing.push(normalizedA);
      if (!pb) nextMissing.push(normalizedB);
      setMissing(nextMissing);

      if (nextMissing.length > 0) {
        setError(
          nextMissing.length === 2
            ? "Neither identifier has a stored trust profile yet."
            : `No stored trust profile found for ${nextMissing[0]}.`
        );
      }
    } catch {
      setProfileA(null);
      setProfileB(null);
      setMissing([normalizedA, normalizedB]);
      setError("Failed to load comparison profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (a && b) {
      const normalizedA = normalizeIdentifier(a);
      const normalizedB = normalizeIdentifier(b);
      setHandleA(normalizedA);
      setHandleB(normalizedB);
      loadProfiles(normalizedA, normalizedB);
    }
  }, [a, b]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedA = normalizeIdentifier(handleA);
    const normalizedB = normalizeIdentifier(handleB);
    if (normalizedA && normalizedB) {
      setHandleA(normalizedA);
      setHandleB(normalizedB);
      navigate(`/compare/${encodeURIComponent(normalizedA)}/${encodeURIComponent(normalizedB)}`);
      loadProfiles(normalizedA, normalizedB);
    }
  };

  const idA = getProfileId(profileA, handleA);
  const idB = getProfileId(profileB, handleB);

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Compare Profiles</h1>
          <p className="text-gray-400">Side-by-side 6-dimension trust comparison</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4 max-w-2xl mx-auto mb-10">
          <input
            type="text"
            value={handleA}
            onChange={(e) => setHandleA(e.target.value)}
            placeholder="First identifier"
            className="flex-1 px-4 py-3 bg-white/5 border-2 border-glass-border rounded-xl font-mono text-white
                       placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
          />
          <span className="self-center text-gray-500 font-bold">vs</span>
          <input
            type="text"
            value={handleB}
            onChange={(e) => setHandleB(e.target.value)}
            placeholder="Second identifier"
            className="flex-1 px-4 py-3 bg-white/5 border-2 border-glass-border rounded-xl font-mono text-white
                       placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!handleA.trim() || !handleB.trim()}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium
                       hover:bg-accent-bright disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
          >
            Compare
          </button>
        </form>

        {error && !loading && (
          <div className="glass rounded-xl p-5 mb-8 border border-amber-500/20">
            <p className="text-amber-300 font-medium mb-2">Comparison needs complete profiles</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            {missing.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {missing.map((identifier) => (
                  <Link
                    key={identifier}
                    to={`/profile/${encodeURIComponent(identifier)}`}
                    className="text-sm px-4 py-2 glass glass-hover rounded-lg text-accent"
                  >
                    Open {identifier}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gray-700 border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-mono text-sm">Loading profiles...</p>
          </div>
        )}

        {!loading && profileA && profileB && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="text-center glass rounded-xl p-6">
                <h3 className="text-xl font-bold font-mono text-white mb-2">
                  {idA}
                </h3>
                <TrustBadge tier={profileA.overall.trust_tier} />
                {profileA.overall.trust_score != null && (
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {profileA.overall.trust_score}<span className="text-sm text-gray-500">/100</span>
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-3">{profileA.overall.summary}</p>
                <div className="mt-4 space-y-2">
                  {DIMENSIONS.map((dim: DimensionKey) => {
                    const d = profileA[dim];
                    if (!d) return null;
                    return <GradeBar key={dim} label={DIMENSION_LABELS[dim]} grade={d.grade} />;
                  })}
                </div>
              </div>

              <div className="text-center glass rounded-xl p-6">
                <h3 className="text-xl font-bold font-mono text-white mb-2">
                  {idB}
                </h3>
                <TrustBadge tier={profileB.overall.trust_tier} />
                {profileB.overall.trust_score != null && (
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {profileB.overall.trust_score}<span className="text-sm text-gray-500">/100</span>
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-3">{profileB.overall.summary}</p>
                <div className="mt-4 space-y-2">
                  {DIMENSIONS.map((dim: DimensionKey) => {
                    const d = profileB[dim];
                    if (!d) return null;
                    return <GradeBar key={dim} label={DIMENSION_LABELS[dim]} grade={d.grade} />;
                  })}
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-white mb-4 text-center">
                6-Dimension Comparison
              </h3>
              <Suspense fallback={<ChartFallback />}>
                <RadarChart profileA={profileA} profileB={profileB} />
              </Suspense>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Dimension</th>
                    <th className="px-4 py-3 text-center text-accent font-mono">{idA}</th>
                    <th className="px-4 py-3 text-center text-amber-400 font-mono">{idB}</th>
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((dim: DimensionKey) => {
                    const dA = profileA[dim];
                    const dB = profileB[dim];
                    const gradeA = dA?.grade || "N/A";
                    const gradeB = dB?.grade || "N/A";
                    const rankA = GRADE_RANK[gradeA] ?? 0;
                    const rankB = GRADE_RANK[gradeB] ?? 0;
                    const aWins = rankA > rankB;
                    const bWins = rankB > rankA;
                    return (
                      <tr key={dim} className="border-b border-glass-border">
                        <td className="px-4 py-3 text-gray-400 font-medium">
                          {DIMENSION_LABELS[dim]}
                          {rankA === rankB && rankA > 0 && (
                            <span className="ml-2 text-xs text-gray-500">=</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-center ${aWins ? "bg-accent/10" : ""}`}>
                          <span className="font-mono font-bold text-white">{gradeA}</span>
                          {dA?.confidence && (
                            <span className="ml-1 text-xs text-gray-500">({dA.confidence})</span>
                          )}
                          {aWins && <span className="ml-1.5 text-accent text-xs">✓</span>}
                        </td>
                        <td className={`px-4 py-3 text-center ${bWins ? "bg-amber-400/10" : ""}`}>
                          <span className="font-mono font-bold text-white">{gradeB}</span>
                          {dB?.confidence && (
                            <span className="ml-1 text-xs text-gray-500">({dB.confidence})</span>
                          )}
                          {bWins && <span className="ml-1.5 text-amber-400 text-xs">✓</span>}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-white/[0.02] font-bold">
                    <td className="px-4 py-3 text-white">Overall Score</td>
                    <td className="px-4 py-3 text-center font-mono text-accent">
                      {profileA.overall.trust_score}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-amber-400">
                      {profileB.overall.trust_score}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {(() => {
              let winsA = 0;
              let winsB = 0;
              for (const dim of DIMENSIONS) {
                const rankA = GRADE_RANK[profileA[dim]?.grade || "N/A"] ?? 0;
                const rankB = GRADE_RANK[profileB[dim]?.grade || "N/A"] ?? 0;
                if (rankA > rankB) winsA++;
                else if (rankB > rankA) winsB++;
              }
              const total = DIMENSIONS.length;
              const tied = winsA === winsB;
              return (
                <div className="glass rounded-xl p-6 mt-8 text-center">
                  <h3 className="text-lg font-bold text-white mb-3">Verdict</h3>
                  <div className="flex items-center justify-center gap-6 mb-3 font-mono text-xl">
                    <span className={`font-bold ${winsA >= winsB ? "text-accent" : "text-gray-500"}`}>
                      {idA}: {winsA}
                    </span>
                    <span className="text-gray-600">—</span>
                    <span className={`font-bold ${winsB >= winsA ? "text-amber-400" : "text-gray-500"}`}>
                      {winsB}: {idB}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    {tied
                      ? `Tie: ${winsA}-${winsB} across ${total} dimensions`
                      : `${winsA > winsB ? idA : idB} wins ${Math.max(winsA, winsB)}/${total} dimensions`}
                  </p>
                  <p className="text-base font-bold font-mono mt-1">
                    {tied ? (
                      <span className="text-gray-300">Dead heat</span>
                    ) : winsA > winsB ? (
                      <span className="text-accent">{idA} leads in trust</span>
                    ) : (
                      <span className="text-amber-400">{idB} leads in trust</span>
                    )}
                  </p>
                </div>
              );
            })()}
          </>
        )}

        {!loading && !profileA && !profileB && !a && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-accent-dim flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium mb-2">Compare two identities side by side</p>
            <p className="text-sm text-gray-500 mb-6">See how trust profiles stack up across all 6 dimensions</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  setHandleA("vbuterin");
                  setHandleB("torvalds");
                  navigate("/compare/vbuterin/torvalds");
                }}
                className="px-4 py-2.5 glass glass-hover rounded-lg text-sm font-mono transition-colors"
              >
                vbuterin <span className="text-gray-500">vs</span> torvalds
              </button>
              <button
                onClick={() => {
                  setHandleA("haydenzadams");
                  setHandleB("samczsun");
                  navigate("/compare/haydenzadams/samczsun");
                }}
                className="px-4 py-2.5 glass glass-hover rounded-lg text-sm font-mono transition-colors"
              >
                haydenzadams <span className="text-gray-500">vs</span> samczsun
              </button>
              <button
                onClick={() => {
                  setHandleA("gakonst");
                  setHandleB("ridwannurudeen");
                  navigate("/compare/gakonst/ridwannurudeen");
                }}
                className="px-4 py-2.5 glass glass-hover rounded-lg text-sm font-mono transition-colors"
              >
                gakonst <span className="text-gray-500">vs</span> ridwannurudeen
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
