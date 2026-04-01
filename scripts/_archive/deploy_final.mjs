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
            const result = safe.resultName;
            console.log(`[${i}] status: ${status} result: ${result} votes: ${votes}`);
            if (status >= 4) return safe;
        } catch (e) {
            if (!e.message.includes('fetch failed')) {
                console.log(`[${i}] err: ${e.message.slice(0, 60)}`);
            }
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out`);
}

// Sample profiles for seeding
const PROFILES = [
    {
        handle: 'vbuterin',
        profile: {
            profile_found: true,
            code_activity: {
                grade: 'A',
                repos: 198,
                commits_last_year: 420,
                languages: ['Python', 'Solidity', 'JavaScript', 'Vyper'],
                stars_received: 15000,
                reasoning: 'Creator of Ethereum with extensive open-source contributions across multiple repositories'
            },
            onchain_activity: {
                grade: 'A',
                tx_count: 5000,
                first_tx_age_days: 3650,
                contracts_deployed: 50,
                suspicious_patterns: false,
                reasoning: 'Highly active on-chain presence as Ethereum co-founder with transparent activity'
            },
            overall: {
                trust_tier: 'TRUSTED',
                summary: 'Vitalik Buterin is one of the most trusted figures in the blockchain ecosystem as the co-founder of Ethereum'
            }
        }
    },
    {
        handle: 'gakonst',
        profile: {
            profile_found: true,
            code_activity: {
                grade: 'A',
                repos: 150,
                commits_last_year: 800,
                languages: ['Rust', 'Solidity', 'TypeScript'],
                stars_received: 25000,
                reasoning: 'Creator of Foundry and ethers-rs, core Ethereum tooling used by thousands of developers'
            },
            onchain_activity: {
                grade: 'B',
                tx_count: 2000,
                first_tx_age_days: 2500,
                contracts_deployed: 30,
                suspicious_patterns: false,
                reasoning: 'Active on-chain developer with clean transaction history'
            },
            overall: {
                trust_tier: 'TRUSTED',
                summary: 'Georgios Konstantopoulos is a highly trusted Ethereum developer and founder of Paradigm engineering'
            }
        }
    },
    {
        handle: 'ridwannurudeen',
        profile: {
            profile_found: true,
            code_activity: {
                grade: 'B',
                repos: 35,
                commits_last_year: 350,
                languages: ['Rust', 'TypeScript', 'Python', 'Solidity'],
                stars_received: 20,
                reasoning: 'Active developer contributing to multiple blockchain ecosystems with consistent commit history'
            },
            onchain_activity: {
                grade: 'C',
                tx_count: 200,
                first_tx_age_days: 600,
                contracts_deployed: 10,
                suspicious_patterns: false,
                reasoning: 'Moderate on-chain activity across multiple testnets and mainnets'
            },
            overall: {
                trust_tier: 'MODERATE',
                summary: 'Active blockchain developer with solid code contributions and growing on-chain presence'
            }
        }
    }
];

async function main() {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });
    console.log('Account:', account.address);

    // Deploy
    const code = readFileSync(resolve(__dirname, '../contracts/vouch_protocol.py'), 'utf8');
    console.log('Deploying VouchProtocol (final)...');

    const deployTx = await client.deployContract({ code, args: [], value: 0n, gas: 10000000n });
    console.log('Deploy TX:', deployTx);
    const deployResult = await pollTx(client, deployTx, 'deploy');
    const addr = deployResult?.contractAddress || deployResult?.contract_address || deployResult?.recipient || deployResult?.data?.contractAddress;
    console.log('Contract:', addr);

    const stats0 = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
    console.log('Stats:', stats0);

    // Seed profiles one at a time
    for (const { handle, profile } of PROFILES) {
        console.log(`\nSeeding ${handle}...`);
        try {
            const tx = await client.writeContract({
                address: addr,
                functionName: 'seed_profile',
                args: [handle, JSON.stringify(profile)],
                value: 0n,
                gas: 10000000n,
            });
            console.log('TX:', tx);
            const result = await pollTx(client, tx, `seed ${handle}`);

            // Verify
            const p = await client.readContract({
                address: addr,
                functionName: 'get_profile_by_handle',
                args: [handle],
            });
            console.log(`Profile ${handle}:`, typeof p === 'string' ? p.slice(0, 200) : p);
        } catch (e) {
            console.error(`FAILED ${handle}:`, e.message);
        }
    }

    const statsFinal = await client.readContract({ address: addr, functionName: 'get_stats', args: [] });
    console.log('\nFinal stats:', statsFinal);
    console.log('\nDONE — Contract:', addr);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
