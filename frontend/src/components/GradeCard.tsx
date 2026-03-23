const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 bg-green-50 border-green-200",
  B: "text-blue-600 bg-blue-50 border-blue-200",
  C: "text-amber-600 bg-amber-50 border-amber-200",
  D: "text-orange-600 bg-orange-50 border-orange-200",
  F: "text-red-600 bg-red-50 border-red-200",
  "N/A": "text-gray-400 bg-gray-50 border-gray-200",
};

function gradeStyle(grade: string) {
  const letter = grade.charAt(0).toUpperCase();
  return GRADE_COLORS[letter] || GRADE_COLORS["N/A"];
}

interface GradeCardProps {
  title: string;
  grade: string;
  reasoning: string;
  stats: { label: string; value: string | number }[];
}

export default function GradeCard({ title, grade, reasoning, stats }: GradeCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`px-3 py-1 rounded-lg text-lg font-bold font-mono border ${gradeStyle(grade)}`}>
          {grade}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs text-gray-400 uppercase">{s.label}</div>
            <div className="text-sm font-mono text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600 italic">{reasoning}</p>
    </div>
  );
}
