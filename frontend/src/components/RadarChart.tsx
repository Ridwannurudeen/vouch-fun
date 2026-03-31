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

interface RadarChartProps {
  profileA: TrustProfile;
  profileB: TrustProfile;
}

function normalize(value: number, max: number): number {
  return Math.min(100, Math.round((value / max) * 100));
}

export default function RadarChart({ profileA, profileB }: RadarChartProps) {
  const data = [
    {
      metric: "Repos",
      [profileA.handle]: normalize(profileA.code_activity.repos, 200),
      [profileB.handle]: normalize(profileB.code_activity.repos, 200),
    },
    {
      metric: "Commits",
      [profileA.handle]: normalize(profileA.code_activity.commits_last_year, 600),
      [profileB.handle]: normalize(profileB.code_activity.commits_last_year, 600),
    },
    {
      metric: "Stars",
      [profileA.handle]: normalize(profileA.code_activity.stars_received, 50000),
      [profileB.handle]: normalize(profileB.code_activity.stars_received, 50000),
    },
    {
      metric: "Tx Count",
      [profileA.handle]: normalize(profileA.onchain_activity.tx_count, 10000),
      [profileB.handle]: normalize(profileB.onchain_activity.tx_count, 10000),
    },
    {
      metric: "Account Age",
      [profileA.handle]: normalize(profileA.onchain_activity.first_tx_age_days, 3500),
      [profileB.handle]: normalize(profileB.onchain_activity.first_tx_age_days, 3500),
    },
    {
      metric: "Contracts",
      [profileA.handle]: normalize(profileA.onchain_activity.contracts_deployed, 60),
      [profileB.handle]: normalize(profileB.onchain_activity.contracts_deployed, 60),
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={profileA.handle}
          dataKey={profileA.handle}
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Radar
          name={profileB.handle}
          dataKey={profileB.handle}
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
