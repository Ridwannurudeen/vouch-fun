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

/**
 * Read profile by wallet address (composable API).
 */
export async function readProfile(address: string): Promise<any> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_profile",
    args: [address.trim().toLowerCase()],
  });
  try {
    return typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    return null;
  }
}

/**
 * Read profile by GitHub handle (resolves via on-chain index).
 */
export async function readProfileByHandle(handle: string): Promise<any> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_profile_by_handle",
    args: [handle.trim().toLowerCase()],
  });
  try {
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (!parsed || !parsed.overall) return null;
    return parsed;
  } catch {
    return null;
  }
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
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_stats",
    args: [],
  });
  try {
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return parsed as { profile_count: number; query_count: number };
  } catch {
    return { profile_count: 0, query_count: 0 };
  }
}
