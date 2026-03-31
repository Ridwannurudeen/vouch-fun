import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import TrustBadge from "../components/TrustBadge";
import GradeCard from "../components/GradeCard";
import {
  readProfile,
  readProfileByHandle,
  generateProfile,
  refreshProfile,
  hasFundedAccount,
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

  const handleGenerate = async () => {
    if (!handle || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await generateProfile(handle);
      const p = await readProfileByHandle(handle);
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
    if (!handle || isAddress) return;
    setGenerating(true);
    setError("");
    try {
      await refreshProfile(handle);
      const p = await readProfileByHandle(handle);
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
                {profile.sources_scraped?.includes("seed") && (
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

            {!isAddress && (
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
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-mono">{handle}</h2>
            {isAddress ? (
              <p className="text-gray-500">
                No profile found for this address. The owner must vouch their GitHub handle first.
              </p>
            ) : (
              <>
                <p className="text-gray-500 mb-6">No profile found. Generate one?</p>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !hasFundedAccount}
                  className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium
                             hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  {generating
                    ? "Generating... (validators evaluating via LLM consensus, ~60-120s)"
                    : "Generate Trust Profile"}
                </button>
                {generating && (
                  <p className="text-gray-400 mt-3 text-sm">
                    Validators are evaluating this developer via LLM consensus.
                    This requires on-chain agreement and may take 1-2 minutes.
                  </p>
                )}
                {!hasFundedAccount && !generating && (
                  <p className="text-amber-600 mt-3 text-sm">
                    Demo wallet not configured. Profile generation requires GEN tokens for gas.
                  </p>
                )}
                {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
