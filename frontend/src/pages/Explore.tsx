import { useState, useEffect } from "react";
import Header from "../components/Header";
import ProfileCard from "../components/ProfileCard";
import { getAllProfiles } from "../lib/genlayer";
import type { TrustProfile } from "../types";

type TierFilter = "ALL" | "TRUSTED" | "MODERATE" | "LOW";

export default function Explore() {
  const [profiles, setProfiles] = useState<TrustProfile[]>([]);
  const [filter, setFilter] = useState<TierFilter>("ALL");
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
            All trust profiles evaluated by AI consensus on GenLayer
          </p>
        </div>

        {/* Stats strip */}
        <div className="flex justify-center gap-8 mb-6 text-sm font-mono text-gray-500">
          <span>{profiles.length} profiles</span>
          <span>{profiles.filter((p) => p.disputed).length} disputes</span>
        </div>

        {/* Filter tabs */}
        <div className="flex justify-center gap-2 mb-8">
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
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 font-mono">Loading profiles...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No profiles match this filter.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProfileCard key={p.handle} profile={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
