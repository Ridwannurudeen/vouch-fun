import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { trustQuery, readProfileByHandle } from "../lib/genlayer";
import type { TrustProfile } from "../types";

type Step = {
  id: string;
  label: string;
  status: "pending" | "running" | "pass" | "fail";
  detail?: string;
};

const SCENARIOS = [
  {
    name: "Hire a Security Auditor",
    desc: "Agent A needs a smart contract audit. It queries vouch.fun to find a qualified auditor.",
    agentA: "DeFi Protocol Agent",
    requirement: { dimension: "code", minGrade: "A", gateName: "Security Auditors" },
    candidates: ["samczsun", "gakonst", "torvalds"],
  },
  {
    name: "DeFi Vault Access",
    desc: "A lending protocol agent gates deposit access based on DeFi reputation.",
    agentA: "Lending Vault Agent",
    requirement: { dimension: "defi", minGrade: "B", gateName: "DeFi Vault" },
    candidates: ["vbuterin", "aaveaave", "torvalds"],
  },
  {
    name: "Agent Marketplace Listing",
    desc: "A marketplace agent verifies code quality before listing an AI agent for hire.",
    agentA: "Marketplace Agent",
    requirement: { dimension: "code", minGrade: "C", gateName: "Agent Marketplace" },
    candidates: ["sindresorhus", "yyx990803", "antirez"],
  },
];

const STATUS_ICON: Record<string, string> = {
  pending: "\u2500",
  running: "\u25CB",
  pass: "\u2713",
  fail: "\u2717",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-gray-600",
  running: "text-indigo-400 animate-pulse",
  pass: "text-emerald-400",
  fail: "text-red-400",
};

export default function AgentDemo() {
  const [scenario, setScenario] = useState(0);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [results, setResults] = useState<{ handle: string; profile: TrustProfile | null; eligible: boolean; grade: string }[]>([]);
  const [done, setDone] = useState(false);

  const sc = SCENARIOS[scenario];

  const updateStep = (id: string, updates: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const runDemo = async () => {
    setRunning(true);
    setDone(false);
    setResults([]);

    const initialSteps: Step[] = [
      { id: "init", label: `${sc.agentA} receives task request`, status: "pending" },
      { id: "policy", label: `Defines trust policy: ${sc.requirement.dimension} >= ${sc.requirement.minGrade}`, status: "pending" },
      ...sc.candidates.map((c) => ({
        id: `check-${c}`,
        label: `Query trust oracle for ${c}`,
        status: "pending" as const,
      })),
      { id: "decide", label: "Make hiring decision", status: "pending" },
    ];
    setSteps(initialSteps);

    // Step 1: Init
    await sleep(600);
    updateStep("init", { status: "pass", detail: `"I need a ${sc.name.toLowerCase()}"` });

    // Step 2: Policy
    await sleep(500);
    updateStep("policy", { status: "pass", detail: `gate_check(handle, "${sc.requirement.dimension}", "${sc.requirement.minGrade}")` });

    // Step 3: Query each candidate
    const candidateResults: typeof results = [];
    for (const candidate of sc.candidates) {
      updateStep(`check-${candidate}`, { status: "running", detail: "Querying on-chain trust oracle..." });

      try {
        const [queryResult, profile] = await Promise.all([
          trustQuery(candidate, sc.requirement.dimension, sc.requirement.minGrade),
          readProfileByHandle(candidate),
        ]);

        const pass = queryResult?.pass ?? false;
        const grade = queryResult?.grade ?? "?";
        candidateResults.push({ handle: candidate, profile, eligible: pass, grade });

        updateStep(`check-${candidate}`, {
          status: pass ? "pass" : "fail",
          detail: pass
            ? `PASS \u2014 ${sc.requirement.dimension}=${grade} >= ${sc.requirement.minGrade} (score: ${queryResult?.overall_score ?? "?"})`
            : `FAIL \u2014 ${sc.requirement.dimension}=${grade} < ${sc.requirement.minGrade}`,
        });
      } catch {
        candidateResults.push({ handle: candidate, profile: null, eligible: false, grade: "?" });
        updateStep(`check-${candidate}`, { status: "fail", detail: "Oracle query failed" });
      }
    }

    setResults(candidateResults);

    // Step 4: Decision
    await sleep(400);
    const hired = candidateResults.find((r) => r.eligible);
    updateStep("decide", {
      status: hired ? "pass" : "fail",
      detail: hired
        ? `HIRED: ${hired.handle} (${sc.requirement.dimension}=${hired.grade}). Transaction authorized.`
        : `No candidate meets ${sc.requirement.dimension} >= ${sc.requirement.minGrade}. Task rejected.`,
    });

    setDone(true);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-2">Agentic Economy</span>
          <h1 className="text-3xl font-bold text-white mb-2">Agent-to-Agent Trust</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Watch autonomous agents query vouch.fun's trust oracle in real-time before transacting.
            Every check hits the live contract on-chain.
          </p>
        </div>

        {/* Scenario selector */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => { if (!running) { setScenario(i); setSteps([]); setResults([]); setDone(false); } }}
              disabled={running}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                scenario === i
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "glass text-gray-400 hover:text-white border border-transparent"
              } disabled:opacity-50`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Scenario description */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">{sc.name}</h2>
              <p className="text-sm text-gray-400 mb-3">{sc.desc}</p>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-2 py-1 rounded-full bg-white/5 text-gray-400">Agent: {sc.agentA}</span>
                <span className="px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300">
                  Requires: {sc.requirement.dimension} &ge; {sc.requirement.minGrade}
                </span>
                <span className="px-2 py-1 rounded-full bg-white/5 text-gray-400">
                  Candidates: {sc.candidates.join(", ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Run button */}
        {!running && !done && (
          <div className="text-center mb-8">
            <motion.button
              onClick={runDemo}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-bold text-sm
                         hover:from-indigo-400 hover:to-violet-400 transition-all shadow-lg shadow-indigo-500/20"
            >
              Run Agent Flow
            </motion.button>
          </div>
        )}

        {/* Execution log */}
        <AnimatePresence>
          {steps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl overflow-hidden mb-8"
            >
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${running ? "bg-indigo-400 animate-pulse" : done ? "bg-emerald-400" : "bg-gray-600"}`} />
                <span className="text-xs font-mono text-gray-400">
                  {running ? "Executing agent flow..." : done ? "Flow complete" : "Ready"}
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {steps.map((step) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-5 py-3 flex items-start gap-3"
                  >
                    <span className={`font-mono text-base mt-0.5 ${STATUS_COLOR[step.status]}`}>
                      {STATUS_ICON[step.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{step.label}</div>
                      {step.detail && (
                        <div className="text-xs font-mono text-gray-500 mt-0.5 truncate">{step.detail}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results cards */}
        {results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {results.map((r) => (
              <motion.div
                key={r.handle}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`glass rounded-xl p-5 border ${
                  r.eligible ? "border-emerald-500/30" : "border-red-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-white">{r.handle}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    r.eligible
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}>
                    {r.eligible ? "QUALIFIED" : "REJECTED"}
                  </span>
                </div>
                {r.profile && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-black font-mono text-white">{r.profile.overall.trust_score}</span>
                      <span className="text-xs text-gray-500">/100</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ml-auto ${
                        r.profile.overall.trust_tier === "TRUSTED" ? "bg-emerald-500/20 text-emerald-400" :
                        r.profile.overall.trust_tier === "MODERATE" ? "bg-amber-500/20 text-amber-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {r.profile.overall.trust_tier}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      {sc.requirement.dimension} = <span className={r.eligible ? "text-emerald-400" : "text-red-400"}>{r.grade}</span>
                      {" "} (need {sc.requirement.minGrade})
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Reset */}
        {done && (
          <div className="text-center mb-8">
            <button
              onClick={() => { setSteps([]); setResults([]); setDone(false); }}
              className="px-6 py-3 glass text-gray-400 hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              Run Another Scenario
            </button>
          </div>
        )}

        {/* How agents integrate */}
        <div className="glass rounded-2xl p-6 mt-4">
          <h3 className="text-lg font-bold text-white mb-4">How Agents Integrate</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-indigo-400 font-mono text-xs mb-2">1. QUERY</div>
              <code className="block bg-black/30 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                trust_query(<br />
                &nbsp;&nbsp;"samczsun",<br />
                &nbsp;&nbsp;"code", "A"<br />
                )
              </code>
              <p className="text-gray-500 mt-2 text-xs">One-line call to check any identity against any dimension + grade threshold.</p>
            </div>
            <div>
              <div className="text-emerald-400 font-mono text-xs mb-2">2. DECIDE</div>
              <code className="block bg-black/30 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                if result.pass:<br />
                &nbsp;&nbsp;hire(agent_b)<br />
                else:<br />
                &nbsp;&nbsp;reject(agent_b)
              </code>
              <p className="text-gray-500 mt-2 text-xs">Boolean pass/fail with grade, confidence, and freshness metadata.</p>
            </div>
            <div>
              <div className="text-amber-400 font-mono text-xs mb-2">3. GATE</div>
              <code className="block bg-black/30 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                gate_register(<br />
                &nbsp;&nbsp;"samczsun",<br />
                &nbsp;&nbsp;"Auditors", "code", "A"<br />
                )
              </code>
              <p className="text-gray-500 mt-2 text-xs">Register qualified agents into composable trust gates for ongoing access control.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
