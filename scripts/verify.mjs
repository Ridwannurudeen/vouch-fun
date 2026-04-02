import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const CONTRACT = '0xB400f98aFAADc9819b4F465c66ed0bf10be01028';

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

try {
  console.log('Reading get_stats...');
  const stats = await client.readContract({ address: CONTRACT, functionName: 'get_stats', args: [] });
  console.log('Stats:', stats);
} catch(e) { console.error('get_stats error:', e.message); }

try {
  console.log('Reading get_all_handles...');
  const handles = await client.readContract({ address: CONTRACT, functionName: 'get_all_handles', args: [] });
  console.log('Handles:', handles);
} catch(e) { console.error('get_all_handles error:', e.message); }

try {
  console.log('Reading get_profile_by_handle(vbuterin)...');
  const profile = await client.readContract({ address: CONTRACT, functionName: 'get_profile_by_handle', args: ['vbuterin'] });
  console.log('Profile:', typeof profile === 'string' ? profile.slice(0, 200) : profile);
} catch(e) { console.error('get_profile_by_handle error:', e.message); }

console.log('\nDone — contract:', CONTRACT);
