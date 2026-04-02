import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { readProfileByHandle, generateProfile } from "../lib/genlayer";
import type { TrustProfile, DimensionKey } from "../types";
import { DIMENSIONS, DIMENSION_LABELS } from "../types";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const SAMPLE_HANDLES = ["vbuterin", "torvalds", "samczsun", "haydenzadams"];
const FEATURED = ["vbuterin", "gakonst", "samczsun"];

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-400", B: "text-sky-400", C: "text-amber-400",
  D: "text-orange-400",  F: "text-red-400", "N/A": "text-gray-500",
};

/* ═══════════════════════════════════════════════════
   #1 FIX: HERO ANIMATION — Trust Constellation
   ═══════════════════════════════════════════════════ */
const CONSTELLATION_NODES = [
  { angle: -90,  label: "Code",    color: "#60a5fa", shortColor: "blue" },
  { angle: -30,  label: "On-Chain", color: "#818cf8", shortColor: "indigo" },
  { angle: 30,   label: "Social",  color: "#f472b6", shortColor: "pink" },
  { angle: 90,   label: "DeFi",    color: "#34d399", shortColor: "emerald" },
  { angle: 150,  label: "Gov",     color: "#fbbf24", shortColor: "amber" },
  { angle: 210,  label: "Identity", color: "#c084fc", shortColor: "violet" },
];

function TrustConstellation() {
  const cx = 200, cy = 200, R = 120;
  const nodes = CONSTELLATION_NODES.map((n) => ({
    ...n,
    x: cx + R * Math.cos((n.angle * Math.PI) / 180),
    y: cy + R * Math.sin((n.angle * Math.PI) / 180),
  }));

  return (
    <div className="relative w-full h-full">
      {/* Ambient glow behind constellation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full bg-indigo-500/10 blur-[60px]" />
      </div>
      <svg viewBox="0 0 400 400" className="w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
          {nodes.map((n, i) => (
            <linearGradient key={`lg-${i}`} id={`line-grad-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0.5" />
            </linearGradient>
          ))}
        </defs>

        {/* Center glow */}
        <circle cx={cx} cy={cy} r={60} fill="url(#centerGlow)" />

        {/* Connecting lines — base */}
        {nodes.map((n, i) => (
          <motion.line key={`bl-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y}
            stroke={`url(#line-grad-${i})`} strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5 + i * 0.12, ease: "easeOut" }}
          />
        ))}

        {/* Connecting lines — data flow (dashed overlay) */}
        {nodes.map((n, i) => (
          <line key={`df-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y}
            stroke={n.color} strokeWidth="1" strokeOpacity="0.25"
            strokeDasharray="2 8" className="dash-flow"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}

        {/* Cross-links between adjacent nodes */}
        {nodes.map((n, i) => {
          const next = nodes[(i + 1) % nodes.length];
          return (
            <motion.line key={`cl-${i}`} x1={n.x} y1={n.y} x2={next.x} y2={next.y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 1.5 + i * 0.08 }}
            />
          );
        })}

        {/* Center node */}
        <motion.circle cx={cx} cy={cy} r={28}
          fill="rgba(79,70,229,0.15)" stroke="rgba(129,140,248,0.4)" strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150, delay: 0.3 }}
        />
        <motion.text x={cx} y={cy - 4} textAnchor="middle"
          className="text-[10px] font-bold" fill="#a5b4fc"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        >
          TRUST
        </motion.text>
        <motion.text x={cx} y={cy + 8} textAnchor="middle"
          className="text-[8px] font-mono" fill="rgba(165,180,252,0.5)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        >
          SCORE
        </motion.text>

        {/* Outer nodes */}
        {nodes.map((n, i) => (
          <g key={`node-${i}`}>
            {/* Pulse ring */}
            <circle cx={n.x} cy={n.y} r={12}
              fill="none" stroke={n.color} strokeWidth="0.5" strokeOpacity="0.3"
              className="ring-pulse"
              style={{
                transformOrigin: `${n.x}px ${n.y}px`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
            {/* Node circle */}
            <motion.circle cx={n.x} cy={n.y} r={10}
              fill={n.color + "1a"} stroke={n.color + "80"} strokeWidth="1.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.6 + i * 0.1 }}
            />
            {/* Inner dot */}
            <motion.circle cx={n.x} cy={n.y} r={3}
              fill={n.color} fillOpacity="0.6"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            />
            {/* Label */}
            <motion.text
              x={n.x} y={n.y + (n.angle > 0 && n.angle < 180 ? 24 : -18)}
              textAnchor="middle" className="text-[9px] font-mono font-medium" fill="rgba(255,255,255,0.45)"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1 + i * 0.1 }}
            >
              {n.label}
            </motion.text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   #3 FIX: SOCIAL PROOF — CountUp animation
   ═══════════════════════════════════════════════════ */
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════
   #4 FIX: BETTER NEBULA — more shapes, more dynamic
   ═══════════════════════════════════════════════════ */
function Nebula() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* Primary indigo blob — top left */}
      <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[40%] rounded-[40%_60%_70%_30%] bg-indigo-600/[.1] blur-[140px] animate-nebula-drift will-change-transform" />
      {/* Violet blob — bottom right */}
      <div className="absolute -bottom-[10%] -right-[5%] w-[45%] h-[35%] rounded-[60%_40%_30%_70%] bg-violet-600/[.07] blur-[120px] animate-nebula-drift-2 will-change-transform" />
      {/* Cyan accent — mid right */}
      <div className="absolute top-[40%] right-[5%] w-[25%] h-[20%] rounded-[30%_70%_50%_50%] bg-cyan-400/[.03] blur-[80px] animate-nebula-drift-3 will-change-transform" />
      {/* Deep indigo — mid left */}
      <div className="absolute top-[60%] -left-[5%] w-[20%] h-[25%] rounded-[50%_50%_30%_70%] bg-indigo-500/[.05] blur-[100px] animate-nebula-drift-2 will-change-transform" style={{ animationDelay: "-10s" }} />
      {/* Faint rose — top right */}
      <div className="absolute -top-[5%] right-[20%] w-[15%] h-[15%] rounded-full bg-pink-500/[.03] blur-[60px] animate-nebula-drift-3 will-change-transform" style={{ animationDelay: "-5s" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GLASS NAV (kept from v1 with minor tweaks)
   ═══════════════════════════════════════════════════ */
function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="glass rounded-2xl px-5 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-sm">V</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight">vouch<span className="text-indigo-400">.fun</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/explore", label: "Explore" },
              { to: "/compare", label: "Compare" },
              { to: "/how-it-works", label: "How It Works" },
              { to: "/integrate", label: "Integrate" },
            ].map((l) => (
              <Link key={l.to} to={l.to}
                className="px-3 py-1.5 text-[13px] text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200">
                {l.label}
              </Link>
            ))}
            <Link to="/integrate"
              className="ml-2 px-4 py-1.5 text-[13px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-all">
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
              className="md:hidden glass rounded-2xl mt-2 p-3 flex flex-col gap-0.5">
              {["/explore", "/compare", "/how-it-works", "/integrate"].map((p) => (
                <Link key={p} to={p} onClick={() => setOpen(false)}
                  className="px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
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

/* ═══════════════════════════════════════════════════
   COMMAND CENTER SEARCH
   ═══════════════════════════════════════════════════ */
function CommandSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let q = query.trim();
    // Strip GitHub/Twitter URL prefixes — users paste full URLs
    q = q.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
    q = q.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "@");
    q = q.replace(/\/$/, ""); // trailing slash
    if (q) navigate(`/profile/${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <motion.div
        animate={focused ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className={`relative glass rounded-2xl search-glow transition-all duration-500
          ${focused ? "border-indigo-500/40" : ""}`}
      >
        <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Search any identity..."
          className="w-full bg-transparent text-white placeholder-white/20 pl-14 pr-20 py-5 text-base font-mono outline-none selection:bg-indigo-500/30"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] text-white/25 bg-white/5 rounded border border-white/[.06] font-mono">Enter</kbd>
        </div>
      </motion.div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════
   #7 FIX: LARGER SCORE RING (80px)
   ═══════════════════════════════════════════════════ */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 5;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={`sg-${score}-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
      <motion.circle cx={size/2} cy={size/2} r={r}
        stroke={`url(#sg-${score}-${size})`} strokeWidth="3.5" fill="none" strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${c}` }}
        whileInView={{ strokeDasharray: `${c - offset} ${c}` }}
        viewport={{ once: true }}
        transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   #7 FIX: AGENT ID CARD — centered large ring
   ═══════════════════════════════════════════════════ */
function AgentCard({ profile }: { profile: TrustProfile }) {
  const id = profile.identifier || "";
  const score = profile.overall?.trust_score ?? 0;
  const tier = profile.overall?.trust_tier || "UNKNOWN";
  const tierColor: Record<string, string> = {
    TRUSTED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    MODERATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    LOW: "text-red-400 bg-red-500/10 border-red-500/20",
    UNKNOWN: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };

  return (
    <motion.div whileHover={{ y: -6, borderColor: "rgba(129,140,248,0.3)" }}
      transition={{ type: "spring", stiffness: 300 }}>
      <Link to={`/profile/${id}`}
        className="block glass glass-hover rounded-2xl p-6 transition-all duration-300 group">
        {/* Score ring — centered & prominent */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <ScoreRing score={score} size={96} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white font-mono leading-none">{score}</span>
              <span className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">score</span>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="text-center mb-3">
          <h3 className="text-white font-bold font-mono text-base group-hover:text-indigo-300 transition-colors mb-1.5">
            {id}
          </h3>
          <span className={`inline-flex text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${tierColor[tier]}`}>
            {tier}
          </span>
        </div>

        {/* Dimension grades strip */}
        <div className="flex justify-center gap-2 mb-5">
          {DIMENSIONS.map((dim: DimensionKey) => {
            const d = profile[dim];
            if (!d?.grade) return null;
            return (
              <div key={dim} className="text-center">
                <div className={`text-sm font-black font-mono ${GRADE_COLOR[d.grade] || "text-gray-500"}`}>{d.grade}</div>
                <div className="text-[8px] text-white/20 uppercase tracking-wider">{DIMENSION_LABELS[dim].slice(0, 3)}</div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 text-center text-xs font-semibold text-indigo-300 bg-indigo-500/10
                     border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-all cursor-pointer">
          View Profile →
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   IDE CODE BLOCK (Tokyo Night)
   ═══════════════════════════════════════════════════ */
function CodeBlock() {
  const [copied, setCopied] = useState(false);
  const code = `# Inside your GenLayer Intelligent Contract
from genlayer import *
import json

vouch = gl.ContractAt(Address(VOUCH_ADDR))

# Check trust tier before allowing action
tier = str(vouch.get_trust_tier(agent_addr))
if tier in ("LOW", "UNKNOWN"):
    raise Exception("Insufficient trust")

# Gate by specific dimension
code = json.loads(str(
    vouch.get_dimension(addr, "code")
))
if code["grade"] in ("D", "F"):
    raise Exception("Code reputation too low")

# Numeric score for weighted decisions
score = int(str(vouch.get_trust_score(addr)))`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlight = (line: string) => {
    if (line.startsWith("#")) return <span className="text-tn-comment">{line}</span>;
    return line.split(/(\b(?:from|import|if|in|raise|str|int)\b|"[^"]*"|'[^']*'|#.*$)/g).map((tok, i) => {
      if (/^(from|import|if|in|raise)$/.test(tok)) return <span key={i} className="text-tn-keyword">{tok}</span>;
      if (/^(str|int)$/.test(tok)) return <span key={i} className="text-tn-fn">{tok}</span>;
      if (/^["']/.test(tok)) return <span key={i} className="text-tn-string">{tok}</span>;
      if (tok.startsWith("#")) return <span key={i} className="text-tn-comment">{tok}</span>;
      return <span key={i} className="text-tn-var">{tok}</span>;
    });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[.06]">
      <div className="flex items-center justify-between px-5 py-3 bg-tn-bg border-b border-white/[.04]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-[11px] text-white/25 font-mono">vouch_integration.py</span>
        </div>
        <motion.button onClick={handleCopy} whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] text-white/35 hover:text-white/70 bg-white/[.03] rounded-lg border border-white/[.04] transition-colors">
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
      <pre className="px-5 py-4 bg-tn-bg text-[13px] font-mono overflow-x-auto dark-scroll leading-[1.7]">
        {code.split("\n").map((line, i) => (
          <div key={i} className="flex">
            <span className="inline-block w-7 text-right mr-5 text-white/10 select-none text-xs leading-[1.7]">{i + 1}</span>
            <span>{highlight(line)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   #2 FIX: SECTION WRAPPER with stagger
   ═══════════════════════════════════════════════════ */
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   DIMENSION DATA for BENTO GRID
   ═══════════════════════════════════════════════════ */
const DIM_BENTO: { key: DimensionKey; label: string; desc: string; icon: string; color: string; detail?: string; tall?: boolean; wide?: boolean }[] = [
  { key: "code", label: "Code", desc: "Repos, commits, languages, stars, OSS impact", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", color: "#60a5fa", tall: true, detail: "Fetched from GitHub API — real repos, real stars, real commits" },
  { key: "onchain", label: "On-Chain", desc: "Tx history, contracts, account age", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", color: "#818cf8" },
  { key: "social", label: "Social", desc: "Followers, influence, standing", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "#f472b6" },
  { key: "governance", label: "Governance", desc: "DAO votes, proposals, delegation", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", color: "#fbbf24", wide: true },
  { key: "defi", label: "DeFi", desc: "Protocol usage, LP, risk appetite", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "#34d399" },
  { key: "identity", label: "Identity", desc: "ENS, Lens, Farcaster, cross-platform", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "#c084fc" },
];

/* ═══════════════════════════════════════════════════
   VOUCH YOURSELF — the viral hook
   ═══════════════════════════════════════════════════ */
function VouchYourself() {
  const [handle, setHandle] = useState("");
  const [phase, setPhase] = useState<"input" | "generating" | "done">("input");
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);
  const navigate = useNavigate();

  const handleVouch = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = handle.trim();
    // Strip GitHub/Twitter URL prefixes — users paste full URLs
    trimmed = trimmed.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
    trimmed = trimmed.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "");
    trimmed = trimmed.replace(/\/$/, ""); // trailing slash
    trimmed = trimmed.replace(/^@/, "");
    if (!trimmed) return;
    setPhase("generating");
    setError("");
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 60000);
    try {
      await generateProfile(trimmed);
      const p = await readProfileByHandle(trimmed);
      if (p && p.overall) {
        setProfile(p);
        setPhase("done");
      } else {
        // Profile generated but maybe needs a moment — navigate to profile page
        navigate(`/profile/${encodeURIComponent(trimmed)}`);
      }
    } catch (err: any) {
      setError(err.message || "Generation failed — validators may be busy");
      setPhase("input");
    } finally {
      clearTimeout(slowTimer);
    }
  };

  const tierColor: Record<string, string> = {
    TRUSTED: "from-emerald-500 to-emerald-600",
    MODERATE: "from-amber-500 to-amber-600",
    LOW: "from-red-500 to-red-600",
    UNKNOWN: "from-gray-500 to-gray-600",
  };

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${profile?.identifier}`;
    const text = `My vouch.fun trust score: ${profile?.overall.trust_score}/100 (${profile?.overall.trust_tier}) — ${profile?.overall.summary}\n\nGet yours:`;
    if (navigator.share) {
      navigator.share({ title: "My Vouch Score", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
    }
  };

  if (phase === "done" && profile) {
    const score = profile.overall.trust_score;
    const tier = profile.overall.trust_tier;
    return (
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="glass rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-br ${tierColor[tier]} opacity-10 blur-[80px]`} />
            </div>

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] text-emerald-400 font-mono mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Profile Generated
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="text-2xl font-black font-mono text-white mb-1">{profile.identifier}</h3>
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <ScoreRing score={score} size={120} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white font-mono leading-none">{score}</span>
                      <span className="text-[9px] text-white/30 uppercase tracking-widest mt-1">{tier}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Dimension grades */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex justify-center gap-4 mb-6"
              >
                {DIMENSIONS.map((dim: DimensionKey) => {
                  const d = profile[dim];
                  if (!d?.grade) return null;
                  return (
                    <div key={dim} className="text-center">
                      <div className={`text-lg font-black font-mono ${GRADE_COLOR[d.grade] || "text-gray-500"}`}>{d.grade}</div>
                      <div className="text-[8px] text-white/25 uppercase tracking-wider">{DIMENSION_LABELS[dim]}</div>
                    </div>
                  );
                })}
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-sm text-white/30 mb-6 max-w-md mx-auto">
                {profile.overall.summary}
              </motion.p>

              {/* Action buttons */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="flex justify-center gap-3">
                <Link to={`/profile/${profile.identifier}`}
                  className="px-6 py-3 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl font-semibold text-sm hover:bg-indigo-500/30 transition-all">
                  Full Profile
                </Link>
                <button onClick={handleShare}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-400 hover:to-violet-400 transition-all shadow-lg shadow-indigo-500/20">
                  Share My Score
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <FadeIn>
          <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">Get your score</span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Vouch <span className="gradient-text">Yourself</span>
          </h2>
          <p className="text-sm text-white/25 max-w-md mx-auto mb-8">
            5 AI validators will independently evaluate your on-chain, code, and social presence — then reach consensus on your trust profile.
          </p>

          {phase === "generating" ? (
            <div className="glass rounded-2xl p-8">
              <div className="flex flex-col items-center gap-4">
                {/* Animated dots */}
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 rounded-full bg-indigo-500"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
                <div className="text-sm text-white/40 font-mono">Validators deliberating on <span className="text-indigo-400">{handle}</span>...</div>
                <div className="text-[10px] text-white/15 font-mono">This takes 30-120 seconds — AI consensus in progress</div>
                {slow && (
                  <div className="text-xs text-amber-400/60 mt-2">Taking longer than usual — validators are still working...</div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleVouch} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <div className="relative flex-1">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="Your GitHub handle"
                  className="w-full bg-transparent text-white placeholder-white/20 pl-5 pr-4 py-4 text-base font-mono outline-none glass rounded-xl border border-white/[.06] focus:border-indigo-500/40 transition-colors"
                />
              </div>
              <motion.button
                type="submit"
                disabled={!handle.trim()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-bold text-sm
                           hover:from-indigo-400 hover:to-violet-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500
                           transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none"
              >
                Vouch Me
              </motion.button>
            </form>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-red-400/80 glass rounded-xl px-4 py-3 inline-block border border-red-500/20">
              {error}
            </motion.div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function Home() {
  const [featured, setFeatured] = useState<TrustProfile[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    Promise.all(FEATURED.map((h) => readProfileByHandle(h)))
      .then((ps) => setFeatured(ps.filter((p): p is TrustProfile => p !== null)))
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <div className="bg-void min-h-screen text-white overflow-hidden">
      <Nebula />
      <div className="relative z-10">
        <Nav />

        {/* ─── #1 FIX: HERO — split layout with constellation ─── */}
        <section className="pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-20 px-4 grid-bg">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: text + search */}
              <div className="order-2 lg:order-1">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] text-white/40 font-mono mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                    GenLayer AI Consensus
                  </div>
                </motion.div>

                {/* #6 FIX: TYPOGRAPHY — massive, dramatic */}
                <motion.h1
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95] mb-5"
                >
                  <span className="text-white">The Trust</span><br />
                  <span className="text-white">Layer for the</span><br />
                  <span className="gradient-text">Agentic Economy</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-base sm:text-lg text-white/30 max-w-md mb-8 leading-relaxed"
                >
                  Validators fetch real web data, then grade 6 trust dimensions via AI consensus.
                  Evidence-grounded. Stake-backed.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
                  <CommandSearch />
                </motion.div>

                {/* Trending */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center gap-2 mt-5">
                  <span className="text-[10px] text-white/15 font-mono uppercase tracking-wider">Try</span>
                  {SAMPLE_HANDLES.map((h) => (
                    <Link key={h} to={`/profile/${h}`}
                      className="text-[11px] font-mono text-white/25 hover:text-indigo-400 px-2.5 py-1 rounded-lg bg-white/[.02] border border-white/[.04] hover:border-indigo-500/20 transition-all">
                      {h}
                    </Link>
                  ))}
                </motion.div>
              </div>

              {/* Right: #1 & #5 FIX — constellation as signature visual + brand mark */}
              <motion.div className="order-1 lg:order-2 flex justify-center"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}>
                <div className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[420px] lg:h-[420px]">
                  <TrustConstellation />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── #3 FIX: SOCIAL PROOF BAR — counters + badges ─── */}
        <FadeIn>
          <div className="border-y border-white/[.04] bg-white/[.01]">
            <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap justify-center gap-x-10 gap-y-4">
              {[
                { value: 6, suffix: "", label: "Data Sources", sub: "GitHub · Etherscan · ENS" },
                { value: 5, suffix: "", label: "AI Validators", sub: "Independent consensus" },
                { value: 240, suffix: "+", label: "Tests", sub: "Contract + schema" },
                { value: 6, suffix: "", label: "Trust Dimensions", sub: "Code · Chain · Social · Gov · DeFi · ID" },
              ].map((s) => (
                <div key={s.label} className="text-center min-w-[100px]">
                  <div className="text-2xl sm:text-3xl font-black font-mono text-white/90">
                    <CountUp target={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">{s.label}</div>
                  <div className="text-[9px] text-white/15 font-mono mt-0.5 hidden sm:block">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ─── VOUCH YOURSELF — the viral hook ─── */}
        <VouchYourself />

        {/* ─── #2 FIX: WHY AGENTS — left-aligned title, asymmetric cards ─── */}
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="max-w-lg mb-12">
                <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">Why this matters</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                  Agents can't transact<br />without <span className="gradient-text">trust</span>
                </h2>
                <p className="text-sm text-white/25 leading-relaxed">
                  Autonomous agents hire, delegate, and transact on behalf of users.
                  vouch.fun is the trust layer they query before acting.
                </p>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { title: "Agent hires auditor", desc: 'get_dimension(addr, "code") → only B+ grade gets the contract', color: "from-blue-500/10 to-cyan-500/5", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
                { title: "Protocol gates access", desc: 'get_dimension(addr, "defi") → proven DeFi experience required', color: "from-violet-500/10 to-purple-500/5", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
                { title: "DAO weights votes", desc: 'get_dimension(addr, "governance") → scale power by participation', color: "from-amber-500/10 to-orange-500/5", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
              ].map((uc, i) => (
                <FadeIn key={uc.title} delay={i * 0.1}>
                  <div className="glass glass-hover rounded-2xl p-6 h-full relative overflow-hidden group">
                    <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br ${uc.color} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-white/[.03] border border-white/[.06] flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-white/40 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={uc.icon} />
                        </svg>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-2">{uc.title}</h3>
                      <p className="text-[11px] text-white/25 font-mono leading-relaxed">{uc.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── #2 FIX: 6 DIMENSIONS — true bento grid with varied sizes ─── */}
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">The framework</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                  6 Dimensions of <span className="gradient-text">Trust</span>
                </h2>
                <p className="text-sm text-white/25 max-w-md mx-auto">
                  Each graded A-F with honest confidence levels.
                  Validators fetch real data — no hallucination.
                </p>
              </div>
            </FadeIn>
            {/* Bento: Code tall, Governance wide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-auto">
              {DIM_BENTO.map((dim, i) => (
                <FadeIn key={dim.key} delay={i * 0.06}
                  className={`${dim.tall ? "lg:row-span-2" : ""} ${dim.wide ? "sm:col-span-2 lg:col-span-2" : ""}`}>
                  <motion.div
                    whileHover={{ y: -3, borderColor: "rgba(255,255,255,0.15)" }}
                    className={`glass rounded-2xl p-5 sm:p-6 h-full group cursor-default relative overflow-hidden transition-all duration-300
                      ${dim.tall ? "flex flex-col" : ""}`}
                  >
                    <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: dim.color + "15" }} />
                    <div className="relative flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[.03] border border-white/[.06] flex items-center justify-center group-hover:border-white/10 transition-colors">
                          <motion.svg className="w-5 h-5 transition-colors duration-300"
                            style={{ color: dim.color + "80" }}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                            whileHover={{ rotate: 5, scale: 1.1 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={dim.icon} />
                          </motion.svg>
                        </div>
                        <span className="text-[10px] font-mono text-white/15 uppercase tracking-wider">{dim.key}</span>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1.5">{dim.label}</h3>
                      <p className="text-[11px] text-white/20 leading-relaxed">{dim.desc}</p>
                      {dim.detail && (
                        <p className="text-[10px] text-indigo-400/40 font-mono mt-3 leading-relaxed border-t border-white/[.04] pt-3">
                          {dim.detail}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURED AGENTS — larger cards ─── */}
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">Live profiles</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                  Agent <span className="gradient-text">Profiles</span>
                </h2>
                <p className="text-sm text-white/25 max-w-md mx-auto">
                  Trust synthesis stored on-chain. Composable by any contract.
                </p>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingFeatured
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                      <div className="flex justify-center mb-5"><div className="w-24 h-24 rounded-full bg-white/[.03]" /></div>
                      <div className="h-4 bg-white/[.03] rounded w-24 mx-auto mb-2" />
                      <div className="h-3 bg-white/[.03] rounded w-16 mx-auto mb-4" />
                      <div className="flex justify-center gap-3">
                        {Array.from({ length: 6 }).map((_, j) => <div key={j} className="h-5 w-6 bg-white/[.03] rounded" />)}
                      </div>
                    </div>
                  ))
                : featured.map((p) => (
                    <FadeIn key={p.identifier}><AgentCard profile={p} /></FadeIn>
                  ))
              }
            </div>
            <div className="text-center mt-8">
              <Link to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium glass rounded-xl text-white/50 hover:text-white hover:bg-white/[.06] transition-all">
                Explore all profiles
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── #2 FIX: HOW IT WORKS — horizontal timeline ─── */}
        <section className="py-20 sm:py-28 px-4 overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">Process</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  How It <span className="gradient-text">Works</span>
                </h2>
              </div>
            </FadeIn>
            {/* Timeline */}
            <div className="relative">
              {/* Connecting line — desktop */}
              <div className="hidden lg:block absolute top-10 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[.08] to-transparent" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
                {[
                  { step: "01", title: "Search", desc: "Enter GitHub handle, ENS, wallet, or @twitter", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
                  { step: "02", title: "Fetch", desc: "Validators fetch real data from GitHub API, Etherscan, ENS", icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" },
                  { step: "03", title: "Consensus", desc: "5 AI validators grade independently, agree via Equivalence Principle", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
                  { step: "04", title: "Compose", desc: "Any contract queries specific dimensions. Stake, dispute, compose.", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
                ].map((s, i) => (
                  <FadeIn key={s.step} delay={i * 0.12}>
                    <div className="relative text-center lg:text-left">
                      {/* Timeline dot */}
                      <div className="hidden lg:flex w-5 h-5 rounded-full bg-void border-2 border-indigo-500/40 mx-auto lg:mx-0 mb-6 relative z-10 items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400/50 block mb-2">{s.step}</span>
                      <div className="w-11 h-11 rounded-xl bg-white/[.03] border border-white/[.06] flex items-center justify-center mx-auto lg:mx-0 mb-3">
                        <svg className="w-5 h-5 text-white/35" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                        </svg>
                      </div>
                      <h3 className="text-white font-bold text-base mb-1.5">{s.title}</h3>
                      <p className="text-[11px] text-white/20 leading-relaxed max-w-[200px] mx-auto lg:mx-0">{s.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── COMPOSABILITY CODE — left-aligned section ─── */}
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <FadeIn>
                <div>
                  <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">For developers</span>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                    Composable by<br /><span className="gradient-text">Design</span>
                  </h2>
                  <p className="text-sm text-white/25 leading-relaxed mb-6">
                    Any Intelligent Contract queries trust dimensions in a single cross-contract call.
                    Gate by code grade, DeFi experience, or governance participation.
                  </p>
                  <Link to="/integrate"
                    className="inline-flex items-center gap-2 text-sm text-indigo-400/70 hover:text-indigo-400 font-mono transition-colors">
                    Full API reference
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </FadeIn>
              <FadeIn delay={0.15}>
                <CodeBlock />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ─── #2 FIX: ECONOMIC MODEL — big numbers, not cards ─── */}
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <span className="text-[10px] text-indigo-400/60 uppercase tracking-[0.2em] font-mono font-semibold block mb-3">Economics</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                  Skin in the <span className="gradient-text">Game</span>
                </h2>
                <p className="text-sm text-white/25 max-w-md mx-auto">
                  Query fees fund the protocol. Stakes enforce honesty. Disputes slash bad actors.
                </p>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-3 gap-px bg-white/[.04] rounded-2xl overflow-hidden">
              {[
                { val: "Free", unit: "demo", title: "Query Fee", desc: "Per vouch or refresh" },
                { val: "Free", unit: "demo", title: "Stake to Endorse", desc: "Back a dimension grade" },
                { val: "100%", unit: "slash", title: "Dispute Penalty", desc: "Wrong stakers lose all" },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.1}>
                  <div className="bg-void p-8 text-center h-full">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-white mb-0.5">{item.val}</div>
                    <div className="text-[10px] text-indigo-400/50 uppercase tracking-widest font-mono mb-4">{item.unit}</div>
                    <div className="text-sm font-bold text-white/60 mb-1">{item.title}</div>
                    <div className="text-[11px] text-white/20">{item.desc}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <FadeIn className="px-4 pb-20 sm:pb-28">
          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden text-center">
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-600/10 blur-[60px]" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-violet-600/10 blur-[60px]" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">Ready to build with trust?</h2>
                <p className="text-sm text-white/25 mb-8 max-w-sm mx-auto">
                  One cross-contract call. Six dimensions. Real evidence.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/integrate"
                    className="px-7 py-3 text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                    Start Integrating
                  </Link>
                  <a href="https://github.com/Ridwannurudeen/vouch-fun" target="_blank" rel="noopener noreferrer"
                    className="px-7 py-3 text-sm font-semibold glass rounded-xl text-white/50 hover:text-white hover:bg-white/[.06] transition-all">
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-white/[.04]">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid sm:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-white font-black text-[10px]">V</span>
                  </div>
                  <span className="text-white font-black">vouch<span className="text-indigo-400/80">.fun</span></span>
                </div>
                <p className="text-[11px] text-white/20 leading-relaxed">
                  6-dimension trust synthesis for the agentic economy.
                  Evidence-grounded. Stake-backed. Fully on-chain.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] mb-3">Navigate</h4>
                <div className="flex flex-col gap-2">
                  {["/explore", "/compare", "/how-it-works", "/integrate"].map((p) => (
                    <Link key={p} to={p} className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
                      {p.slice(1).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] mb-3">Resources</h4>
                <div className="flex flex-col gap-2">
                  <a href="https://github.com/Ridwannurudeen/vouch-fun" target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-white/25 hover:text-white/50 transition-colors">GitHub</a>
                  <a href="https://www.genlayer.com/" target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-white/25 hover:text-white/50 transition-colors">GenLayer</a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/[.03] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-white/10 font-mono">Bradbury Builders Hackathon</span>
              <span className="text-[10px] text-white/10 font-mono">Powered by GenLayer Optimistic Democracy</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
