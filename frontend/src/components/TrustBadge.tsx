const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  TRUSTED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  MODERATE: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  LOW: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  UNKNOWN: { bg: "bg-gray-500/10", text: "text-gray-500", border: "border-gray-500/30" },
};

export default function TrustBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold
                  border font-mono ${style.bg} ${style.text} ${style.border}`}
    >
      {tier}
    </span>
  );
}
