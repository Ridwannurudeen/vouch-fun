import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import TrustBadge from "../components/TrustBadge";
import GradeCard from "../components/GradeCard";
import {
  readProfile,
  generateProfile,
  generateAddressProfile,
  refreshProfile,
} from "../lib/genlayer";
import type { TrustProfile } from "../types";

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const isAddress = handle?.startsWith("0x") && handle.length === 42;

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError("");
    readProfile(handle)
      .then((p) => {
        if (p && p.overall) {
          setProfile(p);
        } else {
          setProfile(null);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleGenerate = async () => {
    if (!handle) return;
    setGenerating(true);
    setError("");
    try {
      const fn = isAddress ? generateAddressProfile : generateProfile;
      await fn(handle);
      const p = await readProfile(handle);
      if (p && p.overall) {
        setProfile(p);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate profile");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    if (!handle) return;
    setGenerating(true);
    setError("");
    try {
      await refreshProfile(handle);
      const p = await readProfile(handle);
      if (p && p.overall) {
        setProfile(p);
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh profile");
    } finally {
      setGenerating(false);
    }
  };

  const code = profile?.code_activity;
  const onchain = profile?.onchain_activity;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-mono">Loading...</div>
        ) : profile ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-mono text-gray-900 mb-2">
                {profile.handle}
              </h1>
              <TrustBadge tier={profile.overall.trust_tier} />
              <p className="text-gray-600 mt-3 max-w-lg mx-auto">
                {profile.overall.summary}
              </p>
              <div className="text-xs text-gray-400 mt-2 font-mono">
                Sources: {profile.sources_scraped?.join(", ")}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {code && (
                <GradeCard
                  title="Code Activity"
                  grade={code.grade}
                  reasoning={code.reasoning || ""}
                  stats={[
                    { label: "Repos", value: code.repos ?? "-" },
                    { label: "Commits (year)", value: code.commits_last_year ?? "-" },
                    { label: "Stars", value: code.stars_received ?? "-" },
                    { label: "Languages", value: code.languages?.join(", ") || "-" },
                  ]}
                />
              )}
              {onchain && (
                <GradeCard
                  title="On-Chain Activity"
                  grade={onchain.grade}
                  reasoning={onchain.reasoning || ""}
                  stats={[
                    { label: "Transactions", value: onchain.tx_count ?? "-" },
                    { label: "Account age (days)", value: onchain.first_tx_age_days ?? "-" },
                    { label: "Contracts deployed", value: onchain.contracts_deployed ?? "-" },
                    { label: "Suspicious", value: onchain.suspicious_patterns ? "Yes" : "No" },
                  ]}
                />
              )}
            </div>

            <div className="text-center">
              <button
                onClick={handleRefresh}
                disabled={generating}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {generating ? "Regenerating..." : "Refresh profile"}
              </button>
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-mono">{handle}</h2>
            <p className="text-gray-500 mb-6">No profile found. Generate one?</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium
                         hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {generating
                ? "Generating... (this may take up to 60s)"
                : "Generate Trust Profile"}
            </button>
            {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
