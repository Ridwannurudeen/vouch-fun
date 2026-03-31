import { motion } from "framer-motion";

const GRADE_WIDTHS: Record<string, number> = {
  A: 95,
  B: 75,
  C: 55,
  D: 35,
  F: 15,
  "N/A": 5,
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-red-500",
  "N/A": "bg-gray-300",
};

interface GradeBarProps {
  label: string;
  grade: string;
}

export default function GradeBar({ label, grade }: GradeBarProps) {
  const letter = grade.charAt(0).toUpperCase();
  const width = GRADE_WIDTHS[letter] ?? 5;
  const color = GRADE_COLORS[letter] ?? "bg-gray-300";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 text-right">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-gray-700 w-6">{grade}</span>
    </div>
  );
}
