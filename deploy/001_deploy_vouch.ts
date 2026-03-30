import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.GENLAYER_PRIVATE_KEY || "";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Set GENLAYER_PRIVATE_KEY env var.");
    console.error("Get testnet GEN from: https://testnet-faucet.genlayer.foundation/");
    process.exit(1);
  }

  const account = createAccount(PRIVATE_KEY);
  console.log("Account:", account.address);

  const client = createClient({ chain: testnetBradbury, account });

  // Check balance
  const balanceHex = await client.request({
    method: "eth_getBalance",
    params: [account.address, "latest"],
  });
  const balanceWei = BigInt(balanceHex as string);
  const balanceGEN = Number(balanceWei) / 1e18;
  console.log(`Balance: ${balanceGEN.toFixed(4)} GEN`);

  if (balanceGEN < 0.01) {
    console.error(`\nInsufficient balance. Faucet: https://testnet-faucet.genlayer.foundation/`);
    console.error(`Enter address: ${account.address}`);
    process.exit(1);
  }

  const contractPath = resolve(__dirname, "../contracts/vouch_protocol.py");
  const contractCode = readFileSync(contractPath, "utf8");
  console.log(`Contract: ${contractCode.length} bytes`);

  console.log("\nDeploying VouchProtocol to Bradbury...");
  const txHash = await client.deployContract({
    code: contractCode,
    args: [],
    value: 0n,
  });
  console.log(`Deploy TX: ${txHash}`);

  console.log("Waiting for consensus (30-120s)...");
  const { TransactionStatus } = await import("genlayer-js/types");
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });

  const safeReceipt = JSON.parse(
    JSON.stringify(receipt, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  console.log("Receipt:", JSON.stringify(safeReceipt, null, 2));

  const contractAddress =
    (receipt as any)?.contractAddress ||
    (receipt as any)?.contract_address ||
    (receipt as any)?.recipient ||
    (receipt as any)?.data?.contractAddress;

  if (contractAddress) {
    console.log(`\nVouchProtocol deployed at: ${contractAddress}`);
    console.log(`Explorer: https://explorer-bradbury.genlayer.com/contracts/${contractAddress}`);
    console.log(`\nAdd to frontend/.env:\nVITE_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    console.log("\nCould not extract address -- check receipt above.");
  }
}

main().catch(console.error);
