import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TrustProfile } from "../types";
import { DIMENSIONS, DIMENSION_LABELS, type DimensionKey } from "../types";

interface RadarChartProps {
  profileA: TrustProfile;
  profileB?: TrustProfile;
}

const GRADE_VALUE: Record<string, number> = {
  A: 100, B: 75, C: 50, D: 25, F: 10, "N/A": 0,
};

function gradeToNum(grade: string): number {
  return GRADE_VALUE[grade?.charAt(0)?.toUpperCase()] ?? 0;
}

function getId(p: TrustProfile): string {
  return p.identifier || (p as any).handle || "Profile";
}

export default function RadarChart({ profileA, profileB }: RadarChartProps) {
  const idA = getId(profileA);
  const idB = profileB ? getId(profileB) : "";

  const data = DIMENSIONS.map((dim: DimensionKey) => {
    const entry: any = {
      metric: DIMENSION_LABELS[dim],
      [idA]: gradeToNum(profileA[dim]?.grade),
    };
    if (profileB) {
      entry[idB] = gradeToNum(profileB[dim]?.grade);
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={idA}
          dataKey={idA}
          stroke="#818cf8"
          fill="#818cf8"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        {profileB && (
          <Radar
            name={idB}
            dataKey={idB}
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        )}
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
