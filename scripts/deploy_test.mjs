import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || '';

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

console.log('Account:', account.address);
const balanceHex = await client.request({ method: 'eth_getBalance', params: [account.address, 'latest'] });
console.log('Balance:', Number(BigInt(balanceHex)) / 1e18, 'GEN');

const code = readFileSync(resolve(__dirname, 'test_minimal.py'), 'utf8');
console.log('Deploying test contract...');

const txHash = await client.deployContract({ code, args: [], value: 0n });
console.log('TX:', txHash);

const { TransactionStatus } = await import('genlayer-js/types');
const receipt = await client.waitForTransactionReceipt({
  hash: txHash, status: TransactionStatus.ACCEPTED, retries: 60, interval: 3000,
});

const addr = receipt?.contractAddress || receipt?.contract_address || receipt?.recipient || receipt?.data?.contractAddress;
console.log('Address:', addr);
console.log('Votes:', receipt?.lastRound?.validatorVotesName);

// Test read
try {
  const r = await client.readContract({ address: addr, functionName: 'get_count', args: [] });
  console.log('get_count:', r);
} catch (e) {
  console.error('READ FAILED:', e.message);
}
