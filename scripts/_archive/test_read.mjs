import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const account = createAccount(process.env.DEPLOY_KEY || '');
const client = createClient({ chain: testnetBradbury, account });
const addr = '0x7B872Fe316F1f8f067ae8F8232E5EbeEb8033c52';

try {
  const stats = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
  console.log('get_stats:', stats);
} catch (e) {
  console.error('get_stats FAILED:', e.message);
}

try {
  const tier = await client.readContract({ address: addr, functionName: 'get_trust_tier', args: ['0x0000000000000000000000000000000000000001'] });
  console.log('get_trust_tier:', tier);
} catch (e) {
  console.error('get_trust_tier FAILED:', e.message);
}

try {
  const lookup = await client.readContract({ address: addr, functionName: 'lookup_address', args: ['nobody'] });
  console.log('lookup_address:', lookup);
} catch (e) {
  console.error('lookup_address FAILED:', e.message);
}
