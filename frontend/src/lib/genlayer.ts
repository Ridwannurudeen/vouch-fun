import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury, localnet } from "genlayer-js/chains";
import type {
  TrustProfile,
  DimensionScore,

  GateCheckResult,
  GateInfo,
  TrustQueryResult,
  TrustBatchResult,
  ProfileAge,
  DecayInfo,
  Comparison,
  ProtocolStats,
  FeePool,
  StakeEntry,
} from "../types";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const DEMO_KEY = import.meta.env.VITE_DEMO_PRIVATE_KEY || "";
const USE_STUDIO = import.meta.env.VITE_USE_STUDIO === "true";
const STUDIO_RPC = import.meta.env.VITE_STUDIO_RPC_URL || "";
const account = DEMO_KEY ? createAccount(DEMO_KEY) : createAccount();

// If custom Studio RPC URL is set, use localnet chain (61127) with overridden RPC
const chain = USE_STUDIO
  ? STUDIO_RPC
    ? { ...localnet, rpcUrls: { default: { http: [STUDIO_RPC] } } }
    : localnet
  : testnetBradbury;

export const client = createClient({
  chain,
  account,
});

export const hasFundedAccount = !!DEMO_KEY;
export const contractAddress = CONTRACT_ADDRESS as `0x${string}`;
export const chainName = USE_STUDIO ? "GenLayer Studio (local)" : "Bradbury Testnet";
export const isOnBradbury = !USE_STUDIO;

function dim(grade: string, confidence: "high" | "medium" | "low" | "none", reasoning: string, key_signals: string[]): DimensionScore {
  return { grade, confidence, reasoning, key_signals };
}

// Fallback profiles — shown only when contract is unreachable
// These are clearly marked as demo data in the UI
const DEMO_PROFILES: Record<string, TrustProfile> = {
  vbuterin: {
    identifier: "vbuterin", identifier_type: "github",
    vouched_by: "0x0000000000000000000000000000000000000001", sources: ["seed"],
    code: dim("A", "high", "Creator of Ethereum with mass open-source impact across 190+ repos", ["190+ repos", "45k stars", "Python/Solidity/JS"]),
    onchain: dim("A", "high", "Prolific on-chain presence since Ethereum genesis block", ["8500+ transactions", "Genesis account", "50+ contracts"]),
    social: dim("A", "high", "5M+ Twitter followers, crypto thought leader and philosopher", ["5.2M followers", "Blog author", "Conference keynotes"]),
    governance: dim("B", "high", "EIP author, Ethereum governance voice through public discourse", ["EIP author", "ETH governance", "Public discourse"]),
    defi: dim("B", "medium", "Interacts with major DeFi protocols including Uniswap and Gitcoin", ["Uniswap user", "Gitcoin donor", "ENS participant"]),
    identity: dim("A", "high", "vitalik.eth ENS, verified across all major platforms", ["vitalik.eth", "Verified Twitter", "Lens/Farcaster"]),
    overall: { trust_tier: "TRUSTED", trust_score: 91, summary: "Ethereum co-founder — top trust across code, on-chain, social, and identity dimensions", top_signals: ["Ethereum creator", "5.2M followers", "45k GitHub stars"] },
  },
  gakonst: {
    identifier: "gakonst", identifier_type: "github",
    vouched_by: "0x0000000000000000000000000000000000000002", sources: ["seed"],
    code: dim("A", "high", "Creator of Foundry and ethers-rs, core Ethereum tooling", ["120+ repos", "25k stars", "Rust/Solidity/TS"]),
    onchain: dim("A", "high", "Active DeFi contributor with extensive on-chain history", ["3200+ transactions", "2100-day account", "30+ contracts"]),
    social: dim("B", "high", "Active on Twitter, respected engineering voice", ["100k+ followers", "Technical threads", "Paradigm CTO"]),
    governance: dim("B", "medium", "Involved in Ethereum governance through tooling and standards", ["EIP contributions", "Tooling governance"]),
    defi: dim("A", "high", "Deep DeFi experience through Paradigm investments and tooling", ["Paradigm portfolio", "DeFi tooling", "Protocol analysis"]),
    identity: dim("A", "high", "Well-known identity across crypto ecosystem", ["Verified Twitter", "ENS name", "Paradigm CTO"]),
    overall: { trust_tier: "TRUSTED", trust_score: 88, summary: "Paradigm CTO, prolific Ethereum tooling builder with strong DeFi presence", top_signals: ["Foundry creator", "Paradigm CTO", "25k GitHub stars"] },
  },
  ridwannurudeen: {
    identifier: "ridwannurudeen", identifier_type: "github",
    vouched_by: "0x0000000000000000000000000000000000000003", sources: ["seed"],
    code: dim("B", "medium", "Active multi-chain developer contributing to multiple ecosystems", ["35+ repos", "280 commits/yr", "Rust/Python/TS/Solidity"]),
    onchain: dim("B", "medium", "Consistent on-chain activity across multiple networks", ["450+ transactions", "12 contracts deployed", "Multi-chain"]),
    social: dim("C", "low", "Moderate social presence with primarily technical content", ["Twitter active", "Technical posts"]),
    governance: dim("C", "low", "Some governance participation in smaller DAOs", ["Occasional votes", "Limited delegation"]),
    defi: dim("C", "low", "Moderate DeFi usage across testnets and mainnet", ["Testnet DeFi", "Some mainnet swaps"]),
    identity: dim("B", "medium", "GitHub established with growing cross-platform identity", ["GitHub active", "Multiple chain addresses"]),
    overall: { trust_tier: "MODERATE", trust_score: 62, summary: "Active multi-chain builder with solid code and growing presence", top_signals: ["Multi-chain dev", "35+ repos", "Consistent activity"] },
  },
  torvalds: {
    identifier: "torvalds", identifier_type: "github",
    vouched_by: "0x0000000000000000000000000000000000000004", sources: ["seed"],
    code: dim("A", "high", "Creator and maintainer of Linux kernel, most impactful OSS project", ["Linux creator", "180k stars", "2800 commits/yr"]),
    onchain: dim("F", "high", "No known blockchain or cryptocurrency activity", ["No wallet", "No transactions"]),
    social: dim("B", "medium", "Famous through mailing lists and conferences, limited social media", ["LKML active", "Conference speaker"]),
    governance: dim("F", "high", "No DAO or blockchain governance participation", ["No votes", "No proposals"]),
    defi: dim("F", "high", "No DeFi activity detected", ["No DeFi interactions"]),
    identity: dim("C", "medium", "GitHub identity well-established, no blockchain identity", ["GitHub verified", "No ENS"]),
    overall: { trust_tier: "MODERATE", trust_score: 48, summary: "Linux creator — legendary developer with zero crypto presence", top_signals: ["Linux kernel creator", "180k GitHub stars", "No crypto activity"] },
  },
  haydenzadams: {
    identifier: "haydenzadams", identifier_type: "github",
    vouched_by: "0x0000000000000000000000000000000000000005", sources: ["seed"],
    code: dim("B", "high", "Uniswap creator with focused but high-impact repositories", ["25+ repos", "5k stars", "TS/Solidity"]),
    onchain: dim("A", "high", "Pioneer DeFi deployer with extensive on-chain history", ["4200+ transactions", "35+ contracts", "Uniswap deployer"]),
    social: dim("A", "high", "Major crypto voice, Uniswap brand ambassador", ["500k+ followers", "DeFi thought leader"]),
    governance: dim("A", "high", "Central to Uniswap governance and DeFi governance broadly", ["UNI governance", "Protocol proposals"]),
    defi: dim("A", "high", "Created one of the largest DeFi protocols", ["Uniswap creator", "DeFi pioneer", "Massive TVL"]),
    identity: dim("A", "high", "Well-known identity, verified everywhere", ["Verified Twitter", "ENS", "Public figure"]),
    overall: { trust_tier: "TRUSTED", trust_score: 92, summary: "Uniswap founder — DeFi pioneer with top-tier governance and on-chain presence", top_signals: ["Uniswap creator", "DeFi pioneer", "A+ governance"] },
  },
  samczsun: {
    identifier: "samczsun", identifier_type: "github",
    vouched_by: "0x0000000000000000000000000000000000000006", sources: ["seed"],
    code: dim("B", "high", "Prolific security researcher and whitehat hacker", ["40+ repos", "8k stars", "Solidity/Go/Python"]),
    onchain: dim("A", "high", "Active whitehat rescuer with clean on-chain record", ["1800+ transactions", "Whitehat rescues", "15+ contracts"]),
    social: dim("A", "high", "Top blockchain security voice, widely respected", ["300k+ followers", "Security disclosures", "Research posts"]),
    governance: dim("B", "medium", "Involved in security governance and protocol upgrades", ["Security proposals", "Protocol reviews"]),
    defi: dim("A", "high", "Deep DeFi knowledge through security auditing and rescue operations", ["Protocol auditor", "Whitehat rescues", "DeFi security"]),
    identity: dim("A", "high", "Well-known pseudonymous identity, Paradigm researcher", ["samczsun.com", "Paradigm", "Verified Twitter"]),
    overall: { trust_tier: "TRUSTED", trust_score: 90, summary: "Top blockchain security researcher at Paradigm, trusted across all dimensions", top_signals: ["Whitehat hacker", "Paradigm researcher", "300k+ followers"] },
  },
};

export async function readProfile(address: string): Promise<TrustProfile | null> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_profile",
      args: [address.trim().toLowerCase()],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    if (parsed && parsed.overall) return parsed;
  } catch {}
  return null;
}

// Track whether we're serving live or fallback data
export let isUsingFallbackData = false;

export async function readProfileByHandle(handle: string): Promise<TrustProfile | null> {
  const key = handle.trim().toLowerCase();
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_profile_by_handle",
      args: [key],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    if (parsed && parsed.overall) { isUsingFallbackData = false; return parsed; }
  } catch {}
  const demo = DEMO_PROFILES[key];
  if (demo) {
    isUsingFallbackData = true;
    return { ...demo, _demo: true } as TrustProfile;
  }
  return null;
}

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

// Query fee in wei — must match contract QUERY_FEE constant
export const QUERY_FEE = 1000n;
export const MIN_STAKE = 5000n;

export async function generateProfile(handle: string, walletAddress: string = ""): Promise<any> {
  const args: string[] = walletAddress ? [handle, walletAddress] : [handle];
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch",
    args,
    value: QUERY_FEE,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function refreshProfile(handle: string, walletAddress: string = ""): Promise<any> {
  const args: string[] = walletAddress ? [handle, walletAddress] : [handle];
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "refresh",
    args,
    value: QUERY_FEE,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function stakeVouch(identifier: string, dimension: string, grade: string, amount?: bigint): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "stake_vouch",
    args: [identifier, dimension, grade],
    value: amount ?? MIN_STAKE,
    leaderOnly: false,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function getStakes(identifier: string): Promise<Record<string, StakeEntry[]>> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_stakes",
      args: [identifier],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return {};
  }
}

export async function getFeePool(): Promise<FeePool> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_fee_pool",
      args: [],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    if (parsed && typeof parsed.fee_pool === "number") return parsed;
  } catch {}
  return { fee_pool: 0, query_fee: 1000, min_stake: 5000 };
}

export async function getStats(): Promise<ProtocolStats> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_stats",
      args: [],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    if (parsed && typeof parsed.profile_count === "number") return parsed;
  } catch {}
  return { profile_count: Object.keys(DEMO_PROFILES).length, query_count: 0, dispute_count: 0, _demo: true } as any;
}

// In-memory profile cache with 5-minute TTL (stale-while-revalidate)
const CACHE_TTL = 5 * 60 * 1000;
let profileCache: { profiles: TrustProfile[]; timestamp: number } | null = null;

export function invalidateCache() {
  profileCache = null;
}

async function fetchAllProfilesFresh(): Promise<TrustProfile[]> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_all_handles",
      args: [],
    });
    const handles: string[] = typeof result === "string" ? JSON.parse(result) : (result as any);
    if (Array.isArray(handles) && handles.length > 0) {
      isUsingFallbackData = false;
      const profiles = await Promise.all(handles.map((h: string) => readProfileByHandle(h)));
      return profiles.filter((p): p is TrustProfile => p !== null);
    }
  } catch {}
  isUsingFallbackData = true;
  return Object.values(DEMO_PROFILES).map(p => ({ ...p, _demo: true } as TrustProfile));
}

export async function getAllProfiles(): Promise<TrustProfile[]> {
  const now = Date.now();
  if (profileCache && now - profileCache.timestamp < CACHE_TTL) {
    // Stale-while-revalidate: return cached, refresh in background
    fetchAllProfilesFresh().then((fresh) => {
      profileCache = { profiles: fresh, timestamp: Date.now() };
    }).catch(() => {});
    return profileCache.profiles;
  }
  const profiles = await fetchAllProfilesFresh();
  profileCache = { profiles, timestamp: Date.now() };
  return profiles;
}

export async function disputeProfile(handle: string, reason: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "dispute",
    args: [handle, reason],
    value: QUERY_FEE,
    leaderOnly: false,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function compareProfiles(handleA: string, handleB: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "compare",
    args: [handleA, handleB],
    value: QUERY_FEE,
    leaderOnly: false,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

// === TrustGate composability functions ===

export async function gateCheck(handle: string, dimension: string, minGrade: string): Promise<GateCheckResult> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "gate_check",
      args: [handle.trim().toLowerCase(), dimension, minGrade],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return { eligible: false, reason: "Error checking gate" };
  }
}

export async function gateRegister(handle: string, gateName: string, dimension: string, minGrade: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "gate_register",
    args: [handle, gateName, dimension, minGrade],
    value: 0n,
    leaderOnly: false,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 60, interval: 5000 });
}

export async function gateInfo(gateName: string): Promise<GateInfo> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "gate_info",
      args: [gateName],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return { gate: gateName, member_count: 0, members: {} };
  }
}

export async function gateMembers(gateName: string): Promise<string[]> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "gate_members",
      args: [gateName],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// === Trust Oracle: Chainlink-for-Reputation ===

export async function trustQuery(identifier: string, dimension: string, minGrade: string): Promise<TrustQueryResult> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "trust_query",
      args: [identifier.trim().toLowerCase(), dimension, minGrade],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return { pass: false, reason: "Error querying trust oracle" };
  }
}

export async function trustBatchQuery(identifiers: string[], dimension: string, minGrade: string): Promise<TrustBatchResult> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "trust_batch_query",
      args: [JSON.stringify(identifiers), dimension, minGrade],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return { results: [], total: 0, passed: 0 };
  }
}

export async function listGates(): Promise<{ name: string; [key: string]: unknown }[]> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "list_gates",
      args: [],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getProfileAge(identifier: string): Promise<ProfileAge> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_profile_age",
      args: [identifier.trim().toLowerCase()],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return { exists: false };
  }
}

export async function getDecayInfo(): Promise<DecayInfo> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_decay_info",
      args: [],
    });
    return typeof result === "string" ? JSON.parse(result) : (result as any);
  } catch {
    return { ttl_days: 90 };
  }
}

export async function getComparison(handleA: string, handleB: string): Promise<Comparison | null> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_comparison",
      args: [handleA, handleB],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : (result as any);
    if (parsed && parsed.summary) return parsed;
  } catch {}
  return null;
}
