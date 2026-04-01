import type { DimensionScore, DimensionKey } from "../types";
import { DIMENSION_ICONS } from "../types";

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400 bg-green-500/10 border-green-500/30",
  B: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  C: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  D: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  F: "text-red-400 bg-red-500/10 border-red-500/30",
  "N/A": "text-gray-500 bg-gray-500/10 border-gray-500/30",
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-green-500/15 text-green-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-red-500/15 text-red-400",
  none: "bg-gray-500/15 text-gray-500",
};

function gradeStyle(grade: string) {
  const letter = grade?.charAt(0)?.toUpperCase() || "N/A";
  return GRADE_COLORS[letter] || GRADE_COLORS["N/A"];
}

interface GradeCardProps {
  title: string;
  dimension: DimensionKey;
  score: DimensionScore;
}

export default function GradeCard({ title, dimension, score }: GradeCardProps) {
  const iconPath = DIMENSION_ICONS[dimension];

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${CONFIDENCE_STYLE[score.confidence] || CONFIDENCE_STYLE.none}`}>
            {score.confidence}
          </span>
          <span className={`px-3 py-1 rounded-lg text-lg font-bold font-mono border ${gradeStyle(score.grade)}`}>
            {score.grade}
          </span>
        </div>
      </div>

      {score.key_signals && score.key_signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {score.key_signals.map((signal, i) => (
            <span key={i} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded">
              {signal}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-400 italic">{score.reasoning}</p>
    </div>
  );
}
