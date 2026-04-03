import { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfileCard from "../components/ProfileCard";
import { getAllProfiles, isUsingFallbackData } from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

type TierFilter = "ALL" | "TRUSTED" | "MODERATE" | "LOW" | "UNKNOWN";
type SortKey = "score" | "name";
type MinGradeFilter = "A" | "B" | "C" | "D" | "F";

const GRADE_RANK: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
  "N/A": 0,
};

function getProfileId(profile: TrustProfile) {
  return profile.identifier || (profile as any).handle || "";
}

function gradeMeetsThreshold(grade: string | undefined, minGrade: MinGradeFilter) {
  return (GRADE_RANK[grade?.charAt(0)?.toUpperCase() || "N/A"] || 0) >= GRADE_RANK[minGrade];
}

export default function Explore() {
  const [profiles, setProfiles] = useState<TrustProfile[]>([]);
  const [filter, setFilter] = useState<TierFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [search, setSearch] = useState("");
  const [dimension, setDimension] = useState<DimensionKey | "all">("all");
  const [minGrade, setMinGrade] = useState<MinGradeFilter>("B");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProfiles()
      .then(setProfiles)
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

    return matchesSearch && matchesDimension;
  });

  const sorted = [...filtered].sort((a, b) => {
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

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Explore Profiles</h1>
          <p className="text-gray-400">
            All trust profiles evaluated across 6 dimensions by AI consensus on GenLayer
          </p>
        </div>

        {isUsingFallbackData && !loading && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-center">
            <p className="text-yellow-400 text-sm font-mono">
              Showing demo profiles — contract unavailable. Live data loads when testnet is online.
            </p>
          </div>
        )}

        <div className="flex justify-center gap-8 mb-6 text-sm font-mono text-gray-500">
          <span>{profiles.length} profiles</span>
          <span>{profiles.filter((p) => p.disputed).length} disputes</span>
          <span>{sorted.length} matches</span>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5 mb-8">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))]">
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
            {dimension === "all"
              ? "Showing all dimensions. Choose a dimension to filter by minimum grade."
              : `Filtering for ${DIMENSION_LABELS[dimension]} profiles with grade ${minGrade} or better.`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-700 border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-mono text-sm">Loading profiles...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium mb-2">No profiles match this filter</p>
            <button
              onClick={() => {
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
            {sorted.map((p) => (
              <ProfileCard key={getProfileId(p)} profile={p} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
