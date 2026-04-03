import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const KEY = process.env.PRIVATE_KEY || process.env.VITE_PRIVATE_KEY;
const ADDR = process.argv[2] || "0x51310864C072C26530C10949b5905bfB37b58f71";

const account = createAccount(KEY);
const client = createClient({ chain: studionet, account });

async function poll(hash) {
  for (let i = 0; i < 120; i++) {
    try {
      const tx = await client.getTransaction({ hash });
      const s = JSON.parse(JSON.stringify(tx, (_, v) => typeof v === "bigint" ? v.toString() : v));
      if (s.status >= 4) {
        console.log(`  status=${s.status}`);
        return s;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Timeout");
}

async function vouch(identifier, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Vouching ${identifier} (attempt ${attempt})...`);
      const h = await client.writeContract({
        address: ADDR, functionName: "vouch", args: [identifier], value: 0n,
      });
      const tx = await poll(h);
      if (tx.status === 5) {
        // Read back
        const p = JSON.parse(await client.readContract({ address: ADDR, functionName: "get_profile_by_handle", args: [identifier] }));
        console.log(`  ${identifier}: score=${p.overall?.trust_score} tier=${p.overall?.trust_tier} code=${p.code?.grade}`);
        return true;
      }
      console.log(`  ${identifier}: status ${tx.status}, retrying...`);
    } catch (e) {
      console.log(`  ${identifier} error: ${e.message}`);
    }
  }
  return false;
}

async function gate(handle, gateName, dim, minGrade) {
  const h = await client.writeContract({
    address: ADDR, functionName: "gate_register",
    args: [handle, gateName, dim, minGrade], value: 0n,
  });
  return poll(h);
}

(async () => {
  console.log("Contract:", ADDR);
  console.log("Account:", account.address);

  // Verify seeds exist
  const handles = JSON.parse(await client.readContract({ address: ADDR, functionName: "get_all_handles", args: [] }));
  console.log("Existing handles:", handles.join(", "), "\n");

  // Vouch 5 AI-evaluated profiles
  const toVouch = ["samczsun", "gakonst", "sindresorhus", "yyx990803", "antirez"];
  for (const id of toVouch) {
    if (handles.includes(id)) {
      console.log(`${id} already exists, skipping`);
      continue;
    }
    await vouch(id);
  }

  // Set up 4 gates
  console.log("\n--- Setting up Trust Gates ---");

  console.log("Gate: DevDAO (code >= B)");
  for (const h of ["vbuterin", "gakonst", "samczsun"]) {
    await gate(h, "DevDAO", "code", "B");
  }

  console.log("Gate: DeFi Vault (defi >= B)");
  await gate("vbuterin", "DeFi Vault", "defi", "B");
  await gate("aaveaave", "DeFi Vault", "defi", "B");

  console.log("Gate: Security Auditors (code >= A)");
  await gate("vbuterin", "Security Auditors", "code", "A");

  console.log("Gate: Agent Marketplace (code >= C)");
  for (const h of ["vbuterin", "gakonst", "samczsun"]) {
    await gate(h, "Agent Marketplace", "code", "C");
  }

  // Final stats
  const stats = JSON.parse(await client.readContract({ address: ADDR, functionName: "get_stats", args: [] }));
  console.log("\nFinal stats:", JSON.stringify(stats));
  const allHandles = JSON.parse(await client.readContract({ address: ADDR, functionName: "get_all_handles", args: [] }));
  console.log("All handles:", allHandles.join(", "));
  const gates = JSON.parse(await client.readContract({ address: ADDR, functionName: "list_gates", args: [] }));
  console.log("Gates:", gates.map(g => `${g.name}(${g.member_count})`).join(", "));
})().catch(e => console.error("FATAL:", e.message));
