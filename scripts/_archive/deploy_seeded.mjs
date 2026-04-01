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
            console.log(`[${i}] status: ${status} votes: ${votes}`);
            if (status >= 4) return safe;
        } catch (e) {
            if (!e.message.includes('fetch failed')) console.log(`[${i}] ${e.message.slice(0, 50)}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out`);
}

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });
    console.log('Account:', account.address);

    const code = readFileSync(resolve(__dirname, '../contracts/vouch_protocol.py'), 'utf8');
    console.log('Deploying VouchProtocol with seeded profiles...');
    console.log('Code length:', code.length);

    let deployTx;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            deployTx = await client.deployContract({ code, args: [], value: 0n });
            break;
        } catch (e) {
            console.log(`Deploy attempt ${attempt + 1} failed: ${e.message.slice(0, 80)}`);
            if (attempt < 4) {
                console.log('Retrying in 10s...');
                await new Promise(r => setTimeout(r, 10000));
            } else {
                throw e;
            }
        }
    }
    console.log('Deploy TX:', deployTx);
    const result = await pollTx(client, deployTx, 'deploy');
    const addr = result?.contractAddress || result?.contract_address || result?.recipient || result?.data?.contractAddress;
    console.log('\nContract:', addr);

    // Verify seed data
    console.log('\nVerifying seeded data...');
    const stats = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
    console.log('Stats:', stats);

    for (const handle of ['vbuterin', 'gakonst', 'ridwannurudeen']) {
        const p = await client.readContract({
            address: addr,
            functionName: 'get_profile_by_handle',
            args: [handle],
        });
        const parsed = p ? JSON.parse(p) : {};
        console.log(`${handle}: tier=${parsed?.overall?.trust_tier}, code=${parsed?.code_activity?.grade}, onchain=${parsed?.onchain_activity?.grade}`);
    }

    // Test composable API
    const tier = await client.readContract({
        address: addr,
        functionName: 'get_trust_tier',
        args: ['0xb31a4605c52b6358867a533f97113c213cb64919'],
    });
    console.log('\nTrust tier for deployer:', tier);

    console.log('\nDONE — Contract:', addr);
    console.log('Update .env VITE_CONTRACT_ADDRESS to:', addr);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
