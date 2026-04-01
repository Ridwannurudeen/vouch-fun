import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { readProfileByHandle, getStats } from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

/* ─────────────────── constants ─────────────────── */
const SAMPLE_HANDLES = ["vbuterin", "torvalds", "samczsun", "haydenzadams"];
const FEATURED = ["vbuterin", "gakonst", "samczsun"];

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-400",  B: "text-sky-400",  C: "text-amber-400",
  D: "text-orange-400",   F: "text-red-400",  "N/A": "text-gray-500",
};

/* ─────────────────── sub-components ─────────────────── */

/* Nebula background blobs */
function Nebula() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="absolute -top-[20%] -left-[10%] w-[45%] h-[45%] rounded-full bg-indigo-600/[.12] blur-[140px] animate-nebula-drift will-change-transform" />
      <div className="absolute -bottom-[15%] -right-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/[.08] blur-[120px] animate-nebula-drift-2 will-change-transform" />
      <div className="absolute top-[50%] right-[15%] w-[20%] h-[20%] rounded-full bg-cyan-400/[.04] blur-[80px] animate-nebula-drift will-change-transform" />
    </div>
  );
}

/* Floating glass navigation */
function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="glass rounded-2xl px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">vouch.fun</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/explore", label: "Explore" },
              { to: "/compare", label: "Compare" },
              { to: "/how-it-works", label: "How It Works" },
              { to: "/integrate", label: "Integrate" },
            ].map((l) => (
              <Link key={l.to} to={l.to}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200">
                {l.label}
              </Link>
            ))}
            <Link to="/integrate"
              className="ml-2 px-4 py-1.5 text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-all">
              Build
            </Link>
          </nav>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white/60 hover:text-white" aria-label="Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {open ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                     : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="md:hidden glass rounded-2xl mt-2 p-4 flex flex-col gap-1">
              {["/explore", "/compare", "/how-it-works", "/integrate"].map((p) => (
                <Link key={p} to={p} onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg">
                  {p.slice(1).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

/* Command center search */
function CommandSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/profile/${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <motion.div
        animate={focused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className={`relative glass rounded-2xl search-glow transition-all duration-500
          ${focused ? "border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.12)]" : ""}`}
      >
        {/* Search icon */}
        <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search GitHub handle, ENS, wallet, or @twitter..."
          className="w-full bg-transparent text-white placeholder-white/25 pl-14 pr-20 py-5 text-base font-mono
                     outline-none selection:bg-indigo-500/30"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] text-white/30 bg-white/5 rounded border border-white/10 font-mono">
            Enter
          </kbd>
        </div>
      </motion.div>
    </form>
  );
}

/* Score ring SVG */
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size / 2) - 4;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={`sg-${score}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
      <motion.circle cx={size/2} cy={size/2} r={r}
        stroke={`url(#sg-${score})`} strokeWidth="3" fill="none" strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${c}` }}
        whileInView={{ strokeDasharray: `${c - offset} ${c}` }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

/* Agent ID card */
function AgentCard({ profile }: { profile: TrustProfile }) {
  const id = profile.identifier || "";
  const score = profile.overall?.trust_score ?? 0;
  const tier = profile.overall?.trust_tier || "UNKNOWN";

  const tierColor: Record<string, string> = {
    TRUSTED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    MODERATE: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    LOW: "text-red-400 bg-red-400/10 border-red-400/20",
    UNKNOWN: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  };

  return (
    <motion.div
      whileHover={{ y: -4, borderColor: "rgba(129,140,248,0.3)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link to={`/profile/${id}`}
        className="block glass glass-hover rounded-2xl p-6 transition-all duration-300 group">
        <div className="flex items-start justify-between mb-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/40 to-violet-600/40 border border-white/10
                          flex items-center justify-center text-white font-bold text-lg">
            {id.charAt(0).toUpperCase()}
          </div>
          {/* Score ring */}
          <div className="relative">
            <ScoreRing score={score} size={56} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white font-mono">
              {score}
            </span>
          </div>
        </div>

        <h3 className="text-white font-bold font-mono text-sm mb-1 group-hover:text-indigo-300 transition-colors">
          {id}
        </h3>
        <span className={`inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border ${tierColor[tier]}`}>
          {tier}
        </span>

        {/* Dimension mini-grades */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {DIMENSIONS.map((dim: DimensionKey) => {
            const d = profile[dim];
            if (!d?.grade) return null;
            return (
              <span key={dim} className={`text-[10px] font-mono font-bold ${GRADE_COLOR[d.grade] || "text-gray-500"}`}>
                {DIMENSION_LABELS[dim].slice(0, 3).toUpperCase()}:{d.grade}
              </span>
            );
          })}
        </div>

        {/* Vouch button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="mt-5 w-full py-2 text-center text-xs font-medium text-indigo-300 bg-indigo-500/10
                     border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-all cursor-pointer"
        >
          View Profile →
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* Animated section wrapper */
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* IDE code block with Tokyo Night */
function CodeBlock() {
  const [copied, setCopied] = useState(false);
  const code = `# Inside your GenLayer Intelligent Contract:
from genlayer import *
import json

vouch = gl.ContractAt(Address(VOUCH_ADDR))

# Check trust tier before allowing action
tier = str(vouch.get_trust_tier(agent_address))
if tier in ("LOW", "UNKNOWN"):
    raise Exception("Insufficient trust")

# Gate by specific dimension
code = json.loads(str(vouch.get_dimension(addr, "code")))
if code["grade"] in ("D", "F"):
    raise Exception("Code reputation too low")

# Numeric score for weighted decisions
score = int(str(vouch.get_trust_score(addr)))
weight = score / 100  # 0.0 to 1.0`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* Syntax highlighting via spans */
  const highlight = (line: string) => {
    if (line.startsWith("#"))
      return <span className="text-tn-comment">{line}</span>;
    return line.split(/(\b(?:from|import|if|in|raise|str|int)\b|"[^"]*"|'[^']*'|\(|\)|#.*$)/g).map((tok, i) => {
      if (/^(from|import|if|in|raise)$/.test(tok))
        return <span key={i} className="text-tn-keyword">{tok}</span>;
      if (/^(str|int)$/.test(tok))
        return <span key={i} className="text-tn-fn">{tok}</span>;
      if (/^["']/.test(tok))
        return <span key={i} className="text-tn-string">{tok}</span>;
      if (tok.startsWith("#"))
        return <span key={i} className="text-tn-comment">{tok}</span>;
      return <span key={i} className="text-tn-var">{tok}</span>;
    });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[.06]">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-tn-bg border-b border-white/[.04]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-[11px] text-white/30 font-mono">vouch_integration.py</span>
        </div>
        <motion.button onClick={handleCopy} whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/40 hover:text-white/70 bg-white/5 rounded-lg transition-colors">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.svg key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </motion.svg>
            ) : (
              <motion.svg key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </motion.svg>
            )}
          </AnimatePresence>
          {copied ? "Copied!" : "Copy"}
        </motion.button>
      </div>
      <pre className="p-5 bg-tn-bg text-sm font-mono overflow-x-auto dark-scroll leading-relaxed">
        {code.split("\n").map((line, i) => (
          <div key={i} className="flex">
            <span className="inline-block w-8 text-right mr-4 text-white/15 select-none text-xs leading-relaxed">{i + 1}</span>
            <span>{highlight(line)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ─────────────────── dimension data ─────────────────── */
const DIM_DATA: { key: DimensionKey; label: string; desc: string; icon: string; color: string }[] = [
  { key: "code", label: "Code", desc: "Repos, commits, languages, stars, OSS impact", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", color: "from-blue-500/20 to-cyan-500/20" },
  { key: "onchain", label: "On-Chain", desc: "Tx history, account age, contracts deployed", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", color: "from-indigo-500/20 to-violet-500/20" },
  { key: "social", label: "Social", desc: "Followers, influence, community standing", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "from-pink-500/20 to-rose-500/20" },
  { key: "governance", label: "Governance", desc: "DAO votes, proposals, delegation history", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", color: "from-amber-500/20 to-orange-500/20" },
  { key: "defi", label: "DeFi", desc: "Protocol usage, LP history, risk appetite", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "from-emerald-500/20 to-teal-500/20" },
  { key: "identity", label: "Identity", desc: "ENS, Lens, Farcaster, cross-platform linkage", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "from-violet-500/20 to-purple-500/20" },
];

/* ─────────────────── main page ─────────────────── */
export default function Home() {
  const [featured, setFeatured] = useState<TrustProfile[]>([]);
  const [stats, setStats] = useState({ profile_count: 0, query_count: 0, dispute_count: 0 });
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    Promise.all(FEATURED.map((h) => readProfileByHandle(h)))
      .then((ps) => setFeatured(ps.filter((p): p is TrustProfile => p !== null)))
      .finally(() => setLoadingFeatured(false));
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="bg-void min-h-screen text-white overflow-hidden">
      <Nebula />

      <div className="relative z-10">
        <Nav />

        {/* ═══════ HERO ═══════ */}
        <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 grid-bg">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-white/50 font-mono mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                Powered by GenLayer AI Consensus
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                vouch
              </span>
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                .fun
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg sm:text-xl text-white/40 max-w-xl mx-auto mb-4 leading-relaxed"
            >
              The Trust Layer for the Agentic Economy
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-sm text-white/25 max-w-lg mx-auto mb-10 leading-relaxed"
            >
              Validators fetch real web data, then grade 6 trust dimensions via AI consensus.
              Evidence-grounded. Stake-backed. Fully on-chain.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <CommandSearch />
            </motion.div>

            {/* Trending */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-2 mt-6"
            >
              <span className="text-[11px] text-white/20 font-mono">Trending:</span>
              {SAMPLE_HANDLES.map((h) => (
                <Link key={h} to={`/profile/${h}`}
                  className="text-[11px] font-mono text-white/30 hover:text-indigo-400 px-2.5 py-1 rounded-lg bg-white/[.02] border border-white/[.04] hover:border-indigo-500/20 transition-all">
                  {h}
                </Link>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-8 mt-8"
            >
              {[
                { val: stats.profile_count, label: "Profiles" },
                { val: stats.query_count, label: "Queries" },
                { val: stats.dispute_count, label: "Disputes" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold font-mono text-white/80 animate-pulse-glow">{s.val}</div>
                  <div className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════ WHY AGENTS NEED TRUST ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Before agents transact, they need <span className="text-indigo-400">trust</span>
              </h2>
              <p className="text-sm text-white/30 max-w-lg mx-auto">
                Autonomous agents hire, delegate, and transact on behalf of users.
                vouch.fun is the trust layer they query before acting.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "Agent hires auditor", desc: 'get_dimension(addr, "code") → only B+ grade gets the contract', icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", glow: "bg-blue-500/5" },
                { title: "Protocol gates access", desc: 'get_dimension(addr, "defi") → proven DeFi experience required', icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", glow: "bg-violet-500/5" },
                { title: "DAO weights votes", desc: 'get_dimension(addr, "governance") → scale power by participation', icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", glow: "bg-amber-500/5" },
              ].map((uc, i) => (
                <motion.div key={uc.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass glass-hover rounded-2xl p-6 relative overflow-hidden`}
                >
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${uc.glow} blur-2xl`} />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={uc.icon} />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-2">{uc.title}</h3>
                    <p className="text-xs text-white/30 font-mono leading-relaxed">{uc.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ 6 DIMENSIONS BENTO ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                6 Dimensions of <span className="text-indigo-400">Trust</span>
              </h2>
              <p className="text-sm text-white/30 max-w-lg mx-auto">
                Each profile is graded A-F with honest confidence levels.
                Validators fetch real data — no hallucination.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DIM_DATA.map((dim, i) => (
                <motion.div key={dim.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.15)" }}
                  className="glass rounded-2xl p-5 group cursor-default transition-all duration-300 relative overflow-hidden"
                >
                  <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${dim.color} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/8 transition-colors">
                        <motion.svg
                          className="w-4.5 h-4.5 text-white/50 group-hover:text-indigo-400 transition-colors"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                          whileHover={{ rotate: 5, scale: 1.1 }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={dim.icon} />
                        </motion.svg>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">{dim.key}</span>
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1">{dim.label}</h3>
                    <p className="text-xs text-white/25 leading-relaxed">{dim.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ FEATURED AGENTS ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Agent <span className="text-indigo-400">Profiles</span>
              </h2>
              <p className="text-sm text-white/30 max-w-lg mx-auto">
                Trust synthesis stored on-chain. Composable by any contract.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingFeatured
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                      <div className="flex justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5" />
                        <div className="w-14 h-14 rounded-full bg-white/5" />
                      </div>
                      <div className="h-4 bg-white/5 rounded w-24 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-16 mb-4" />
                      <div className="flex gap-2">
                        <div className="h-3 bg-white/5 rounded w-10" />
                        <div className="h-3 bg-white/5 rounded w-10" />
                        <div className="h-3 bg-white/5 rounded w-10" />
                      </div>
                    </div>
                  ))
                : featured.map((p) => <AgentCard key={p.identifier} profile={p} />)
              }
            </div>
            <div className="text-center mt-8">
              <Link to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium glass rounded-xl
                           text-white/60 hover:text-white hover:bg-white/[.06] transition-all">
                Explore all profiles
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </Section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                How It <span className="text-indigo-400">Works</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { step: "01", title: "Search", desc: "Enter GitHub handle, ENS, wallet, or @twitter", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
                { step: "02", title: "Fetch", desc: "Validators fetch real data from GitHub API & Etherscan", icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" },
                { step: "03", title: "Consensus", desc: "5 AI validators grade independently, agree via Equivalence Principle", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
                { step: "04", title: "Compose", desc: "Any contract queries specific dimensions in one call", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
              ].map((s, i) => (
                <motion.div key={s.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-5 text-center"
                >
                  <span className="text-[10px] font-mono text-indigo-400/60 block mb-3">{s.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-[11px] text-white/25 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ COMPOSABILITY / CODE ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Composable by <span className="text-indigo-400">Design</span>
              </h2>
              <p className="text-sm text-white/30 max-w-lg mx-auto">
                Any Intelligent Contract queries trust dimensions in a single call.
                Gate by code grade, DeFi experience, or governance participation.
              </p>
            </div>
            <CodeBlock />
            <div className="text-center mt-6">
              <Link to="/integrate"
                className="text-sm text-indigo-400/60 hover:text-indigo-400 font-mono transition-colors">
                View full API reference →
              </Link>
            </div>
          </div>
        </Section>

        {/* ═══════ ECONOMIC MODEL ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Skin in the <span className="text-indigo-400">Game</span>
              </h2>
              <p className="text-sm text-white/30 max-w-lg mx-auto">
                Query fees fund the protocol. Stakers endorse grades with real tokens.
                Wrong assessments get slashed on dispute.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { title: "Query Fees", val: "1,000 wei", desc: "Per vouch or refresh. Sustainable protocol revenue.", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
                { title: "Stake-to-Vouch", val: "5,000 wei", desc: "Minimum stake to endorse a dimension grade.", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
                { title: "Dispute Slash", val: "Full stake", desc: "Wrong stakers lose everything on re-evaluation.", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
              ].map((item, i) => (
                <motion.div key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-6 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mb-1">{item.val}</div>
                  <h3 className="text-sm font-semibold text-white/60 mb-2">{item.title}</h3>
                  <p className="text-[11px] text-white/25 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ CTA ═══════ */}
        <Section className="py-16 sm:py-24 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-indigo-600/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-violet-600/10 blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to build with trust?</h2>
                <p className="text-sm text-white/30 mb-8 max-w-md mx-auto">
                  One cross-contract call. Six dimensions. Real evidence.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/integrate"
                    className="px-6 py-3 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors">
                    Start Integrating
                  </Link>
                  <a href="https://github.com/Ridwannurudeen/vouch-fun" target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 text-sm font-medium glass rounded-xl text-white/60 hover:text-white hover:bg-white/[.06] transition-all">
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="border-t border-white/[.06] mt-8">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid sm:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white font-bold text-[10px]">V</span>
                  </div>
                  <span className="text-white font-bold">vouch.fun</span>
                </div>
                <p className="text-xs text-white/25 leading-relaxed">
                  6-dimension trust synthesis for the agentic economy.
                  Evidence-grounded. Stake-backed.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Navigate</h4>
                <div className="flex flex-col gap-2">
                  {["/explore", "/compare", "/how-it-works", "/integrate"].map((p) => (
                    <Link key={p} to={p} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                      {p.slice(1).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Resources</h4>
                <div className="flex flex-col gap-2">
                  <a href="https://github.com/Ridwannurudeen/vouch-fun" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-white/60 transition-colors">GitHub</a>
                  <a href="https://www.genlayer.com/" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-white/60 transition-colors">GenLayer</a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/[.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-white/15">Built for the Bradbury Builders Hackathon</span>
              <span className="text-[10px] text-white/15">Powered by GenLayer Optimistic Democracy</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
