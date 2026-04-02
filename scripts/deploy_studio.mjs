import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || '';

async function pollTx(client, txHash) {
  for (let i = 0; i < 60; i++) {
    try {
      const tx = await client.getTransaction({ hash: txHash });
      const safe = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      const status = safe.status;
      console.log(`[${i}] status: ${status} result: ${safe.resultName}`);
      if (status >= 4) return safe;
    } catch (e) {
      console.log(`[${i}] poll: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Deploy timed out');
}

async function main() {
  const account = createAccount(PRIVATE_KEY);
  const client = createClient({ chain: studionet, account });
  console.log('Account:', account.address);

  const code = readFileSync(resolve(__dirname, '../contracts/vouch_protocol.py'), 'utf8');
  console.log('Deploying VouchProtocol to Studio... (' + code.length + ' bytes)');

  const txHash = await client.deployContract({ code, args: [], value: 0n });
  console.log('TX:', txHash);

  const receipt = await pollTx(client, txHash);
  const addr = receipt?.contractAddress || receipt?.contract_address || receipt?.recipient;
  console.log('\nContract:', addr);

  if (addr) {
    // Verify reads work
    const stats = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
    console.log('Stats:', JSON.stringify(stats));
    const handles = await client.readContract({ address: addr, functionName: 'get_all_handles', args: [] });
    console.log('Handles:', JSON.stringify(handles));
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
