import { createClient, createAccount } from "genlayer-js";
import { localnet, studionet, testnetAsimov } from "genlayer-js/chains";

// Dynamic chain selection based on env
const NETWORK = import.meta.env.VITE_NETWORK || "studionet";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

// NOTE: createAccount() is ephemeral — new account on every page load.
const account = createAccount();

function getChain() {
  if (NETWORK === "localnet") return localnet;
  if (NETWORK === "testnet-asimov" || NETWORK === "testnet-bradbury") return testnetAsimov;
  return studionet;
}

export const client = createClient({
  chain: getChain(),
  account,
});

export const contractAddress = CONTRACT_ADDRESS as `0x${string}`;

export async function readProfile(handle: string): Promise<any> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_profile",
    args: [handle.trim().toLowerCase()],
  });
  try {
    return typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    return null;
  }
}

export async function readTrustTier(handle: string): Promise<string> {
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_trust_tier",
    args: [handle.trim().toLowerCase()],
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

export async function generateAddressProfile(address: string): Promise<any> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "vouch_address",
    args: [address],
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
