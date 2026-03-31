import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || '';

async function pollTx(client, txHash, label) {
    for (let i = 0; i < 120; i++) {
        try {
            const tx = await client.getTransaction({ hash: txHash });
            const safe = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
            const status = safe.status;
            const votes = safe.lastRound?.validatorVotesName;
            const result = safe.resultName;
            console.log(`[${i}] status: ${status} result: ${result} votes: ${votes}`);
            if (status >= 4) return safe;
        } catch (e) {
            if (!e.message.includes('fetch failed')) {
                console.log(`[${i}] err: ${e.message.slice(0, 60)}`);
            }
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out`);
}

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });

    // Deploy minimal test
    const code = readFileSync(resolve(__dirname, 'test_minimal.py'), 'utf8');
    console.log('Deploying minimal test contract...');

    const deployTx = await client.deployContract({ code, args: [], value: 0n });
    console.log('Deploy TX:', deployTx);
    const deployResult = await pollTx(client, deployTx, 'deploy');
    const addr = deployResult?.contractAddress || deployResult?.contract_address || deployResult?.recipient || deployResult?.data?.contractAddress;
    console.log('Address:', addr);

    // Test exec_prompt
    console.log('\nCalling test_prompt()...');
    const callTx = await client.writeContract({
        address: addr,
        functionName: 'test_prompt',
        args: [],
        value: 0n,
    });
    console.log('Call TX:', callTx);
    const callResult = await pollTx(client, callTx, 'test_prompt');

    // Read back
    const result = await client.readContract({ address: addr, functionName: 'get_result', args: [] });
    console.log('Result:', result);
    console.log('DONE');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
