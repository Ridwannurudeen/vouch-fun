export interface DimensionScore {
  grade: string;
  confidence: "high" | "medium" | "low" | "none";
  reasoning: string;
  key_signals: string[];
}

export interface TrustProfile {
  identifier: string;
  identifier_type: "github" | "ens" | "wallet" | "twitter";
  vouched_by?: string;
  sources?: string[];
  code: DimensionScore;
  onchain: DimensionScore;
  social: DimensionScore;
  governance: DimensionScore;
  defi: DimensionScore;
  identity: DimensionScore;
  overall: {
    trust_tier: "TRUSTED" | "MODERATE" | "LOW" | "UNKNOWN";
    trust_score: number;
    summary: string;
    top_signals: string[];
  };
  disputed?: boolean;
  dispute_reason?: string;
  // v2 compat aliases
  handle?: string;
  sources_scraped?: string[];
  code_activity?: any;
  onchain_activity?: any;
}

export const DIMENSIONS = ["code", "onchain", "social", "governance", "defi", "identity"] as const;
export type DimensionKey = typeof DIMENSIONS[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  code: "Code",
  onchain: "On-Chain",
  social: "Social",
  governance: "Governance",
  defi: "DeFi",
  identity: "Identity",
};

export const DIMENSION_ICONS: Record<DimensionKey, string> = {
  code: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  onchain: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  social: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  governance: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  defi: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  identity: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

export interface Comparison {
  summary: string;
  winner: string;
  dims?: Record<string, string>;
  reasoning: string;
}

/** Generic transaction receipt returned by genlayer-js waitForTransactionReceipt */
export interface TransactionReceipt {
  hash?: string;
  status?: number | string;
  [key: string]: unknown;
}

export interface GateCheckResult {
  eligible: boolean;
  reason?: string;
  handle?: string;
  grade?: string;
  required?: string;
}

export interface GateInfo {
  gate: string;
  member_count: number;
  members: Record<string, { grade: string; [key: string]: unknown }>;
}

export interface TrustQueryResult {
  pass: boolean;
  handle?: string;
  dimension?: string;
  required?: string;
  grade?: string;
  confidence?: string;
  overall_score?: number;
  overall_tier?: string;
  fresh?: boolean;
  age_days?: number;
  reason?: string;
}

export interface TrustBatchResult {
  results: TrustQueryResult[];
  total: number;
  passed: number;
}

export interface ProfileAge {
  exists: boolean;
  handle?: string;
  age_days?: number;
  age_seconds?: number;
  fresh?: boolean;
}

export interface DecayInfo {
  ttl_days: number;
  decay_rule?: string;
}

export interface ProtocolStats {
  profile_count: number;
  query_count: number;
  dispute_count: number;
}

export interface FeePool {
  fee_pool: number;
  query_fee: number;
  min_stake: number;
}

export interface StakeEntry {
  grade: string;
  amount: number;
  [key: string]: unknown;
}
