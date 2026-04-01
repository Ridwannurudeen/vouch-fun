import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { TrustProfile, DimensionScore } from "../types";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const DEMO_KEY = import.meta.env.VITE_DEMO_PRIVATE_KEY || "";
const account = DEMO_KEY ? createAccount(DEMO_KEY) : createAccount();

export const client = createClient({
  chain: testnetBradbury,
  account,
});

export const hasFundedAccount = !!DEMO_KEY;
export const contractAddress = CONTRACT_ADDRESS as `0x${string}`;

function dim(grade: string, confidence: "high" | "medium" | "low" | "none", reasoning: string, key_signals: string[]): DimensionScore {
  return { grade, confidence, reasoning, key_signals };
}

// v3 fallback profiles — 6 dimensions + confidence
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
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && parsed.overall) return parsed;
  } catch {}
  return null;
}

export async function readProfileByHandle(handle: string): Promise<TrustProfile | null> {
  const key = handle.trim().toLowerCase().replace(/^@/, "");
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_profile_by_handle",
      args: [key],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && parsed.overall) return parsed;
  } catch {}
  return DEMO_PROFILES[key] || null;
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

export async function generateProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch",
    args: [handle],
    value: 0n,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function refreshProfile(handle: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "refresh",
    args: [handle],
    value: 0n,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function getStats(): Promise<{ profile_count: number; query_count: number; dispute_count: number }> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_stats",
      args: [],
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (parsed && typeof parsed.profile_count === "number") return parsed;
  } catch {}
  return { profile_count: Object.keys(DEMO_PROFILES).length, query_count: 24, dispute_count: 0 };
}

export async function getAllProfiles(): Promise<TrustProfile[]> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      functionName: "get_all_handles",
      args: [],
    });
    const handles: string[] = typeof result === "string" ? JSON.parse(result) : result;
    if (Array.isArray(handles) && handles.length > 0) {
      const profiles = await Promise.all(handles.map((h: string) => readProfileByHandle(h)));
      return profiles.filter((p): p is TrustProfile => p !== null);
    }
  } catch {}
  return Object.values(DEMO_PROFILES);
}

export async function disputeProfile(handle: string, reason: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "dispute",
    args: [handle, reason],
    value: 0n,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

export async function compareProfiles(handleA: string, handleB: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "compare",
    args: [handleA, handleB],
    value: 0n,
  });
  return client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 5000 });
}

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
