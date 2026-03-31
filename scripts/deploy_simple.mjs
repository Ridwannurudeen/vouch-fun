import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
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
            const s = safe.status;
            const v = safe.lastRound?.validatorVotesName;
            console.log(`[${i}] s:${s} v:${v}`);
            if (s >= 4) return safe;
        } catch (e) {
            if (!e.message.includes('fetch failed')) console.log(`[${i}] ${e.message.slice(0, 50)}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });

    // Deploy
    const code = readFileSync(resolve(__dirname, 'test_simple.py'), 'utf8');
    console.log('Deploying SimpleTest...');
    const dtx = await client.deployContract({ code, args: [], value: 0n, gas: 10000000n });
    console.log('Deploy TX:', dtx);
    const dr = await pollTx(client, dtx);
    const addr = dr?.contractAddress || dr?.contract_address || dr?.recipient || dr?.data?.contractAddress;
    console.log('Address:', addr);

    // Test 1: ping (no args)
    console.log('\nTest 1: ping()...');
    const tx1 = await client.writeContract({ address: addr, functionName: 'ping', args: [], value: 0n, gas: 10000000n });
    console.log('TX:', tx1);
    await pollTx(client, tx1);
    const c1 = await client.readContract({ address: addr, functionName: 'get_count', args: [] });
    console.log('Count after ping:', c1);

    // Test 2: store (with args)
    console.log('\nTest 2: store("hello", "world")...');
    const tx2 = await client.writeContract({ address: addr, functionName: 'store', args: ['hello', 'world'], value: 0n, gas: 10000000n });
    console.log('TX:', tx2);
    await pollTx(client, tx2);
    const d2 = await client.readContract({ address: addr, functionName: 'get_data', args: [] });
    console.log('Data after store:', d2);
    const c2 = await client.readContract({ address: addr, functionName: 'get_count', args: [] });
    console.log('Count after store:', c2);

    console.log('\nDONE');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
