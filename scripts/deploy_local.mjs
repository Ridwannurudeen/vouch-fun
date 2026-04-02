import { createClient, createAccount } from 'genlayer-js';
import { localnet } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || '';

// localnet chain (ID 61127) — points to http://127.0.0.1:4000/api by default
const localStudio = localnet;

async function pollTx(client, txHash) {
  for (let i = 0; i < 120; i++) {
    try {
      const tx = await client.getTransaction({ hash: txHash });
      const safe = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      const status = safe.status;
      console.log(`[${i}] status: ${status} result: ${safe.resultName}`);
      if (status >= 4) return safe;
    } catch (e) {
      console.log(`[${i}] poll: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Deploy timed out');
}

async function main() {
  const account = createAccount(PRIVATE_KEY);
  const client = createClient({ chain: localStudio, account });
  console.log('Account:', account.address);

  const code = readFileSync(resolve(__dirname, 'vouch_protocol.py'), 'utf8');
  console.log('Deploying VouchProtocol... (' + code.length + ' bytes)');

  const txHash = await client.deployContract({ code, args: [], value: 0n });
  console.log('TX:', txHash);

  const receipt = await pollTx(client, txHash);
  const addr = receipt?.contractAddress || receipt?.contract_address || receipt?.recipient;
  console.log('\nContract:', addr);

  if (addr) {
    const stats = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
    console.log('Stats:', JSON.stringify(stats));
    const handles = await client.readContract({ address: addr, functionName: 'get_all_handles', args: [] });
    console.log('Handles:', JSON.stringify(handles));
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
