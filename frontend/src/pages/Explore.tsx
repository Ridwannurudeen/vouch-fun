import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfileCard, { deriveRoles } from "../components/ProfileCard";
import { getAllProfiles, invalidateCache, isUsingFallbackData } from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

type TierFilter = "ALL" | "TRUSTED" | "MODERATE" | "LOW" | "UNKNOWN";
type SortKey = "score" | "name" | "role_relevance";
type MinGradeFilter = "A" | "B" | "C" | "D" | "F";
type ViewMode = "explore" | "marketplace";
type RoleFilter = "all" | string;

const GRADE_RANK: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
  "N/A": 0,
};

const ROLE_CATEGORIES: { value: string; label: string; icon: string; color: string; sortDim?: DimensionKey }[] = [
  { value: "Security Expert", label: "Security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5", sortDim: "code" },
  { value: "Developer", label: "Developer", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", color: "text-blue-400 border-blue-400/20 bg-blue-400/5", sortDim: "code" },
  { value: "DeFi Specialist", label: "DeFi", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-violet-400 border-violet-400/20 bg-violet-400/5", sortDim: "defi" },
  { value: "DAO Contributor", label: "Governance", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", color: "text-amber-400 border-amber-400/20 bg-amber-400/5", sortDim: "governance" },
  { value: "Thought Leader", label: "Social", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-pink-400 border-pink-400/20 bg-pink-400/5", sortDim: "social" },
  { value: "On-Chain Power User", label: "On-Chain", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5", sortDim: "onchain" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  ...ROLE_CATEGORIES.map((r) => ({ value: r.value, label: r.value })),
];

function getProfileId(profile: TrustProfile) {
  return profile.identifier || (profile as any).handle || "";
}

function gradeMeetsThreshold(grade: string | undefined, minGrade: MinGradeFilter) {
  return (GRADE_RANK[grade?.charAt(0)?.toUpperCase() || "N/A"] || 0) >= GRADE_RANK[minGrade];
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<TrustProfile[]>([]);
  const [filter, setFilter] = useState<TierFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [search, setSearch] = useState("");
  const [dimension, setDimension] = useState<DimensionKey | "all">("all");
  const [minGrade, setMinGrade] = useState<MinGradeFilter>("B");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deep-link support: ?view=marketplace&role=Developer
  const initialView = searchParams.get("view") === "marketplace" ? "marketplace" : "explore";
  const initialRole = searchParams.get("role") || "all";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(initialRole);

  // Sync view mode to URL
  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "marketplace") {
      setFilter("TRUSTED");
      setSearchParams({ view: "marketplace" }, { replace: true });
    } else {
      setRoleFilter("all");
      setSearchParams({}, { replace: true });
    }
  };

  const switchRole = (role: string) => {
    setRoleFilter(role);
    if (role !== "all") setSortBy("role_relevance");
    else if (sortBy === "role_relevance") setSortBy("score");
    if (viewMode === "marketplace") {
      const params: Record<string, string> = { view: "marketplace" };
      if (role !== "all") params.role = role;
      setSearchParams(params, { replace: true });
    }
  };

  // Init marketplace filter if deep-linked
  useEffect(() => {
    if (initialView === "marketplace") setFilter("TRUSTED");
  }, [initialView]);

  useEffect(() => {
    getAllProfiles()
      .then(setProfiles)
      .catch(() => setError("Failed to load profiles. The contract may be unreachable."))
      .finally(() => setLoading(false));
  }, []);

  const tierFiltered =
    filter === "ALL"
      ? profiles
      : profiles.filter((p) => p.overall.trust_tier === filter);

  const query = search.trim().toLowerCase();

  const filtered = tierFiltered.filter((profile) => {
    const id = getProfileId(profile).toLowerCase();
    const summary = profile.overall.summary?.toLowerCase() || "";
    const topSignals = (profile.overall.top_signals || []).join(" ").toLowerCase();
    const matchesSearch =
      !query || id.includes(query) || summary.includes(query) || topSignals.includes(query);
    const matchesDimension =
      dimension === "all" || gradeMeetsThreshold(profile[dimension]?.grade, minGrade);

    const matchesRole =
      viewMode !== "marketplace" ||
      roleFilter === "all" ||
      deriveRoles(profile).some((r) => r.label === roleFilter);

    return matchesSearch && matchesDimension && matchesRole;
  });

  const activeSortDim = ROLE_CATEGORIES.find((r) => r.value === roleFilter)?.sortDim;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "role_relevance" && activeSortDim) {
      const gradeA = GRADE_RANK[a[activeSortDim]?.grade?.charAt(0)?.toUpperCase() || "N/A"] || 0;
      const gradeB = GRADE_RANK[b[activeSortDim]?.grade?.charAt(0)?.toUpperCase() || "N/A"] || 0;
      if (gradeB !== gradeA) return gradeB - gradeA;
      return (b.overall.trust_score || 0) - (a.overall.trust_score || 0);
    }
    if (sortBy === "score") return (b.overall.trust_score || 0) - (a.overall.trust_score || 0);
    const idA = getProfileId(a);
    const idB = getProfileId(b);
    return idA.localeCompare(idB);
  });

  const counts = {
    ALL: profiles.length,
    TRUSTED: profiles.filter((p) => p.overall.trust_tier === "TRUSTED").length,
    MODERATE: profiles.filter((p) => p.overall.trust_tier === "MODERATE").length,
    LOW: profiles.filter((p) => p.overall.trust_tier === "LOW").length,
    UNKNOWN: profiles.filter((p) => p.overall.trust_tier === "UNKNOWN").length,
  };

  // Role category counts — best-fit only (no double-counting same dimension)
  const roleCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of ROLE_CATEGORIES) map[cat.value] = 0;
    for (const p of profiles) {
      const roles = deriveRoles(p);
      const claimedDims = new Set<string>();
      for (const r of roles) {
        const dimKey = ROLE_CATEGORIES.find((c) => c.value === r.label)?.sortDim;
        if (dimKey && claimedDims.has(dimKey)) continue;
        if (dimKey) claimedDims.add(dimKey);
        if (map[r.label] !== undefined) map[r.label]++;
      }
    }
    return map;
  }, [profiles]);

  // Featured experts — top 3 TRUSTED by score
  const featuredExperts = useMemo(() => {
    return [...profiles]
      .filter((p) => p.overall.trust_tier === "TRUSTED")
      .sort((a, b) => (b.overall.trust_score || 0) - (a.overall.trust_score || 0))
      .slice(0, 3);
  }, [profiles]);

  const featuredIds = useMemo(() => new Set(featuredExperts.map(getProfileId)), [featuredExperts]);
  const showFeatured = viewMode === "marketplace" && !loading && featuredExperts.length > 0 && roleFilter === "all";

  // Marketplace stats
  const marketplaceStats = useMemo(() => {
    const uniqueRoles = new Set(profiles.flatMap((p) => deriveRoles(p).map((r) => r.label)));
    const scores = profiles.map((p) => p.overall.trust_score || 0).filter((s) => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const totalSources = profiles.reduce((acc, p) => acc + (p.sources?.length || p.sources_scraped?.length || 0), 0);
    return {
      totalExperts: counts.TRUSTED,
      uniqueRoles: uniqueRoles.size,
      avgScore,
      totalSources,
    };
  }, [profiles, counts.TRUSTED]);

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center gap-1 mb-4 bg-white/5 rounded-xl p-1 max-w-xs mx-auto">
            <button
              onClick={() => switchView("explore")}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                viewMode === "explore" ? "bg-accent text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => switchView("marketplace")}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                viewMode === "marketplace" ? "bg-accent text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Marketplace
            </button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {viewMode === "marketplace" ? "Trust Marketplace" : "Explore Profiles"}
          </h1>
          <p className="text-gray-400">
            {viewMode === "marketplace"
              ? "Verified experts ready for hire — trust scores backed by AI consensus on GenLayer"
              : "All trust profiles evaluated across 6 dimensions by AI consensus on GenLayer"}
          </p>
        </div>

        {isUsingFallbackData && !loading && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-center">
            <p className="text-yellow-400 text-sm font-mono">
              Showing demo profiles — contract unavailable. Live data loads when testnet is online.
            </p>
          </div>
        )}

        {viewMode === "marketplace" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Verified Experts", value: marketplaceStats.totalExperts },
              { label: "Unique Roles", value: marketplaceStats.uniqueRoles },
              { label: "Avg Trust Score", value: marketplaceStats.avgScore },
              { label: "Sources Verified", value: marketplaceStats.totalSources },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl px-4 py-3 text-center">
                <div className="text-xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-8 mb-6 text-sm font-mono text-gray-500">
            <span>{profiles.length} profiles</span>
            <span>{profiles.filter((p) => p.disputed).length} disputes</span>
            <span>{sorted.length} matches</span>
          </div>
        )}

        {viewMode === "marketplace" && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {ROLE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => switchRole(roleFilter === cat.value ? "all" : cat.value)}
                className={`rounded-xl border px-3 py-4 text-center transition-all ${
                  roleFilter === cat.value
                    ? cat.color + " border-current"
                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
                <div className="text-xs font-semibold">{cat.label}</div>
                <div className="text-[10px] text-gray-600 font-mono mt-0.5">{roleCounts[cat.value] || 0}</div>
              </button>
            ))}
          </div>
        )}

        {viewMode === "marketplace" && !loading && featuredExperts.length > 0 && roleFilter === "all" && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Featured Experts</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {featuredExperts.map((p) => (
                <ProfileCard key={getProfileId(p)} profile={p} marketplace featured />
              ))}
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4 sm:p-5 mb-8">
          <div className={`grid gap-3 ${viewMode === "marketplace" ? "lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.7fr))]" : "lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))]"}`}>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500 mb-2">
                Search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="GitHub, ENS, wallet, or @twitter"
                className="w-full px-4 py-3 bg-white/5 border border-glass-border rounded-xl font-mono text-white
                           placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
              />
            </label>

            {viewMode === "marketplace" ? (
              <>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500 mb-2">
                    Role
                  </span>
                  <select
                    value={roleFilter}
                    onChange={(e) => switchRole(e.target.value)}
                    className="w-full px-4 py-3 bg-void-light border border-glass-border rounded-xl text-gray-300 focus:border-accent/50 focus:outline-none"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500 mb-2">
                    Sort
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="w-full px-4 py-3 bg-void-light border border-glass-border rounded-xl text-gray-300 focus:border-accent/50 focus:outline-none"
                  >
                    <option value="score">Trust score</option>
                    <option value="role_relevance" disabled={roleFilter === "all"}>Role relevance</option>
                    <option value="name">Identifier</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500 mb-2">
                    Dimension
                  </span>
                  <select
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value as DimensionKey | "all")}
                    className="w-full px-4 py-3 bg-void-light border border-glass-border rounded-xl text-gray-300 focus:border-accent/50 focus:outline-none"
                  >
                    <option value="all">All dimensions</option>
                    {DIMENSIONS.map((dim) => (
                      <option key={dim} value={dim}>
                        {DIMENSION_LABELS[dim]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500 mb-2">
                    Min Grade
                  </span>
                  <select
                    value={minGrade}
                    onChange={(e) => setMinGrade(e.target.value as MinGradeFilter)}
                    disabled={dimension === "all"}
                    className="w-full px-4 py-3 bg-void-light border border-glass-border rounded-xl text-gray-300
                               disabled:opacity-40 disabled:cursor-not-allowed focus:border-accent/50 focus:outline-none"
                  >
                    {(["A", "B", "C", "D", "F"] as MinGradeFilter[]).map((grade) => (
                      <option key={grade} value={grade}>
                        {grade} or better
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500 mb-2">
                    Sort
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="w-full px-4 py-3 bg-void-light border border-glass-border rounded-xl text-gray-300 focus:border-accent/50 focus:outline-none"
                  >
                    <option value="score">Trust score</option>
                    <option value="name">Identifier</option>
                  </select>
                </label>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {(["ALL", "TRUSTED", "MODERATE", "LOW", "UNKNOWN"] as TierFilter[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilter(tier)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  filter === tier
                    ? "bg-accent text-white"
                    : "glass text-gray-400 hover:text-white hover:bg-glass-hover"
                }`}
              >
                {tier} ({counts[tier]})
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            {viewMode === "marketplace"
              ? roleFilter === "all"
                ? "Showing all trusted experts. Filter by role to find specialists."
                : `Showing ${roleFilter} profiles.`
              : dimension === "all"
                ? "Showing all dimensions. Choose a dimension to filter by minimum grade."
                : `Filtering for ${DIMENSION_LABELS[dimension]} profiles with grade ${minGrade} or better.`}
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                {/* Name + badge row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-28 bg-white/5 rounded mb-1.5" />
                    <div className="h-3 w-16 bg-white/5 rounded" />
                  </div>
                </div>
                {/* Tags */}
                <div className="flex gap-2 mb-4">
                  <div className="h-5 w-14 bg-white/5 rounded-full" />
                  <div className="h-5 w-20 bg-white/5 rounded-full" />
                  <div className="h-5 w-16 bg-white/5 rounded-full" />
                </div>
                {/* Score bar */}
                <div className="h-2 w-full bg-white/5 rounded-full mb-4" />
                {/* Summary lines */}
                <div className="h-3 w-full bg-white/5 rounded mb-2" />
                <div className="h-3 w-3/4 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-red-400 font-medium mb-2">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); invalidateCache(); getAllProfiles().then(setProfiles).catch(() => setError("Still unreachable.")).finally(() => setLoading(false)); }}
              className="text-sm text-accent hover:text-accent-bright font-medium underline"
            >
              Retry
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {viewMode === "marketplace" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                )}
              </svg>
            </div>
            <p className="text-gray-400 font-medium mb-2">
              {viewMode === "marketplace"
                ? roleFilter !== "all"
                  ? `No ${roleFilter} profiles found`
                  : "No trusted experts available yet"
                : "No profiles match this filter"}
            </p>
            <p className="text-sm text-gray-600 mb-3">
              {viewMode === "marketplace"
                ? "Vouch identities on the home page to populate the marketplace."
                : "Try adjusting your search or filter criteria."}
            </p>
            <button
              onClick={() => {
                switchView("explore");
                setFilter("ALL");
                setDimension("all");
                setMinGrade("B");
                setSearch("");
              }}
              className="text-sm text-accent hover:text-accent-bright font-medium underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showFeatured ? sorted.filter((p) => !featuredIds.has(getProfileId(p))) : sorted).map((p) => (
              <ProfileCard key={getProfileId(p)} profile={p} marketplace={viewMode === "marketplace"} />
            ))}
          </div>
        )}

        {viewMode === "marketplace" && !loading && (
          <div className="mt-16 mb-8">
            <h2 className="text-center text-lg font-bold text-white mb-2">How Hiring Works</h2>
            <p className="text-center text-sm text-gray-500 mb-8">Three steps from discovery to verified collaboration</p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Discover",
                  desc: "Browse categories or search by skill. Every profile is scored across 6 dimensions by AI consensus.",
                  icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
                },
                {
                  step: "2",
                  title: "Verify",
                  desc: "Review trust grades, key signals, and data sources. Only TRUSTED profiles are eligible for hire.",
                  icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                },
                {
                  step: "3",
                  title: "Hire",
                  desc: "Connect via the agent hiring flow. Trust scores are on-chain — what you see is what smart contracts enforce.",
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                },
              ].map((item) => (
                <div key={item.step} className="glass rounded-xl p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div className="text-[10px] text-accent font-mono mb-1">Step {item.step}</div>
                  <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
