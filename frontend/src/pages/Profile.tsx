import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TrustBadge from "../components/TrustBadge";
import GradeCard from "../components/GradeCard";
import GradeBar from "../components/GradeBar";
import RadarChart from "../components/RadarChart";
import ConsensusAnimation from "../components/ConsensusAnimation";
import DisputeModal from "../components/DisputeModal";
import {
  readProfile,
  readProfileByHandle,
  generateProfile,
  refreshProfile,
  stakeVouch,
  getStakes,
  hasFundedAccount,
  MIN_STAKE,
} from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="text-center mb-8">
        <div className="h-8 bg-white/5 rounded w-48 mx-auto mb-3" />
        <div className="h-6 bg-white/5 rounded w-24 mx-auto mb-3" />
        <div className="h-4 bg-white/5 rounded w-80 mx-auto mb-2" />
        <div className="h-4 bg-white/5 rounded w-64 mx-auto" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-5">
            <div className="h-5 bg-white/5 rounded w-32 mb-3" />
            <div className="h-8 bg-white/5 rounded w-12 mb-3" />
            <div className="h-3 bg-white/5 rounded w-full mb-2" />
            <div className="h-3 bg-white/5 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function cleanHandle(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let h = decodeURIComponent(raw).trim();
  h = h.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  // Convert Twitter/X URLs to @handle format
  const twitterMatch = h.match(/^https?:\/\/(www\.)?(twitter|x)\.com\/([^/]+)\/?$/i);
  if (twitterMatch) {
    h = "@" + twitterMatch[3];
  }
  h = h.replace(/\/$/, "");
  return h || raw;
}

export default function Profile() {
  const { handle: rawHandle } = useParams<{ handle: string }>();
  const handle = cleanHandle(rawHandle);
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stakes, setStakes] = useState<Record<string, any[]>>({});
  const [staking, setStaking] = useState(false);
  const [stakeDim, setStakeDim] = useState<DimensionKey>("code");
  const [stakeGrade, setStakeGrade] = useState("B");

  const isAddress = handle?.startsWith("0x") && handle.length === 42;

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError("");

    const fetchProfile = isAddress
      ? readProfile(handle)
      : readProfileByHandle(handle);

    fetchProfile
      .then((p) => {
        if (p && p.overall) {
          setProfile(p);
        } else {
          setProfile(null);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [handle, isAddress]);

  useEffect(() => {
    if (generating) {
      setSlow(false);
      slowTimer.current = setTimeout(() => setSlow(true), 90000);
    } else {
      setSlow(false);
      clearTimeout(slowTimer.current);
    }
    return () => clearTimeout(slowTimer.current);
  }, [generating]);

  const handleGenerate = async () => {
    if (!handle || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await generateProfile(handle);
      const p = await readProfileByHandle(handle);
      if (p && p.overall) setProfile(p);
    } catch (err: any) {
      setError(err.message || "Failed to generate profile");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    if (!handle || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await refreshProfile(handle);
      const p = await readProfileByHandle(handle);
      if (p && p.overall) setProfile(p);
    } catch (err: any) {
      setError(err.message || "Failed to refresh profile");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (profile?.identifier) {
      getStakes(profile.identifier).then(setStakes).catch(() => {});
    }
  }, [profile]);

  const handleStake = async () => {
    if (!profile?.identifier || staking) return;
    setStaking(true);
    try {
      await stakeVouch(profile.identifier, stakeDim, stakeGrade, MIN_STAKE);
      const s = await getStakes(profile.identifier);
      setStakes(s);
    } catch (err: any) {
      setError(err.message || "Staking failed");
    } finally {
      setStaking(false);
    }
  };

  const totalStakes = Object.values(stakes).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
  );

  const handleCopyUrl = () => {
    const url = window.location.href;
    const text = profile
      ? `My vouch.fun trust score: ${profile.overall.trust_score}/100 (${profile.overall.trust_tier}) — ${profile.overall.summary}\n\nGet yours:`
      : "";
    if (navigator.share && profile) {
      navigator.share({ title: "My Vouch Score", text, url }).catch(() => {
        navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(profile ? `${text} ${url}` : url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const profileId = profile?.identifier || (profile as any)?.handle || handle || "";

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <ProfileSkeleton />
        ) : generating ? (
          <div className="py-8">
            <ConsensusAnimation />
            {slow && (
              <p className="text-center text-amber-400 text-sm mt-4">
                Taking longer than expected... Validators are still working on this one.
              </p>
            )}
          </div>
        ) : profile ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-mono text-white mb-2">
                {profileId}
              </h1>
              <TrustBadge tier={profile.overall.trust_tier} />

              {/* Trust score */}
              {profile.overall.trust_score != null && (
                <div className="mt-3">
                  <span className="text-4xl font-bold text-white font-mono">
                    {profile.overall.trust_score}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">/100</span>
                </div>
              )}

              {/* Verified badge */}
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-accent bg-accent-dim px-3 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified by AI Consensus
                </span>
                {profile.identifier_type && (
                  <span className="ml-2 text-xs text-gray-500 font-mono">
                    {profile.identifier_type}
                  </span>
                )}
              </div>

              <p className="text-gray-400 mt-3 max-w-lg mx-auto">
                {profile.overall.summary}
              </p>

              {/* Top signals */}
              {profile.overall.top_signals && profile.overall.top_signals.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {profile.overall.top_signals.map((signal, i) => (
                    <span key={i} className="text-xs bg-accent-dim text-accent px-2.5 py-1 rounded-full font-medium">
                      {signal}
                    </span>
                  ))}
                </div>
              )}

              {/* Data Sources */}
              {(() => {
                const srcs = profile.sources || profile.sources_scraped || [];
                if (srcs.length === 0) return null;
                const SOURCE_DISPLAY: Record<string, { label: string; color: string }> = {
                  github_api: { label: "GitHub", color: "bg-gray-700 text-gray-200" },
                  npm_registry: { label: "npm", color: "bg-red-500/20 text-red-300" },
                  etherscan: { label: "Etherscan", color: "bg-blue-500/20 text-blue-300" },
                  farcaster: { label: "Farcaster", color: "bg-purple-500/20 text-purple-300" },
                  lens: { label: "Lens", color: "bg-green-500/20 text-green-300" },
                  tally: { label: "Tally", color: "bg-indigo-500/20 text-indigo-300" },
                  defillama: { label: "DefiLlama", color: "bg-sky-500/20 text-sky-300" },
                  twitter: { label: "Twitter/X", color: "bg-sky-500/20 text-sky-300" },
                  nitter: { label: "Nitter", color: "bg-sky-400/20 text-sky-200" },
                  debank: { label: "DeBank", color: "bg-orange-500/20 text-orange-300" },
                  snapshot: { label: "Snapshot", color: "bg-amber-500/20 text-amber-300" },
                  ensdata: { label: "ENS", color: "bg-indigo-400/20 text-indigo-200" },
                  ai_consensus: { label: "AI Consensus", color: "bg-accent-dim text-accent" },
                  ai_leader: { label: "AI Leader", color: "bg-accent-dim text-accent" },
                  seed: { label: "Seed Data", color: "bg-amber-500/15 text-amber-400" },
                };
                return (
                  <div className="mt-3">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono block mb-1.5">Data Sources</span>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {srcs.map((s) => {
                        const info = SOURCE_DISPLAY[s] || { label: s, color: "bg-white/5 text-gray-400" };
                        return (
                          <span key={s} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${info.color}`}>
                            {info.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {profile.vouched_by && (
                <div className="text-xs text-gray-600 mt-1 font-mono">
                  Vouched by: {profile.vouched_by}
                </div>
              )}

              {/* Dispute notice */}
              {profile.disputed && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full">
                  Disputed: {profile.dispute_reason}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={handleCopyUrl}
                  className="text-xs px-3 py-1.5 glass glass-hover rounded-lg text-gray-400 transition-colors"
                >
                  {copied ? "Copied!" : "Share"}
                </button>
                {!isAddress && (
                  <Link
                    to={`/compare/${handle}`}
                    className="text-xs px-3 py-1.5 glass glass-hover rounded-lg text-gray-400 transition-colors"
                  >
                    Compare with...
                  </Link>
                )}
                {!isAddress && (
                  <button
                    onClick={() => setShowDispute(true)}
                    className="text-xs px-3 py-1.5 border border-red-500/30 rounded-lg
                               hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    Challenge This Score
                  </button>
                )}
              </div>
            </div>

            {/* Radar chart */}
            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-white mb-2 text-center">Trust Dimensions</h3>
              <RadarChart profileA={profile} />
            </div>

            {/* Grade bars overview */}
            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">Grade Overview</h3>
              <div className="space-y-3">
                {DIMENSIONS.map((dim: DimensionKey) => {
                  const d = profile[dim];
                  if (!d) return null;
                  return <GradeBar key={dim} label={DIMENSION_LABELS[dim]} grade={d.grade} />;
                })}
              </div>
            </div>

            {/* Dimension cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {DIMENSIONS.map((dim: DimensionKey) => {
                const d = profile[dim];
                if (!d) return null;
                return (
                  <GradeCard
                    key={dim}
                    title={DIMENSION_LABELS[dim]}
                    dimension={dim}
                    score={d}
                  />
                );
              })}
            </div>

            {/* Stake section */}
            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-white mb-1">Stake Your Assessment</h3>
              <p className="text-xs text-gray-500 mb-4">
                Put skin in the game &mdash; stake tokens endorsing a grade. Wrong stakes get slashed on dispute.
                {totalStakes > 0 && <span className="ml-2 text-accent font-medium">{totalStakes} active stakes</span>}
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Dimension</label>
                  <select
                    value={stakeDim}
                    onChange={(e) => setStakeDim(e.target.value as DimensionKey)}
                    className="text-sm border border-glass-border rounded-lg px-3 py-2 bg-void-light text-gray-300"
                  >
                    {DIMENSIONS.map((d) => (
                      <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grade</label>
                  <select
                    value={stakeGrade}
                    onChange={(e) => setStakeGrade(e.target.value)}
                    className="text-sm border border-glass-border rounded-lg px-3 py-2 bg-void-light text-gray-300"
                  >
                    {["A","B","C","D","F"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleStake}
                  disabled={staking || !hasFundedAccount}
                  className="text-sm px-4 py-2 bg-accent text-white rounded-lg font-medium
                             hover:bg-accent-bright disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                >
                  {staking ? "Staking..." : "Endorse Grade"}
                </button>
              </div>
              {/* Active stakes */}
              {totalStakes > 0 && (
                <div className="mt-4 border-t border-glass-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stakes).map(([dim, entries]) =>
                      Array.isArray(entries) ? entries.map((s, i) => (
                        <span key={`${dim}-${i}`} className="text-xs bg-accent-dim text-accent px-2 py-1 rounded font-mono">
                          {DIMENSION_LABELS[dim as DimensionKey] || dim}: {s.grade} ({s.amount} wei)
                        </span>
                      )) : null
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Related actions */}
            <div className="glass rounded-xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-white mb-4">What's next?</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {!isAddress && (
                  <Link
                    to={`/compare/${handle}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-glass-border
                               hover:border-accent/30 hover:bg-accent-dim transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-dim text-accent flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Compare</div>
                      <div className="text-xs text-gray-500">Side-by-side analysis</div>
                    </div>
                  </Link>
                )}
                <Link
                  to="/explore"
                  className="flex items-center gap-3 p-3 rounded-lg border border-glass-border
                             hover:border-accent/30 hover:bg-accent-dim transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-dim text-accent flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Explore</div>
                    <div className="text-xs text-gray-500">Browse all profiles</div>
                  </div>
                </Link>
                <Link
                  to="/integrate"
                  className="flex items-center gap-3 p-3 rounded-lg border border-glass-border
                             hover:border-accent/30 hover:bg-accent-dim transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-dim text-accent flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Integrate</div>
                    <div className="text-xs text-gray-500">Use in your contract</div>
                  </div>
                </Link>
              </div>
            </div>

            {!isAddress && (
              <div className="text-center">
                <button
                  onClick={handleRefresh}
                  disabled={generating}
                  className="text-sm text-gray-500 hover:text-gray-300 underline"
                >
                  Refresh profile
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 mx-auto max-w-md glass rounded-xl p-4 text-center border border-red-500/30">
                <p className="text-red-400 text-sm mb-3">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {handle && (
              <DisputeModal
                handle={handle}
                isOpen={showDispute}
                onClose={() => setShowDispute(false)}
                onDisputed={() => {
                  readProfileByHandle(handle).then((p) => {
                    if (p && p.overall) setProfile(p);
                  });
                }}
              />
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">{handle}</h2>
            {isAddress ? (
              <p className="text-gray-400">
                No profile found for this address. The owner must vouch their identifier first.
              </p>
            ) : (
              <>
                <p className="text-gray-400 mb-6">No profile found. Generate one?</p>

                <button
                  onClick={handleGenerate}
                  disabled={!hasFundedAccount}
                  className="px-8 py-3 bg-accent text-white rounded-lg font-medium
                             hover:bg-accent-bright disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                >
                  Generate Trust Profile
                </button>

                {!hasFundedAccount && (
                  <p className="text-amber-400 mt-3 text-sm">
                    Demo wallet not configured. Profile generation requires GEN tokens for gas.
                  </p>
                )}
                {error && (
                  <div className="mt-4 mx-auto max-w-md glass rounded-xl p-4 text-center border border-red-500/30">
                    <p className="text-red-400 text-sm mb-3">{error}</p>
                    <button
                      onClick={handleGenerate}
                      className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
