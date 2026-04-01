import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const PRIVATE_KEY = process.env.DEPLOY_KEY || '';
const TRUSTGATE_ADDRESS = process.env.TRUSTGATE_ADDRESS || '';

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
            console.log(`[${i}] poll error: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`${label} timed out`);
}

async function main() {
    if (!TRUSTGATE_ADDRESS) {
        console.error('Set TRUSTGATE_ADDRESS env var');
        process.exit(1);
    }

    const account = createAccount(PRIVATE_KEY);
    const client = createClient({ chain: testnetBradbury, account });
    console.log('Account:', account.address);
    console.log('TrustGate:', TRUSTGATE_ADDRESS);

    // 1. Read config
    console.log('\n--- Reading gate config ---');
    const config = await client.readContract({
        address: TRUSTGATE_ADDRESS,
        functionName: 'get_config',
        args: [],
    });
    console.log('Config:', config);

    // 2. Check if already registered
    console.log('\n--- Checking registration ---');
    const regStatus = await client.readContract({
        address: TRUSTGATE_ADDRESS,
        functionName: 'is_registered',
        args: [account.address.toLowerCase()],
    });
    console.log('Registration status:', regStatus);

    // 3. Attempt to register (cross-contract call to VouchProtocol)
    console.log('\n--- Attempting register("TestAgent") ---');
    console.log('This will cross-contract call VouchProtocol.get_dimension()...');
    try {
        const txHash = await client.writeContract({
            address: TRUSTGATE_ADDRESS,
            functionName: 'register',
            args: ['TestAgent'],
            value: 0n,
        });
        console.log('Register TX:', txHash);
        const receipt = await pollTx(client, txHash, 'register');
        console.log('Result:', receipt?.data || receipt?.resultName);
    } catch (e) {
        console.log('Register failed (expected if no vouch profile):', e.message);
    }

    // 4. Read registrations
    console.log('\n--- Reading all registrations ---');
    const regs = await client.readContract({
        address: TRUSTGATE_ADDRESS,
        functionName: 'get_registrations',
        args: [],
    });
    console.log('Registrations:', regs);

    console.log('\nDONE');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
