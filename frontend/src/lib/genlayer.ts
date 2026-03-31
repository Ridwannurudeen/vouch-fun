import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { TrustProfile } from "../types";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

// Funded demo account for write operations (testnet only — tokens have no value)
const DEMO_KEY = import.meta.env.VITE_DEMO_PRIVATE_KEY || "";
const account = DEMO_KEY ? createAccount(DEMO_KEY) : createAccount();

export const client = createClient({
  chain: testnetBradbury,
  account,
});

export const hasFundedAccount = !!DEMO_KEY;

export const contractAddress = CONTRACT_ADDRESS as `0x${string}`;

// Fallback demo profiles for when contract has no data or testnet is down
const DEMO_PROFILES: Record<string, TrustProfile> = {
  vbuterin: {
    handle: "vbuterin",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000001",
    code_activity: { grade: "A", repos: 191, commits_last_year: 520, languages: ["Python", "Solidity", "JavaScript"], stars_received: 45000, reasoning: "Creator of Ethereum with mass open-source impact" },
    onchain_activity: { grade: "A", tx_count: 8500, first_tx_age_days: 3200, contracts_deployed: 50, suspicious_patterns: false, reasoning: "Prolific on-chain presence since genesis" },
    overall: { trust_tier: "TRUSTED", summary: "Ethereum co-founder, top-tier developer and thought leader" },
  },
  gakonst: {
    handle: "gakonst",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000002",
    code_activity: { grade: "A", repos: 120, commits_last_year: 380, languages: ["Rust", "Solidity", "TypeScript"], stars_received: 15000, reasoning: "Paradigm CTO, built Foundry and ethers-rs" },
    onchain_activity: { grade: "A", tx_count: 3200, first_tx_age_days: 2100, contracts_deployed: 30, suspicious_patterns: false, reasoning: "Active DeFi contributor with clean history" },
    overall: { trust_tier: "TRUSTED", summary: "Paradigm CTO, prolific Ethereum tooling builder" },
  },
  ridwannurudeen: {
    handle: "ridwannurudeen",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000003",
    code_activity: { grade: "B", repos: 35, commits_last_year: 280, languages: ["Rust", "Python", "TypeScript", "Solidity"], stars_received: 50, reasoning: "Active contributor to multiple blockchain ecosystems" },
    onchain_activity: { grade: "B", tx_count: 450, first_tx_age_days: 800, contracts_deployed: 12, suspicious_patterns: false, reasoning: "Consistent on-chain activity across chains" },
    overall: { trust_tier: "TRUSTED", summary: "Multi-chain developer with consistent contributions" },
  },
  torvalds: {
    handle: "torvalds",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000004",
    code_activity: { grade: "A", repos: 7, commits_last_year: 2800, languages: ["C", "Assembly", "Shell"], stars_received: 180000, reasoning: "Creator and maintainer of Linux kernel" },
    onchain_activity: { grade: "F", tx_count: 0, first_tx_age_days: 0, contracts_deployed: 0, suspicious_patterns: false, reasoning: "No on-chain presence detected" },
    overall: { trust_tier: "MODERATE", summary: "Linux creator, legendary developer with no on-chain activity" },
  },
  andresz1: {
    handle: "andresz1",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000005",
    code_activity: { grade: "B", repos: 45, commits_last_year: 150, languages: ["TypeScript", "JavaScript", "CSS"], stars_received: 3500, reasoning: "Active open-source contributor in web development" },
    onchain_activity: { grade: "C", tx_count: 80, first_tx_age_days: 400, contracts_deployed: 2, suspicious_patterns: false, reasoning: "Moderate on-chain activity" },
    overall: { trust_tier: "MODERATE", summary: "Web developer with growing blockchain involvement" },
  },
  yyx990803: {
    handle: "yyx990803",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000006",
    code_activity: { grade: "A", repos: 180, commits_last_year: 900, languages: ["TypeScript", "JavaScript", "Vue"], stars_received: 210000, reasoning: "Creator of Vue.js, one of the most popular JS frameworks" },
    onchain_activity: { grade: "D", tx_count: 15, first_tx_age_days: 200, contracts_deployed: 0, suspicious_patterns: false, reasoning: "Minimal on-chain presence" },
    overall: { trust_tier: "MODERATE", summary: "Vue.js creator, world-class developer with limited on-chain activity" },
  },
  haydenzadams: {
    handle: "haydenzadams",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000007",
    code_activity: { grade: "B", repos: 25, commits_last_year: 120, languages: ["TypeScript", "Solidity", "JavaScript"], stars_received: 5000, reasoning: "Uniswap creator with focused but impactful repos" },
    onchain_activity: { grade: "A", tx_count: 4200, first_tx_age_days: 2400, contracts_deployed: 35, suspicious_patterns: false, reasoning: "Pioneer DeFi deployer with extensive on-chain history" },
    overall: { trust_tier: "TRUSTED", summary: "Uniswap founder, DeFi pioneer with massive on-chain footprint" },
  },
  samczsun: {
    handle: "samczsun",
    sources_scraped: ["seed"],
    vouched_by: "0x0000000000000000000000000000000000000008",
    code_activity: { grade: "B", repos: 40, commits_last_year: 200, languages: ["Solidity", "Go", "Python"], stars_received: 8000, reasoning: "Prolific security researcher and whitehat" },
    onchain_activity: { grade: "A", tx_count: 1800, first_tx_age_days: 1900, contracts_deployed: 15, suspicious_patterns: false, reasoning: "Active whitehat rescuer with clean on-chain record" },
    overall: { trust_tier: "TRUSTED", summary: "Top blockchain security researcher at Paradigm" },
  },
};

/**
 * Read profile by wallet address (composable API).
 */
export async function readProfile(address: string): Promise<TrustProfile | null> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_profile",
      args: [address.trim().toLowerCase()],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && parsed.overall) return parsed;
  } catch {}
  return null;
}

/**
 * Read profile by GitHub handle (resolves via on-chain index).
 * Falls back to demo profiles if contract returns empty or RPC is down.
 */
export async function readProfileByHandle(handle: string): Promise<TrustProfile | null> {
  const key = handle.trim().toLowerCase();
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_profile_by_handle",
      args: [key],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && parsed.overall) return parsed;
  } catch {}
  // Fallback to demo profile
  return DEMO_PROFILES[key] || null;
}

/**
 * Resolve a GitHub handle to a wallet address.
 */
export async function lookupAddress(handle: string): Promise<string> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "lookup_address",
    args: [handle.trim().toLowerCase()],
  });
  return String(result || "");
}

export async function readTrustTier(address: string): Promise<string> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_trust_tier",
    args: [address.trim().toLowerCase()],
  });
  return String(result);
}

export async function generateProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch",
    args: [handle],
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

export async function refreshProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "refresh",
    args: [handle],
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

export async function getStats(): Promise<{ profile_count: number; query_count: number }> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_stats",
      args: [],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && typeof parsed.profile_count === "number") return parsed;
  } catch {}
  return { profile_count: Object.keys(DEMO_PROFILES).length, query_count: 24 };
}

/**
 * Get all profiles (from contract or fallback to demo data).
 */
export async function getAllProfiles(): Promise<TrustProfile[]> {
  // Try contract first
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_all_handles",
      args: [],
    });
    const handles: string[] = typeof result === "string" ? JSON.parse(result) : result;
    if (Array.isArray(handles) && handles.length > 0) {
      const profiles = await Promise.all(
        handles.map((h: string) => readProfileByHandle(h))
      );
      return profiles.filter((p): p is TrustProfile => p !== null);
    }
  } catch {}
  // Fallback to demo profiles
  return Object.values(DEMO_PROFILES);
}

/**
 * Dispute a profile (submit challenge for re-evaluation).
 */
export async function disputeProfile(handle: string, reason: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "dispute",
    args: [handle, reason],
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

/**
 * Compare two profiles via AI consensus.
 */
export async function compareProfiles(handleA: string, handleB: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "compare",
    args: [handleA, handleB],
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

/**
 * Get stored comparison result.
 */
export async function getComparison(handleA: string, handleB: string): Promise<any> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_comparison",
      args: [handleA, handleB],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && parsed.summary) return parsed;
  } catch {}
  return null;
}
