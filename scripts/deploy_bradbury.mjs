/**
 * Deploy VouchProtocol + consumer contracts to Bradbury testnet.
 * Then vouch profiles, set up gates, and verify everything works.
 *
 * Usage: DEPLOY_KEY=0x... node scripts/deploy_bradbury.mjs
 */
import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = process.env.DEPLOY_KEY || process.env.DEMO_PRIVATE_KEY || '';
if (!PRIVATE_KEY) { console.error('Set DEPLOY_KEY env var'); process.exit(1); }

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

async function pollTx(txHash, label, maxRetries = 180) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const tx = await client.getTransaction({ hash: txHash });
            const safe = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === 'bigint' ? v.toString() : v));
            const status = safe.status;
            const result = safe.resultName;
            const votes = safe.lastRound?.validatorVotesName;
            if (i % 5 === 0) console.log(`  [${label}] poll ${i}: status=${status} result=${result} votes=${votes}`);
            if (status >= 4) return safe;
        } catch (e) {
            if (i % 10 === 0) console.log(`  [${label}] poll ${i}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out after ${maxRetries * 5}s`);
}

function getAddr(receipt) {
    return receipt?.contractAddress || receipt?.contract_address || receipt?.recipient || receipt?.data?.contractAddress;
}

async function deploy(codePath, label, args = []) {
    const code = readFileSync(resolve(__dirname, codePath), 'utf8');
    console.log(`\nDeploying ${label} (${code.length} bytes)...`);
    try {
        const txHash = await client.deployContract({ code, args, value: 0n });
        console.log(`  TX: ${txHash}`);
        const receipt = await pollTx(txHash, label);
        const addr = getAddr(receipt);
        if (!addr) {
            console.log(`  WARN: no address in receipt:`, JSON.stringify(receipt, null, 2).slice(0, 500));
            return null;
        }
        console.log(`  ${label} deployed: ${addr}`);
        return addr;
    } catch (e) {
        console.error(`  ${label} deploy FAILED: ${e.message}`);
        return null;
    }
}

async function write(addr, fn, args, label, value = 0n) {
    console.log(`  ${label}...`);
    try {
        const txHash = await client.writeContract({
            address: addr, functionName: fn, args, value, leaderOnly: true
        });
        const receipt = await pollTx(txHash, label, 120);
        const status = receipt?.status;
        const result = receipt?.resultName;
        console.log(`    ${label}: status=${status} result=${result}`);
        return receipt;
    } catch (e) {
        console.error(`    ${label} FAILED: ${e.message}`);
        return null;
    }
}

async function read(addr, fn, args) {
    try {
        return await client.readContract({ address: addr, functionName: fn, args });
    } catch (e) {
        console.error(`  read ${fn} failed: ${e.message}`);
        return null;
    }
}

async function main() {
    console.log('Account:', account.address);
    console.log('Chain: Bradbury Testnet');

    // === 1. Deploy VouchProtocol ===
    const vouchAddr = await deploy('../contracts/vouch_protocol.py', 'VouchProtocol');
    if (!vouchAddr) { console.error('VouchProtocol deploy failed — aborting'); process.exit(1); }

    // Verify state
    const stats = await read(vouchAddr, 'get_stats', []);
    console.log('\nStats:', stats);
    const handles = await read(vouchAddr, 'get_all_handles', []);
    console.log('Handles:', handles);

    // === 2. Vouch real profiles via AI ===
    const toVouch = ['samczsun', 'gakonst'];
    for (const handle of toVouch) {
        await write(vouchAddr, 'vouch', [handle], `vouch(${handle})`);
        // Check result
        const profile = await read(vouchAddr, 'get_profile_by_handle', [handle]);
        if (profile && profile !== '{}') {
            try {
                const p = typeof profile === 'string' ? JSON.parse(profile) : profile;
                const code = p?.code?.grade || '?';
                const score = p?.overall?.trust_score || 0;
                const tier = p?.overall?.trust_tier || '?';
                console.log(`    ${handle}: code=${code} score=${score} tier=${tier}`);
            } catch {}
        }
    }

    // === 3. Set up Trust Gates ===
    const gateConfigs = [
        { handle: 'vbuterin', gate: 'DevDAO', dim: 'code', grade: 'B' },
        { handle: 'gakonst', gate: 'DevDAO', dim: 'code', grade: 'B' },
        { handle: 'samczsun', gate: 'DevDAO', dim: 'code', grade: 'B' },
        { handle: 'ridwannurudeen', gate: 'DevDAO', dim: 'code', grade: 'B' },
        { handle: 'vbuterin', gate: 'DeFi Vault', dim: 'defi', grade: 'B' },
        { handle: 'samczsun', gate: 'Security Auditors', dim: 'code', grade: 'A' },
        { handle: 'gakonst', gate: 'Security Auditors', dim: 'code', grade: 'A' },
        { handle: 'vbuterin', gate: 'Agent Marketplace', dim: 'code', grade: 'C' },
        { handle: 'gakonst', gate: 'Agent Marketplace', dim: 'code', grade: 'C' },
        { handle: 'samczsun', gate: 'Agent Marketplace', dim: 'code', grade: 'C' },
        { handle: 'ridwannurudeen', gate: 'Agent Marketplace', dim: 'code', grade: 'C' },
    ];

    console.log('\n=== Setting up Trust Gates ===');
    for (const g of gateConfigs) {
        await write(vouchAddr, 'gate_register', [g.handle, g.gate, g.dim, g.grade], `gate(${g.gate}+${g.handle})`);
    }

    // Verify gates
    const gateList = await read(vouchAddr, 'list_gates', []);
    console.log('\nGates:', gateList);

    // === 4. Try deploying consumer contracts ===
    console.log('\n=== Deploying Consumer Contracts ===');
    const trustGateAddr = await deploy('../contracts/trust_gate.py', 'TrustGate', [vouchAddr, 'code', 'B']);
    const marketplaceAddr = await deploy('../contracts/agent_marketplace.py', 'AgentMarketplace', [vouchAddr]);

    // === 5. Test Oracle ===
    console.log('\n=== Testing Trust Oracle ===');
    const oracleResult = await read(vouchAddr, 'trust_query', ['samczsun', 'code', 'B']);
    console.log('Oracle(samczsun, code, B):', oracleResult);
    const batchResult = await read(vouchAddr, 'trust_batch_query', [JSON.stringify(['vbuterin', 'gakonst', 'samczsun', 'torvalds']), 'code', 'B']);
    console.log('Batch(code>=B):', batchResult);

    // === Summary ===
    console.log('\n========================================');
    console.log('DEPLOYMENT COMPLETE');
    console.log('========================================');
    console.log('VouchProtocol:', vouchAddr);
    if (trustGateAddr) console.log('TrustGate:    ', trustGateAddr);
    if (marketplaceAddr) console.log('Marketplace:  ', marketplaceAddr);
    console.log('Chain: Bradbury Testnet (rpc-bradbury.genlayer.com)');
    console.log('');
    console.log('Set in frontend/.env:');
    console.log(`VITE_CONTRACT_ADDRESS=${vouchAddr}`);
    console.log('VITE_USE_STUDIO=false');
    console.log('========================================');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
