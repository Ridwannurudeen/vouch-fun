import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const VOUCH_ADDRESS = process.env.VOUCH_ADDRESS || '0x3F32FeD0eC4A1D34C81316DE8773674cBB4ea507';
const GATE_DIMENSION = process.env.GATE_DIMENSION || 'code';
const GATE_MIN_GRADE = process.env.GATE_MIN_GRADE || 'B';

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
    console.log('VouchProtocol address:', VOUCH_ADDRESS);
    console.log('Gate dimension:', GATE_DIMENSION);
    console.log('Gate min grade:', GATE_MIN_GRADE);

    // Deploy TrustGate
    const code = readFileSync(resolve(__dirname, '../contracts/trust_gate.py'), 'utf8');
    console.log('\nDeploying TrustGate...');
    console.log('Code length:', code.length);

    let txHash;
    try {
        txHash = await client.deployContract({
            code,
            args: [VOUCH_ADDRESS, GATE_DIMENSION, GATE_MIN_GRADE],
            value: 0n,
        });
    } catch (e) {
        console.error('Deploy submit error:', e.message);
        if (e.cause) console.error('Cause:', JSON.stringify(e.cause, null, 2));
        process.exit(1);
    }
    console.log('Deploy TX:', txHash);

    const receipt = await pollTx(client, txHash, 'TrustGate deploy');
    const addr = receipt?.contractAddress || receipt?.contract_address || receipt?.recipient || receipt?.data?.contractAddress;
    console.log('TrustGate address:', addr);

    if (!addr) {
        console.log('Full receipt:', JSON.stringify(receipt, null, 2));
        process.exit(1);
    }

    // Verify config
    const config = await client.readContract({ address: addr, functionName: 'get_config', args: [] });
    console.log('Config:', config);

    console.log('\nDONE — TrustGate:', addr);
    console.log('Gate:', GATE_DIMENSION, '>=', GATE_MIN_GRADE);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
