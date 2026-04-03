import { createClient, createAccount } from 'genlayer-js';
import { localnet } from 'genlayer-js/chains';

const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const CONTRACT = '0x69690E34f49F29344A393707FF5f364eFc40B0A1';
const RPC_URL = 'https://vouch.gudman.xyz/studio-rpc';

// Override localnet chain with self-hosted Studio RPC
const chain = { ...localnet, rpcUrls: { default: { http: [RPC_URL] } } };

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain, account });

// Seeds: vbuterin, torvalds, aaveaave (deployed with contract)
// Adding diverse profiles for demo
const HANDLES = [
  'ggudman1',         // Project creator
  'samczsun',         // Security researcher legend
  'gakonst',          // Paradigm CTO, Foundry creator
  'haydenzadams',     // Uniswap creator
  'pcaversaccio',     // Security researcher, snekmate
  'transmissions11',  // Paradigm, Solmate/Solady
  'frangio',          // OpenZeppelin core
  'banteg',           // Yearn core
  'lefteris',         // Rotki creator
];

const QUERY_FEE = 1000n;

async function main() {
  console.log('Account:', account.address);

  // Check existing
  console.log('Checking existing profiles...');
  try {
    const handles = await client.readContract({
      address: CONTRACT,
      functionName: 'get_all_handles',
      args: [],
    });
    const parsed = typeof handles === 'string' ? JSON.parse(handles) : handles;
    console.log('Existing:', parsed);
  } catch (e) {
    console.log('Read error:', e.message);
  }

  for (const handle of HANDLES) {
    console.log(`\n--- Vouching: ${handle} ---`);
    try {
      const txHash = await client.writeContract({
        address: CONTRACT,
        functionName: 'vouch',
        args: [handle],
        value: 0n,
      });
      console.log('  TX hash:', txHash);
      if (!txHash) {
        console.log('  No txHash returned, skipping');
        continue;
      }
      console.log('  Waiting for receipt (up to 10 min)...');
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        retries: 120,
        interval: 5000,
      });
      console.log('  Receipt status:', receipt?.status);
      console.log('  Done!');
    } catch (e) {
      console.log('  FAILED:', e.message);
      if (e.cause) console.log('  Cause:', JSON.stringify(e.cause));
    }
  }

  // Final count
  console.log('\n--- Final stats ---');
  const stats = await client.readContract({
    address: CONTRACT,
    functionName: 'get_stats',
    args: [],
  });
  console.log(typeof stats === 'string' ? JSON.parse(stats) : stats);

  const handles = await client.readContract({
    address: CONTRACT,
    functionName: 'get_all_handles',
    args: [],
  });
  console.log('All handles:', typeof handles === 'string' ? JSON.parse(handles) : handles);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
