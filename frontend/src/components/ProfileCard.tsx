import { Link } from "react-router-dom";
import TrustBadge from "./TrustBadge";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

const GRADE_STYLE: Record<string, string> = {
  A: "bg-green-50 text-green-700",
  B: "bg-blue-50 text-blue-700",
  C: "bg-amber-50 text-amber-700",
  D: "bg-orange-50 text-orange-700",
  F: "bg-red-50 text-red-700",
};

function gradeClass(grade: string) {
  return GRADE_STYLE[grade?.charAt(0)?.toUpperCase()] || "bg-gray-50 text-gray-500";
}

interface ProfileCardProps {
  profile: TrustProfile;
  compact?: boolean;
}

export default function ProfileCard({ profile, compact }: ProfileCardProps) {
  const id = profile.identifier || (profile as any).handle || "";

  return (
    <Link
      to={`/profile/${id}`}
      className="block border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-400
                 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold font-mono text-gray-900 group-hover:text-indigo-600 transition-colors">
            {id}
          </h3>
          {profile.overall.trust_score != null && (
            <span className="text-xs text-gray-400 font-mono">
              Score: {profile.overall.trust_score}
            </span>
          )}
        </div>
        <TrustBadge tier={profile.overall.trust_tier} />
      </div>

      {!compact && (
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

          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {profile.overall.summary}
          </p>
        </>
      )}

      <span className="text-xs text-indigo-500 font-medium group-hover:underline">
        View profile &rarr;
      </span>
    </Link>
  );
}
