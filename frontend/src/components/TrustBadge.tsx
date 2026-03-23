const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  TRUSTED: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  MODERATE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LOW: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  UNKNOWN: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
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
