import { Link } from "react-router-dom";
import TrustBadge from "./TrustBadge";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

const GRADE_STYLE: Record<string, string> = {
  A: "bg-green-500/10 text-green-400",
  B: "bg-blue-500/10 text-blue-400",
  C: "bg-amber-500/10 text-amber-400",
  D: "bg-orange-500/10 text-orange-400",
  F: "bg-red-500/10 text-red-400",
};

const GRADE_RANK: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1, "N/A": 0 };

// Derive marketplace role from strongest dimensions
const ROLE_MAP: { dims: DimensionKey[]; minGrade: string; label: string; icon: string; color: string }[] = [
  { dims: ["code"], minGrade: "A", label: "Security Expert", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "text-emerald-400" },
  { dims: ["code"], minGrade: "B", label: "Developer", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", color: "text-blue-400" },
  { dims: ["defi"], minGrade: "A", label: "DeFi Specialist", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-violet-400" },
  { dims: ["governance"], minGrade: "B", label: "DAO Contributor", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", color: "text-amber-400" },
  { dims: ["social"], minGrade: "A", label: "Thought Leader", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-pink-400" },
  { dims: ["onchain"], minGrade: "A", label: "On-Chain Power User", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", color: "text-cyan-400" },
];

export function deriveRoles(profile: TrustProfile): typeof ROLE_MAP {
  return ROLE_MAP.filter(({ dims, minGrade }) =>
    dims.every((d) => {
      const g = profile[d]?.grade?.charAt(0)?.toUpperCase() || "N/A";
      return (GRADE_RANK[g] || 0) >= (GRADE_RANK[minGrade] || 0);
    })
  );
}

function gradeClass(grade: string) {
  return GRADE_STYLE[grade?.charAt(0)?.toUpperCase()] || "bg-white/5 text-gray-500";
}

function getStrongestDimension(profile: TrustProfile): { dim: DimensionKey; grade: string; rank: number } | null {
  let best: { dim: DimensionKey; grade: string; rank: number } | null = null;
  for (const dim of DIMENSIONS) {
    const d = profile[dim];
    if (!d?.grade) continue;
    const rank = GRADE_RANK[d.grade.charAt(0).toUpperCase()] || 0;
    if (!best || rank > best.rank) best = { dim, grade: d.grade, rank };
  }
  return best;
}

function getConfidenceSummary(profile: TrustProfile): { high: number; total: number } {
  let high = 0;
  let total = 0;
  for (const dim of DIMENSIONS) {
    const d = profile[dim];
    if (!d?.grade) continue;
    total++;
    if (d.confidence === "high") high++;
  }
  return { high, total };
}

const SOURCE_COLORS = [
  "bg-emerald-400", "bg-blue-400", "bg-violet-400", "bg-amber-400", "bg-pink-400", "bg-cyan-400",
];

interface ProfileCardProps {
  profile: TrustProfile;
  compact?: boolean;
  marketplace?: boolean;
  featured?: boolean;
}

export default function ProfileCard({ profile, compact, marketplace, featured }: ProfileCardProps) {
  const id = profile.identifier || (profile as any).handle || "";
  const roles = deriveRoles(profile);
  const strongest = marketplace ? getStrongestDimension(profile) : null;
  const conf = marketplace ? getConfidenceSummary(profile) : null;
  const sources = profile.sources || profile.sources_scraped || [];
  const topSignals = (profile.overall.top_signals || []).slice(0, 3);

  return (
    <div className={`glass rounded-xl p-5 transition-all group hover:border-accent/30 flex flex-col ${featured ? "ring-1 ring-accent/20 bg-accent/[0.02]" : ""}`}>
      <Link to={`/profile/${id}`} className="block flex-1">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`font-bold font-mono text-white group-hover:text-accent-bright transition-colors ${featured ? "text-lg" : ""}`}>
              {id}
            </h3>
            {profile.overall.trust_score != null && (
              <span className="text-xs text-gray-500 font-mono">
                Score: {profile.overall.trust_score}
              </span>
            )}
          </div>
          <TrustBadge tier={profile.overall.trust_tier} />
        </div>

        {marketplace && roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {roles.map((role) => (
              <span key={role.label} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 ${role.color}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={role.icon} />
                </svg>
                {role.label}
              </span>
            ))}
          </div>
        )}

        {marketplace && topSignals.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {topSignals.map((signal, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-accent/5 text-accent/70 font-mono truncate max-w-[180px]">
                {signal}
              </span>
            ))}
          </div>
        )}

        {marketplace && strongest && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Strongest: {DIMENSION_LABELS[strongest.dim]}
              </span>
              <span className={`text-[10px] font-bold font-mono ${gradeClass(strongest.grade)}`}>
                {strongest.grade}
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent"
                style={{ width: `${(strongest.rank / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {marketplace && (sources.length > 0 || (conf && conf.total > 0)) && (
          <div className="flex items-center justify-between mb-3">
            {sources.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-0.5">
                  {sources.slice(0, 6).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${SOURCE_COLORS[i % SOURCE_COLORS.length]} ring-1 ring-void`} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-600 font-mono">
                  {sources.length} source{sources.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {conf && conf.total > 0 && (
              <span className="text-[10px] text-gray-600 font-mono">
                {conf.high}/{conf.total} high conf
              </span>
            )}
          </div>
        )}

        {!compact && !marketplace && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DIMENSIONS.map((dim: DimensionKey) => {
                const d = profile[dim];
                if (!d || !d.grade) return null;
                return (
                  <span
                    key={dim}
                    className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${gradeClass(d.grade)}`}
                  >
                    {DIMENSION_LABELS[dim]}: {d.grade}
                  </span>
                );
              })}
            </div>

            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
              {profile.overall.summary}
            </p>
          </>
        )}

        {!compact && marketplace && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {profile.overall.summary}
          </p>
        )}
      </Link>

      {marketplace ? (
        profile.overall.trust_tier === "TRUSTED" ? (
          <div className="flex gap-2 mt-auto pt-3 border-t border-white/5">
            <Link
              to={`/profile/${id}`}
              className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Verify
            </Link>
            <Link
              to={`/agents?hire=${id}`}
              className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Hire
            </Link>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-gray-600 font-mono">
                {profile.overall.trust_tier === "MODERATE" ? "Needs higher trust to hire" : "Not yet qualified"}
              </span>
              <Link
                to={`/profile/${id}`}
                className="text-xs text-accent font-medium hover:underline"
              >
                View &rarr;
              </Link>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/30"
                style={{ width: profile.overall.trust_tier === "MODERATE" ? "60%" : profile.overall.trust_tier === "LOW" ? "30%" : "10%" }}
              />
            </div>
            <span className="text-[9px] text-gray-700 font-mono mt-1 block">
              {profile.overall.trust_tier === "MODERATE" ? "Almost there — improve weakest dimensions" : "Build trust across more dimensions"}
            </span>
          </div>
        )
      ) : (
        <Link
          to={`/profile/${id}`}
          className="text-xs text-accent font-medium group-hover:underline mt-auto pt-2"
        >
          View profile &rarr;
        </Link>
      )}
    </div>
  );
}
