import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { GenLayerClient } from "genlayer-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function main(client: GenLayerClient<any>) {
  const contractPath = resolve(__dirname, "../contracts/vouch_protocol.py");
  const contractCode = new Uint8Array(readFileSync(contractPath));

  console.log("Initializing consensus smart contract...");
  await client.initializeConsensusSmartContract();

  console.log("Deploying VouchProtocol...");
  const deployTx = await client.deployContract({
    code: contractCode,
    args: [],
  });

  console.log(`Deploy TX: ${deployTx}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTx,
    retries: 200,
    interval: 5000,
  });

  console.log("Deploy receipt:", JSON.stringify(receipt, null, 2));

  // Receipt structure differs between networks
  const contractAddress =
    (receipt as any)?.data?.contract_address ||
    (receipt as any)?.contract_address ||
    (receipt as any)?.result?.contract_address;

  if (contractAddress) {
    console.log(`\nVouchProtocol deployed at: ${contractAddress}`);
    console.log(`\nAdd to frontend/.env:\nVITE_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    console.log("\nCould not extract address -- check receipt above.");
  }
}
