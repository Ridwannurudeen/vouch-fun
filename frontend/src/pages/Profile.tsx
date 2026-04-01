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
  hasFundedAccount,
} from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="text-center mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-3" />
        <div className="h-6 bg-gray-100 rounded w-24 mx-auto mb-3" />
        <div className="h-4 bg-gray-100 rounded w-80 mx-auto mb-2" />
        <div className="h-4 bg-gray-100 rounded w-64 mx-auto" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-12 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const profileId = profile?.identifier || (profile as any)?.handle || handle || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <ProfileSkeleton />
        ) : generating ? (
          <div className="py-8">
            <ConsensusAnimation />
            {slow && (
              <p className="text-center text-amber-600 text-sm mt-4">
                Taking longer than expected... Validators are still working on this one.
              </p>
            )}
          </div>
        ) : profile ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-mono text-gray-900 mb-2">
                {profileId}
              </h1>
              <TrustBadge tier={profile.overall.trust_tier} />

              {/* Trust score */}
              {profile.overall.trust_score != null && (
                <div className="mt-3">
                  <span className="text-4xl font-bold text-gray-900 font-mono">
                    {profile.overall.trust_score}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">/100</span>
                </div>
              )}

              {/* Verified badge */}
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified by AI Consensus
                </span>
                {profile.identifier_type && (
                  <span className="ml-2 text-xs text-gray-400 font-mono">
                    {profile.identifier_type}
                  </span>
                )}
              </div>

              <p className="text-gray-600 mt-3 max-w-lg mx-auto">
                {profile.overall.summary}
              </p>

              {/* Top signals */}
              {profile.overall.top_signals && profile.overall.top_signals.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {profile.overall.top_signals.map((signal, i) => (
                    <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
                      {signal}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-400 mt-3 font-mono">
                Sources: {(profile.sources || profile.sources_scraped || []).join(", ")}
                {(profile.sources || profile.sources_scraped || []).includes("seed") && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    Seeded Profile
                  </span>
                )}
              </div>
              {profile.vouched_by && (
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  Vouched by: {profile.vouched_by}
                </div>
              )}

              {/* Dispute notice */}
              {profile.disputed && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  Disputed: {profile.dispute_reason}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={handleCopyUrl}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg
                             hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  {copied ? "Copied!" : "Share"}
                </button>
                {!isAddress && (
                  <Link
                    to={`/compare/${handle}`}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg
                               hover:bg-gray-50 text-gray-500 transition-colors"
                  >
                    Compare with...
                  </Link>
                )}
                {!isAddress && (
                  <button
                    onClick={() => setShowDispute(true)}
                    className="text-xs px-3 py-1.5 border border-red-200 rounded-lg
                               hover:bg-red-50 text-red-500 transition-colors"
                  >
                    Challenge This Score
                  </button>
                )}
              </div>
            </div>

            {/* Radar chart */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 text-center">Trust Dimensions</h3>
              <RadarChart profileA={profile} />
            </div>

            {/* Grade bars overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Grade Overview</h3>
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

            {/* Related actions */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">What's next?</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {!isAddress && (
                  <Link
                    to={`/compare/${handle}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100
                               hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Compare</div>
                      <div className="text-xs text-gray-400">Side-by-side analysis</div>
                    </div>
                  </Link>
                )}
                <Link
                  to="/explore"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100
                             hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Explore</div>
                    <div className="text-xs text-gray-400">Browse all profiles</div>
                  </div>
                </Link>
                <Link
                  to="/integrate"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100
                             hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Integrate</div>
                    <div className="text-xs text-gray-400">Use in your contract</div>
                  </div>
                </Link>
              </div>
            </div>

            {!isAddress && (
              <div className="text-center">
                <button
                  onClick={handleRefresh}
                  disabled={generating}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Refresh profile
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 mx-auto max-w-md border border-red-200 bg-red-50 rounded-xl p-4 text-center">
                <p className="text-red-600 text-sm mb-3">{error}</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-mono">{handle}</h2>
            {isAddress ? (
              <p className="text-gray-500">
                No profile found for this address. The owner must vouch their identifier first.
              </p>
            ) : (
              <>
                <p className="text-gray-500 mb-6">No profile found. Generate one?</p>

                <button
                  onClick={handleGenerate}
                  disabled={!hasFundedAccount}
                  className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium
                             hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  Generate Trust Profile
                </button>

                {!hasFundedAccount && (
                  <p className="text-amber-600 mt-3 text-sm">
                    Demo wallet not configured. Profile generation requires GEN tokens for gas.
                  </p>
                )}
                {error && (
                  <div className="mt-4 mx-auto max-w-md border border-red-200 bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-red-600 text-sm mb-3">{error}</p>
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
