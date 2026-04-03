import { createClient, createAccount } from 'genlayer-js';
import { localnet } from 'genlayer-js/chains';

const chain = { ...localnet, rpcUrls: { default: { http: ['https://vouch.gudman.xyz/studio-rpc'] } } };
const account = createAccount(process.env.DEPLOY_KEY || '');
const client = createClient({ chain, account });
const addr = '0x69690E34f49F29344A393707FF5f364eFc40B0A1';

// Get all handles
const handlesRaw = await client.readContract({ address: addr, functionName: 'get_all_handles', args: [] });
const allHandles = typeof handlesRaw === 'string' ? JSON.parse(handlesRaw) : handlesRaw;
console.log(`\n=== ${allHandles.length} PROFILES ON-CHAIN ===\n`);

const dims = ['code', 'onchain', 'social', 'governance', 'defi', 'identity'];

for (const h of allHandles) {
  const r = await client.readContract({ address: addr, functionName: 'get_profile_by_handle', args: [h] });
  const raw = typeof r === 'string' ? r : JSON.stringify(r);
  let p;
  try { p = JSON.parse(raw); } catch { p = null; }

  if (!p || !p.overall) {
    console.log(`--- ${h}: EMPTY/BROKEN ---\n`);
    continue;
  }

  console.log(`--- ${h} ---`);
  console.log(`  Score: ${p.overall.trust_score} | Tier: ${p.overall.trust_tier}`);
  console.log(`  Summary: ${p.overall.summary}`);
  console.log(`  Consensus: ${p.overall.consensus_mode || 'N/A'}`);
  console.log(`  Evidence: ${p.evidence_quality || 'N/A'}`);
  console.log(`  Sources: ${JSON.stringify(p.sources)}`);

  const grades = {};
  for (const d of dims) {
    grades[d] = p[d]?.grade || 'N/A';
  }
  console.log(`  Grades: ${JSON.stringify(grades)}`);

  if (p.created_at) {
    console.log(`  Created: ${new Date(p.created_at * 1000).toISOString()}`);
  }
  console.log('');
}

// Summary table
console.log('\n=== SUMMARY TABLE ===');
console.log('Handle'.padEnd(20), 'Score', 'Tier'.padEnd(10), 'Sources'.padEnd(8), 'Evidence'.padEnd(15), 'Consensus');
console.log('-'.repeat(85));
for (const h of allHandles) {
  const r = await client.readContract({ address: addr, functionName: 'get_profile_by_handle', args: [h] });
  const raw = typeof r === 'string' ? r : JSON.stringify(r);
  let p;
  try { p = JSON.parse(raw); } catch { p = null; }
  if (!p || !p.overall) {
    console.log(h.padEnd(20), '?', 'BROKEN'.padEnd(10));
    continue;
  }
  const srcCount = (p.sources || []).length;
  console.log(
    h.padEnd(20),
    String(p.overall.trust_score).padEnd(5),
    (p.overall.trust_tier || '?').padEnd(10),
    String(srcCount).padEnd(8),
    (p.evidence_quality || 'N/A').padEnd(15),
    p.overall.consensus_mode || 'N/A'
  );
}
