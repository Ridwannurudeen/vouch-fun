import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const CONTRACT = '0xfCEF7B05c4e99306Cea70DD597eA0085e0F9CaE3';

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

console.log('Account:', account.address);
console.log('Contract:', CONTRACT);
console.log('');

// Test vouch with a real GitHub handle
const handle = process.argv[2] || 'ridwannurudeen';
console.log(`Calling vouch("${handle}")...`);
console.log('This scrapes GitHub + runs LLM on validators. May take 60-180s.');
console.log('');

try {
    const txHash = await client.writeContract({
        address: CONTRACT,
        functionName: 'vouch',
        args: [handle],
        value: 0n,
    });
    console.log('TX:', txHash);
    console.log('Waiting for consensus...');

    const { TransactionStatus } = await import('genlayer-js/types');
    const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.ACCEPTED,
        retries: 120,
        interval: 5000,
    });

    const safe = JSON.parse(JSON.stringify(receipt, (_, v) => typeof v === 'bigint' ? v.toString() : v));
    console.log('Result:', safe.resultName);
    console.log('Votes:', safe.lastRound?.validatorVotesName);
    console.log('');

    // Now read it back
    const profile = await client.readContract({
        address: CONTRACT,
        functionName: 'get_profile_by_handle',
        args: [handle],
    });
    console.log('Profile:', profile);

    const tier = await client.readContract({
        address: CONTRACT,
        functionName: 'get_trust_tier',
        args: [account.address],
    });
    console.log('Trust tier:', tier);

    const stats = await client.readContract({
        address: CONTRACT,
        functionName: 'get_stats',
        args: [],
    });
    console.log('Stats:', stats);
} catch (error) {
    console.error('FAILED:', error.message);
    if (error.cause) console.error('Cause:', JSON.stringify(error.cause, null, 2));

    // Try to get tx details if we have a hash
    const match = error.message?.match(/0x[a-f0-9]{64}/i);
    if (match) {
        try {
            const tx = await client.getTransaction({ hash: match[0] });
            const safe = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
            console.log('TX status:', safe.status, 'result:', safe.resultName);
            console.log('Votes:', safe.lastRound?.validatorVotesName);
        } catch {}
    }
}
