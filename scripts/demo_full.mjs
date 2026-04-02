import { createClient, createAccount } from "genlayer-js";
import { localnet } from "genlayer-js/chains";

const account = createAccount(process.env.DEMO_PRIVATE_KEY || "");
const client = createClient({ chain: localnet, account });
const addr = process.argv[2] || "0x88e1dd1c52929682656D004023CF6D15C450883E";

async function gate(handle, gateName, dim, minGrade) {
  const h = await client.writeContract({
    address: addr, functionName: "gate_register",
    args: [handle, gateName, dim, minGrade], value: 0n, leaderOnly: true,
  });
  return client.waitForTransactionReceipt({ hash: h, retries: 30, interval: 3000 });
}

(async () => {
  // =============================================
  // DEMO 1: MULTIPLE TRUST GATES
  // =============================================
  console.log("============================================");
  console.log("  DEMO 1: MULTIPLE TRUST GATES");
  console.log("  Proving vouch.fun as universal infra");
  console.log("============================================\n");

  // Gate 1: DevDAO (code >= B)
  console.log("[Gate 1] DevDAO — code >= B (developer communities)");
  await gate("vbuterin", "DevDAO", "code", "B");
  await gate("gakonst", "DevDAO", "code", "B");
  await gate("ridwannurudeen", "DevDAO", "code", "B");
  const devInfo = JSON.parse(await client.readContract({ address: addr, functionName: "gate_info", args: ["DevDAO"] }));
  console.log("  Members:", devInfo.member_count, "—", Object.keys(devInfo.members).join(", "));

  // Gate 2: DeFi Vault (defi >= B)
  console.log("\n[Gate 2] DeFi Vault — defi >= B (protocol access)");
  await gate("vbuterin", "DeFi Vault", "defi", "B");
  const defiInfo = JSON.parse(await client.readContract({ address: addr, functionName: "gate_info", args: ["DeFi Vault"] }));
  console.log("  Members:", defiInfo.member_count, "—", Object.keys(defiInfo.members).join(", "));

  // Gate 3: Security Auditors (code >= A)
  console.log("\n[Gate 3] Security Auditors — code >= A (premium talent)");
  await gate("vbuterin", "Security Auditors", "code", "A");
  await gate("gakonst", "Security Auditors", "code", "A");
  const secInfo = JSON.parse(await client.readContract({ address: addr, functionName: "gate_info", args: ["Security Auditors"] }));
  console.log("  Members:", secInfo.member_count, "—", Object.keys(secInfo.members).join(", "));

  // Gate 4: Agent Marketplace (code >= C)
  console.log("\n[Gate 4] Agent Marketplace — code >= C (agent listing)");
  await gate("vbuterin", "Agent Marketplace", "code", "C");
  await gate("gakonst", "Agent Marketplace", "code", "C");
  await gate("ridwannurudeen", "Agent Marketplace", "code", "C");
  await gate("samczsun", "Agent Marketplace", "code", "C");
  const mktInfo = JSON.parse(await client.readContract({ address: addr, functionName: "gate_info", args: ["Agent Marketplace"] }));
  console.log("  Members:", mktInfo.member_count, "—", Object.keys(mktInfo.members).join(", "));

  // List all gates
  const gates = JSON.parse(await client.readContract({ address: addr, functionName: "list_gates", args: [] }));
  console.log("\n  All active gates:");
  gates.forEach(g => console.log("    -", g.name, "(" + g.member_count + " members)"));

  // =============================================
  // DEMO 2: TRUST ORACLE
  // =============================================
  console.log("\n============================================");
  console.log("  DEMO 2: TRUST ORACLE QUERIES");
  console.log("  One-line integration for any agent");
  console.log("============================================\n");

  const q1 = JSON.parse(await client.readContract({ address: addr, functionName: "trust_query", args: ["gakonst", "code", "B"] }));
  console.log("trust_query(gakonst, code, B):");
  console.log("  pass:", q1.pass, "| grade:", q1.grade, "| confidence:", q1.confidence);
  console.log("  score:", q1.overall_score, "| tier:", q1.overall_tier, "| fresh:", q1.fresh);

  const q2 = JSON.parse(await client.readContract({ address: addr, functionName: "trust_query", args: ["torvalds", "defi", "B"] }));
  console.log("\ntrust_query(torvalds, defi, B):");
  console.log("  pass:", q2.pass, "| grade:", q2.grade, "| confidence:", q2.confidence);
  console.log("  score:", q2.overall_score, "| tier:", q2.overall_tier);

  // Batch query
  const batch = JSON.parse(await client.readContract({
    address: addr, functionName: "trust_batch_query",
    args: [JSON.stringify(["vbuterin", "gakonst", "torvalds", "samczsun", "ridwannurudeen"]), "code", "B"],
  }));
  console.log("\ntrust_batch_query([5 handles], code, B):");
  console.log("  Total:", batch.total, "| Passed:", batch.passed);
  batch.results.forEach(r => console.log("    " + r.handle + ": " + (r.pass ? "PASS" : "FAIL") + " (grade: " + r.grade + ")"));

  // =============================================
  // DEMO 3: AGENT-TO-AGENT TRUST FLOW
  // =============================================
  console.log("\n============================================");
  console.log("  DEMO 3: AGENT-TO-AGENT TRUST FLOW");
  console.log("  Agent A hires auditor via trust check");
  console.log("============================================\n");

  const candidates = ["gakonst", "samczsun", "torvalds"];
  console.log("Scenario: Agent A needs a security auditor (code >= A, high confidence)\n");

  for (const c of candidates) {
    const q = JSON.parse(await client.readContract({ address: addr, functionName: "trust_query", args: [c, "code", "A"] }));
    const verdict = q.pass && q.confidence === "high" ? "HIRED" : q.pass ? "QUALIFIED (low confidence)" : "REJECTED";
    console.log("  Candidate:", c);
    console.log("    Code grade:", q.grade, "| Confidence:", q.confidence, "| Required: A");
    console.log("    Decision:", verdict);
    console.log();
  }

  // =============================================
  // DEMO 4: REJECTION FLOW
  // =============================================
  console.log("============================================");
  console.log("  DEMO 4: GATE REJECTION (system has teeth)");
  console.log("============================================\n");

  const check1 = JSON.parse(await client.readContract({ address: addr, functionName: "gate_check", args: ["torvalds", "defi", "B"] }));
  console.log("torvalds → DeFi Vault (defi >= B):");
  console.log("  Eligible:", check1.eligible, "| Grade:", check1.grade, "| Required:", check1.required);
  console.log("  BLOCKED — grade F, needs B\n");

  // Try register (will be rejected by contract logic)
  await gate("torvalds", "DeFi Vault", "defi", "B");
  const defiCheck = JSON.parse(await client.readContract({ address: addr, functionName: "gate_info", args: ["DeFi Vault"] }));
  console.log("After registration attempt:");
  console.log("  DeFi Vault members:", defiCheck.member_count);
  console.log("  Members:", Object.keys(defiCheck.members).join(", "));
  console.log("  torvalds blocked:", !defiCheck.members["torvalds"]);

  const check3 = JSON.parse(await client.readContract({ address: addr, functionName: "gate_check", args: ["samczsun", "code", "A"] }));
  console.log("\nsamczsun → Security Auditors (code >= A):");
  console.log("  Eligible:", check3.eligible, "| Grade:", check3.grade, "| Required: A");
  console.log("  BLOCKED — grade B, needs A\n");

  // =============================================
  // FINAL SUMMARY
  // =============================================
  const finalStats = JSON.parse(await client.readContract({ address: addr, functionName: "get_stats", args: [] }));
  const allGates = JSON.parse(await client.readContract({ address: addr, functionName: "list_gates", args: [] }));
  console.log("============================================");
  console.log("  PROTOCOL SUMMARY");
  console.log("============================================");
  console.log("  Profiles:", finalStats.profile_count);
  console.log("  Queries:", finalStats.query_count);
  console.log("  Active gates:", allGates.length);
  allGates.forEach(g => console.log("    -", g.name + ":", g.member_count, "members"));
  console.log("\n  vouch.fun: Chainlink for reputation.");
})().catch(e => console.error(e));
