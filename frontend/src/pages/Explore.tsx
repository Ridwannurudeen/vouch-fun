import { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfileCard from "../components/ProfileCard";
import { getAllProfiles } from "../lib/genlayer";
import type { TrustProfile } from "../types";

type TierFilter = "ALL" | "TRUSTED" | "MODERATE" | "LOW";

export default function Explore() {
  const [profiles, setProfiles] = useState<TrustProfile[]>([]);
  const [filter, setFilter] = useState<TierFilter>("ALL");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "ALL"
      ? profiles
      : profiles.filter((p) => p.overall.trust_tier === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return (b.overall.trust_score || 0) - (a.overall.trust_score || 0);
    const idA = a.identifier || (a as any).handle || "";
    const idB = b.identifier || (b as any).handle || "";
    return idA.localeCompare(idB);
  });

  const counts = {
    ALL: profiles.length,
    TRUSTED: profiles.filter((p) => p.overall.trust_tier === "TRUSTED").length,
    MODERATE: profiles.filter((p) => p.overall.trust_tier === "MODERATE").length,
    LOW: profiles.filter((p) => p.overall.trust_tier === "LOW").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Profiles</h1>
          <p className="text-gray-500">
            All trust profiles evaluated across 6 dimensions by AI consensus on GenLayer
          </p>
        </div>

        {/* Stats strip */}
        <div className="flex justify-center gap-8 mb-6 text-sm font-mono text-gray-500">
          <span>{profiles.length} profiles</span>
          <span>{profiles.filter((p) => p.disputed).length} disputes</span>
        </div>

        {/* Filter tabs + sort */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {(["ALL", "TRUSTED", "MODERATE", "LOW"] as TierFilter[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setFilter(tier)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                filter === tier
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
              }`}
            >
              {tier} ({counts[tier]})
            </button>
          ))}
          <span className="mx-2 text-gray-300">|</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "name")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600"
          >
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-mono text-sm">Loading profiles...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium mb-2">No profiles match this filter</p>
            <button
              onClick={() => setFilter("ALL")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Show all profiles
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((p) => (
              <ProfileCard key={p.identifier || (p as any).handle} profile={p} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
