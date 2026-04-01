import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const CONTRACT = '0x4F9Fb0cF424550450a73Ce1aC043b052A01c4F3f';

async function pollTx(client, txHash) {
    for (let i = 0; i < 60; i++) {
        try {
            const tx = await client.getTransaction({ hash: txHash });
            const safe = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
            const s = safe.status;
            const v = safe.lastRound?.validatorVotesName;
            const r = safe.resultName;
            console.log(`[${i}] s:${s} r:${r} v:${v}`);
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

    // Tiny profile - minimal JSON
    const profile = '{"overall":{"trust_tier":"MODERATE","summary":"test"}}';
    console.log('Seeding test with tiny profile...');
    const tx = await client.writeContract({
        address: CONTRACT,
        functionName: 'seed_profile',
        args: ['testuser', profile],
        value: 0n,
        gas: 10000000n,
    });
    console.log('TX:', tx);
    await pollTx(client, tx);

    const p = await client.readContract({
        address: CONTRACT,
        functionName: 'get_profile_by_handle',
        args: ['testuser'],
    });
    console.log('Profile:', p);

    const stats = await client.readContract({
        address: CONTRACT,
        functionName: 'get_stats',
        args: [],
    });
    console.log('Stats:', stats);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
