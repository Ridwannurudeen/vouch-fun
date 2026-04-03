import { useEffect, useState, useRef, Suspense, lazy } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TrustBadge from "../components/TrustBadge";
import GradeCard from "../components/GradeCard";
import GradeBar from "../components/GradeBar";
import ConsensusAnimation from "../components/ConsensusAnimation";
import DisputeModal from "../components/DisputeModal";
import {
  readProfile,
  readProfileByHandle,
  generateProfile,
  refreshProfile,
  stakeVouch,
  getStakes,
  getProfileAge,
  getDecayInfo,
  hasFundedAccount,
  MIN_STAKE,
} from "../lib/genlayer";
import type { TrustProfile, DimensionKey, ProfileAge, DecayInfo } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

const RadarChart = lazy(() => import("../components/RadarChart"));

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

const DIMENSION_SOURCE_KEYS: Record<DimensionKey, string[]> = {
  code: ["github_api", "npm_registry", "ai_consensus", "seed"],
  onchain: ["etherscan", "debank", "ai_consensus", "seed"],
  social: ["twitter", "nitter", "farcaster", "lens", "ai_consensus", "seed"],
  governance: ["tally", "snapshot", "ai_consensus", "seed"],
  defi: ["defillama", "debank", "etherscan", "ai_consensus", "seed"],
  identity: ["ensdata", "lens", "farcaster", "twitter", "github_api", "ai_consensus", "seed"],
};

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
  const twitterMatch = h.match(/^https?:\/\/(www\.)?(twitter|x)\.com\/([^/]+)\/?$/i);
  if (twitterMatch) {
    h = "@" + twitterMatch[3];
  }
  h = h.replace(/\/$/, "");
  if (h.startsWith("0x") && h.length === 42) return h.toLowerCase();
  if (h.endsWith(".eth")) return h.toLowerCase();
  if (h.startsWith("@")) return `@${h.slice(1).toLowerCase()}`;
  return h || raw;
}

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

function getProfileSources(profile: TrustProfile): string[] {
  return profile.sources || profile.sources_scraped || [];
}

function getDimensionEvidenceSources(profile: TrustProfile, dimension: DimensionKey): string[] {
  const sources = new Set(getProfileSources(profile));
  const labels = DIMENSION_SOURCE_KEYS[dimension]
    .filter((key) => sources.has(key))
    .map((key) => SOURCE_DISPLAY[key]?.label || key);

  if (labels.length > 0) return labels.slice(0, 4);
  return Array.from(sources).slice(0, 4).map((key) => SOURCE_DISPLAY[key]?.label || key);
}

function formatProfileAge(profileAge: ProfileAge | null) {
  if (!profileAge?.exists) return "No timestamp";
  const seconds = profileAge.age_seconds ?? 0;
  if (seconds < 3600) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `${mins} min ago`;
  }
  if (seconds < 86400) {
    const hours = Math.max(1, Math.round(seconds / 3600));
    return `${hours} hr ago`;
  }
  const days = profileAge.age_days ?? Math.max(1, Math.round(seconds / 86400));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getFreshnessMeta(profileAge: ProfileAge | null) {
  if (!profileAge?.exists) {
    return {
      label: "Unknown",
      style: "bg-gray-500/15 text-gray-400 border-gray-500/20",
      copy: "No freshness data available for this profile yet.",
    };
  }
  if (profileAge.fresh) {
    return {
      label: "Fresh",
      style: "bg-green-500/15 text-green-400 border-green-500/20",
      copy: "This score is still inside the protocol freshness window.",
    };
  }
  return {
    label: "Stale",
    style: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    copy: "This score should be refreshed before high-stakes decisions.",
  };
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
  const [recentDisputeReason, setRecentDisputeReason] = useState("");
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [stakes, setStakes] = useState<Record<string, any[]>>({});
  const [profileAge, setProfileAge] = useState<ProfileAge | null>(null);
  const [decayInfo, setDecayInfo] = useState<DecayInfo | null>(null);
  const [staking, setStaking] = useState(false);
  const [stakeDim, setStakeDim] = useState<DimensionKey>("code");
  const [stakeGrade, setStakeGrade] = useState("B");

  const isAddress = handle?.startsWith("0x") && handle.length === 42;

  useEffect(() => {
    getDecayInfo().then(setDecayInfo).catch(() => setDecayInfo({ ttl_days: 90 }));
  }, []);

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError("");

    const fetchProfile = isAddress ? readProfile(handle) : readProfileByHandle(handle);

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

  useEffect(() => {
    if (!profile?.identifier) {
      setStakes({});
      setProfileAge(null);
      return;
    }

    getStakes(profile.identifier).then(setStakes).catch(() => setStakes({}));
    getProfileAge(profile.identifier).then(setProfileAge).catch(() => setProfileAge({ exists: false }));
  }, [profile]);

  const handleGenerate = async () => {
    const target = cleanHandle(handle);
    if (!target || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await generateProfile(target);
      const p = await readProfileByHandle(target);
      if (p && p.overall) setProfile(p);
    } catch (err: any) {
      setError(err.message || "Failed to generate profile");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    const target = cleanHandle(handle);
    if (!target || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await refreshProfile(target);
      const p = await readProfileByHandle(target);
      if (p && p.overall) setProfile(p);
    } catch (err: any) {
      setError(err.message || "Failed to refresh profile");
    } finally {
      setGenerating(false);
    }
  };

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
  const profileSources = profile ? getProfileSources(profile) : [];
  const freshness = getFreshnessMeta(profileAge);
  const challengeOpen = !!(profile?.disputed || recentDisputeReason);
  const currentChallengeReason = recentDisputeReason || profile?.dispute_reason || "";

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <ProfileSkeleton />
        ) : generating ? (
          <div className="py-8">
            <ConsensusAnimation />
            <p className="text-center text-gray-400 text-sm mt-4">
              {recentDisputeReason
                ? "Dispute submitted. Validators are re-evaluating the profile against fresh evidence."
                : "Refreshing live evidence and recomputing the trust synthesis."}
            </p>
            {slow && (
              <p className="text-center text-amber-400 text-sm mt-3">
                Taking longer than expected... Validators are still working on this one.
              </p>
            )}
          </div>
        ) : profile ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-mono text-white mb-2">{profileId}</h1>
              <TrustBadge tier={profile.overall.trust_tier} />

              {profile.overall.trust_score != null && (
                <div className="mt-3">
                  <span className="text-4xl font-bold text-white font-mono">{profile.overall.trust_score}</span>
                  <span className="text-sm text-gray-500 ml-1">/100</span>
                </div>
              )}

              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-accent bg-accent-dim px-3 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm-.75 3.5a.75.75 0 011.5 0V10c0 .199-.079.39-.22.53l-2 2a.75.75 0 11-1.06-1.06l1.78-1.77V5.5z" clipRule="evenodd" />
                  </svg>
                  Trust synthesized via AI consensus
                </span>
                {profile.identifier_type && (
                  <span className="ml-2 text-xs text-gray-500 font-mono">{profile.identifier_type}</span>
                )}
              </div>

              <p className="text-gray-500 text-sm mt-2 max-w-xl mx-auto">
                This is a judgment layer, not a KYC verification badge. Each dimension includes its own confidence level.
              </p>

              <p className="text-gray-400 mt-3 max-w-lg mx-auto">{profile.overall.summary}</p>

              {profile.overall.top_signals && profile.overall.top_signals.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {profile.overall.top_signals.map((signal, i) => (
                    <span key={i} className="text-xs bg-accent-dim text-accent px-2.5 py-1 rounded-full font-medium">
                      {signal}
                    </span>
                  ))}
                </div>
              )}

              {profileSources.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono block mb-1.5">Data Sources</span>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {profileSources.map((source) => {
                      const info = SOURCE_DISPLAY[source] || { label: source, color: "bg-white/5 text-gray-400" };
                      return (
                        <span key={source} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${info.color}`}>
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-6 mb-6 border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Freshness & Review</h3>
                  <p className="text-sm text-gray-400">
                    Every refresh and dispute re-fetches live web evidence before a new synthesis is stored.
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border font-medium w-fit ${freshness.style}`}>
                  {freshness.label}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-gray-600 mb-2">Last Synthesis</div>
                  <div className="text-lg font-semibold text-white">{formatProfileAge(profileAge)}</div>
                  <div className="text-xs text-gray-500 mt-1">Age visible to downstream consumers</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-gray-600 mb-2">Refresh Window</div>
                  <div className="text-lg font-semibold text-white">{decayInfo?.ttl_days ?? 90} days</div>
                  <div className="text-xs text-gray-500 mt-1">{freshness.copy}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-gray-600 mb-2">Review Status</div>
                  <div className={`text-lg font-semibold ${challengeOpen ? "text-amber-300" : "text-white"}`}>
                    {challengeOpen ? "Under review" : "Open to challenge"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {challengeOpen ? "A dispute reason is visible below." : "Anyone can challenge and trigger re-evaluation."}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-gray-600 mb-2">Active Endorsements</div>
                  <div className="text-lg font-semibold text-white">{totalStakes}</div>
                  <div className="text-xs text-gray-500 mt-1">Stakes at risk if a dispute changes the grade</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCopyUrl}
                  className="text-sm px-4 py-2 glass glass-hover rounded-lg text-gray-300 transition-colors"
                >
                  {copied ? "Copied!" : "Share profile"}
                </button>
                {!isAddress && (
                  <button
                    onClick={handleRefresh}
                    disabled={generating}
                    className="text-sm px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-bright transition-colors"
                  >
                    Refresh with fresh evidence
                  </button>
                )}
                {!isAddress && (
                  <button
                    onClick={() => setShowDispute(true)}
                    className="text-sm px-4 py-2 border border-red-500/30 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    Open dispute
                  </button>
                )}
              </div>

              {currentChallengeReason && (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300 mb-1">Latest Challenge Context</div>
                  <p className="text-sm text-amber-100">{currentChallengeReason}</p>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-white mb-2 text-center">Trust Dimensions</h3>
              <Suspense fallback={<ChartFallback />}>
                <RadarChart profileA={profile} />
              </Suspense>
            </div>

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
                    evidenceSources={getDimensionEvidenceSources(profile, dim)}
                  />
                );
              })}
            </div>

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
                    {["A", "B", "C", "D", "F"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleStake}
                  disabled={staking || !hasFundedAccount}
                  className="text-sm px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-bright disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                >
                  {staking ? "Staking..." : "Endorse Grade"}
                </button>
              </div>
              {totalStakes > 0 && (
                <div className="mt-4 border-t border-glass-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stakes).map(([dim, entries]) =>
                      Array.isArray(entries)
                        ? entries.map((s, i) => (
                            <span key={`${dim}-${i}`} className="text-xs bg-accent-dim text-accent px-2 py-1 rounded font-mono">
                              {DIMENSION_LABELS[dim as DimensionKey] || dim}: {s.grade} ({s.amount} wei)
                            </span>
                          ))
                        : null
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-white mb-4">What's next?</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <Link to="/explore" className="glass glass-hover rounded-lg p-4 text-center">
                  <div className="text-sm font-medium text-white mb-1">Explore</div>
                  <div className="text-xs text-gray-500">Browse other trust profiles</div>
                </Link>
                <Link to="/integrate" className="glass glass-hover rounded-lg p-4 text-center">
                  <div className="text-sm font-medium text-white mb-1">Integrate</div>
                  <div className="text-xs text-gray-500">Use trust checks in contracts</div>
                </Link>
                <Link to="/gates" className="glass glass-hover rounded-lg p-4 text-center">
                  <div className="text-sm font-medium text-white mb-1">Trust Gates</div>
                  <div className="text-xs text-gray-500">See composability demos</div>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No profile found</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Generate a fresh synthesized trust profile for this identifier to evaluate its six dimensions.
            </p>
            {!isAddress && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-5 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-bright transition-colors"
              >
                Generate Profile
              </button>
            )}
            {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
          </div>
        )}

        {profile && (
          <DisputeModal
            handle={profile.identifier}
            isOpen={showDispute}
            onClose={() => setShowDispute(false)}
            onDisputed={(reason) => {
              setRecentDisputeReason(reason);
              handleRefresh();
            }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

