export interface CodeActivity {
  grade: string;
  repos: number;
  commits_last_year: number;
  languages: string[];
  stars_received: number;
  reasoning: string;
}

export interface OnchainActivity {
  grade: string;
  tx_count: number;
  first_tx_age_days: number;
  contracts_deployed: number;
  suspicious_patterns: boolean;
  reasoning: string;
}

export interface TrustProfile {
  handle: string;
  sources_scraped: string[];
  vouched_by?: string;
  code_activity: CodeActivity;
  onchain_activity: OnchainActivity;
  overall: {
    trust_tier: "TRUSTED" | "MODERATE" | "LOW" | "UNKNOWN";
    summary: string;
  };
  disputed?: boolean;
  dispute_reason?: string;
}

export interface Comparison {
  handle_a: string;
  handle_b: string;
  summary: string;
  winner: string;
  reasoning: string;
}
