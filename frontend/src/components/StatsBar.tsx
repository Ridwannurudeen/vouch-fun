import { useEffect, useState } from "react";
import { getStats } from "../lib/genlayer";

export default function StatsBar() {
  const [stats, setStats] = useState({ profile_count: 0, query_count: 0 });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex gap-8 text-sm text-gray-500 font-mono">
      <span>{stats.profile_count} profiles generated</span>
      <span>{stats.query_count} queries served</span>
    </div>
  );
}
