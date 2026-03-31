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
            console.log(`[${i}] poll error: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out`);
}

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });
    console.log('Account:', account.address);

    // Deploy VouchProtocol
    const code = readFileSync(resolve(__dirname, '../contracts/vouch_protocol.py'), 'utf8');
    console.log('Deploying VouchProtocol v4 (lenient criteria)...');
    console.log('Code length:', code.length);

    let txHash;
    try {
        txHash = await client.deployContract({ code, args: [], value: 0n });
    } catch (e) {
        console.error('Deploy submit error:', e.message);
        if (e.cause) console.error('Cause:', JSON.stringify(e.cause, null, 2));
        // Try getting nonce info
        console.log('Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
        process.exit(1);
    }
    console.log('Deploy TX:', txHash);

    const receipt = await pollTx(client, txHash, 'deploy');
    const addr = receipt?.contractAddress || receipt?.contract_address || receipt?.recipient || receipt?.data?.contractAddress;
    console.log('Contract address:', addr);

    if (!addr) {
        console.log('Full receipt:', JSON.stringify(receipt, null, 2));
        process.exit(1);
    }

    // Verify state is readable
    const stats = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
    console.log('Stats:', stats);

    console.log('\nDONE — Contract:', addr);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
