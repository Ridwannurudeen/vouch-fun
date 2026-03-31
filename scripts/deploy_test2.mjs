import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || '';

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });

    console.log('Account:', account.address);

    const code = readFileSync(resolve(__dirname, 'test_minimal.py'), 'utf8');
    console.log('Code length:', code.length);

    console.log('Deploying...');
    try {
        const txHash = await client.deployContract({
            code: code,
            args: [],
            value: 0n,
        });
        console.log('Deploy tx hash:', txHash);

        console.log('Waiting for consensus...');
        const { TransactionStatus } = await import('genlayer-js/types');
        const receipt = await client.waitForTransactionReceipt({
            hash: txHash,
            status: TransactionStatus.ACCEPTED,
            retries: 60,
            interval: 3000,
        });

        const safeReceipt = JSON.parse(JSON.stringify(receipt, (_, v) => typeof v === 'bigint' ? v.toString() : v));
        const addr = receipt?.contractAddress || receipt?.contract_address || receipt?.recipient || receipt?.data?.contractAddress;
        console.log('Address:', addr);
        console.log('Votes:', safeReceipt?.lastRound?.validatorVotesName);
        console.log('Result:', safeReceipt?.resultName);

        // Test read
        const r = await client.readContract({ address: addr, functionName: 'get_count', args: [] });
        console.log('get_count:', r);
    } catch (error) {
        console.error('FAILED:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
