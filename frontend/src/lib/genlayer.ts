import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

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
const DEMO_PROFILES: Record<string, any> = {
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
};

/**
 * Read profile by wallet address (composable API).
 */
export async function readProfile(address: string): Promise<any> {
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
export async function readProfileByHandle(handle: string): Promise<any> {
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
  return { profile_count: 3, query_count: 3 };
}
