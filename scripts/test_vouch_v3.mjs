import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const CONTRACT = '0x472AE419E1C9692ab73a0D05c2AF994D79446EfD';

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
                console.log(`[${i}] poll error: ${e.message.slice(0, 80)}`);
            }
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out`);
}

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });

    const handle = process.argv[2] || 'vbuterin';
    console.log(`Calling vouch(${handle}) on ${CONTRACT}...`);

    const txHash = await client.writeContract({
        address: CONTRACT,
        functionName: 'vouch',
        args: [handle],
        value: 0n,
    });
    console.log('TX:', txHash);

    const result = await pollTx(client, txHash, 'vouch');

    // Read back
    console.log('\nReading profile...');
    const profile = await client.readContract({
        address: CONTRACT,
        functionName: 'get_profile_by_handle',
        args: [handle],
    });
    console.log('Profile:', typeof profile === 'string' ? profile.slice(0, 500) : profile);

    const stats = await client.readContract({ address: CONTRACT, functionName: 'get_stats', args: [] });
    console.log('Stats:', stats);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
