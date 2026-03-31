import { Link } from "react-router-dom";
import TrustBadge from "./TrustBadge";
import type { TrustProfile } from "../types";

interface ProfileCardProps {
  profile: TrustProfile;
  compact?: boolean;
}

export default function ProfileCard({ profile, compact }: ProfileCardProps) {
  const code = profile.code_activity;
  const onchain = profile.onchain_activity;

  return (
    <Link
      to={`/profile/${profile.handle}`}
      className="block border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-400
                 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold font-mono text-gray-900 group-hover:text-indigo-600 transition-colors">
          {profile.handle}
        </h3>
        <TrustBadge tier={profile.overall.trust_tier} />
      </div>

      {!compact && (
        <>
          <div className="flex gap-3 mb-3">
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                code.grade <= "B"
                  ? "bg-green-50 text-green-700"
                  : code.grade <= "C"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              Code: {code.grade}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                onchain.grade <= "B"
                  ? "bg-green-50 text-green-700"
                  : onchain.grade <= "C"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              On-chain: {onchain.grade}
            </span>
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
