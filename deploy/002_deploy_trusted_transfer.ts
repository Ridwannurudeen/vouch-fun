import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VOUCH_ADDRESS = process.env.VOUCH_CONTRACT_ADDRESS || "";

async function main() {
  if (!VOUCH_ADDRESS) {
    console.error("Set VOUCH_CONTRACT_ADDRESS env var first.");
    process.exit(1);
  }

  const contractPath = resolve(__dirname, "../contracts/trusted_transfer.py");
  const contractCode = new Uint8Array(readFileSync(contractPath));

  const account = createAccount();
  const client = createClient({ chain: testnetBradbury, account });

  console.log(`Deploying TrustedTransfer (vouch=${VOUCH_ADDRESS}, min=MODERATE)...`);
  const deployTx = await client.deployContract({
    code: contractCode,
    args: [VOUCH_ADDRESS, "MODERATE"],
    value: 0n,
  });

  console.log(`Deploy TX: ${deployTx}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTx,
    retries: 200,
    interval: 5000,
  });

  console.log("Deploy receipt:", JSON.stringify(receipt, null, 2));

  const contractAddress =
    (receipt as any)?.data?.contract_address ||
    (receipt as any)?.contract_address ||
    (receipt as any)?.result?.contract_address;

  if (contractAddress) {
    console.log(`\nTrustedTransfer deployed at: ${contractAddress}`);
  } else {
    console.log("\nCould not extract address -- check receipt above.");
  }
}

main().catch(console.error);
