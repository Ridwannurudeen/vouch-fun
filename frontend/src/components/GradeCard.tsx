import type { DimensionScore, DimensionKey } from "../types";
import { DIMENSION_ICONS } from "../types";

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 bg-green-50 border-green-200",
  B: "text-blue-600 bg-blue-50 border-blue-200",
  C: "text-amber-600 bg-amber-50 border-amber-200",
  D: "text-orange-600 bg-orange-50 border-orange-200",
  F: "text-red-600 bg-red-50 border-red-200",
  "N/A": "text-gray-400 bg-gray-50 border-gray-200",
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
  none: "bg-gray-100 text-gray-400",
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
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
          <h3 className="font-semibold text-gray-900">{title}</h3>
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
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {signal}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-600 italic">{score.reasoning}</p>
    </div>
  );
}
