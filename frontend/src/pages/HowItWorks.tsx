import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";

interface StepProps {
  index: number;
  title: string;
  description: string;
  icon: string;
  detail: string;
}

function Step({ index, title, description, icon, detail }: StepProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="flex gap-6 items-start"
    >
      {/* Step number + line */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={visible ? { scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-12 h-12 rounded-full bg-accent-dim text-accent
                     flex items-center justify-center text-xl font-bold shrink-0 border border-accent/20"
        >
          {icon}
        </motion.div>
        {index < 5 && (
          <motion.div
            className="w-0.5 h-16 bg-accent/20 mt-2"
            initial={{ scaleY: 0 }}
            animate={visible ? { scaleY: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{ transformOrigin: "top" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <span className="text-xs font-mono text-accent mb-1 block">
          Step {index + 1}
        </span>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-3">{description}</p>
        <div className="text-sm text-gray-500 bg-white/[0.03] border border-glass-border rounded-lg p-3 font-mono">
          {detail}
        </div>
      </div>
    </motion.div>
  );
}

const STEPS: StepProps[] = [
  {
    index: 0,
    title: "Enter any identifier",
    description:
      "Search a GitHub handle, ENS name, wallet address, or @twitter. vouch.fun detects the type and submits it to GenLayer's AI validator network.",
    icon: "\u{1F50D}",
    detail: 'vouch("torvalds") \u2192 type: github \u2192 submitted to 5 validators',
  },
  {
    index: 1,
    title: "Validators fetch REAL web data",
    description:
      "Each validator uses gl.nondet.web.render() to fetch real GitHub API data, Etherscan pages, and ENS records. No hallucination \u2014 grades are based on actual evidence.",
    icon: "\u{1F310}",
    detail:
      'web.render("api.github.com/users/torvalds") \u2192 { repos: 7, stars: 180k, ... }',
  },
  {
    index: 2,
    title: "AI grades 6 dimensions from evidence",
    description:
      "With real data in hand, each validator grades code, on-chain, social, governance, DeFi, and identity. Confidence is high only when backed by fetched data.",
    icon: "\u{1F916}",
    detail:
      "V1: code=A(high), onchain=F(high) | V2: code=A(high), onchain=F(high) | ...",
  },
  {
    index: 3,
    title: "Equivalence Principle reaches consensus",
    description:
      "GenLayer's Optimistic Democracy compares all assessments. If they're semantically equivalent (not identical), consensus is reached. Disagreements trigger re-evaluation.",
    icon: "\u2696\uFE0F",
    detail:
      "eq_principle.prompt_non_comparative(eval_fn, criteria=...)",
  },
  {
    index: 4,
    title: "6-dimension profile stored on-chain",
    description:
      "The consensus profile with grades, confidence levels, reasoning, and key signals for all 6 dimensions is stored on GenLayer. Query fees accumulate in the protocol fee pool.",
    icon: "\u{1F512}",
    detail:
      '{ code: "A"(high), onchain: "F"(high), score: 48 } \u2192 on-chain | fee: 1000 wei \u2192 pool',
  },
  {
    index: 5,
    title: "Stake, query, or dispute",
    description:
      "Other contracts query dimensions. Users stake tokens endorsing grades. Disputes trigger re-evaluation with fresh data \u2014 wrong stakers get slashed.",
    icon: "\u{1F527}",
    detail:
      'stake_vouch("torvalds", "code", "A") | dispute("torvalds", "grade wrong")',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-void text-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-3">How It Works</h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            vouch.fun fetches real web data, then uses GenLayer's AI consensus to synthesize
            6-dimension trust profiles. Evidence-grounded, stake-backed, fully on-chain.
          </p>
        </div>

        <div className="space-y-2">
          {STEPS.map((step) => (
            <Step key={step.index} {...step} />
          ))}
        </div>

        {/* Why GenLayer section */}
        <motion.div
          className="mt-16 glass rounded-2xl p-8 border border-accent/20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Why This Is Only Possible on GenLayer
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl mb-2">{"\uD83E\uDDE0"}</div>
              <h4 className="font-bold text-white mb-1">AI-Native Consensus</h4>
              <p className="text-sm text-gray-400">
                Validators run LLMs, not just hash computations. Trust assessment requires intelligence.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">{"\uD83E\uDD1D"}</div>
              <h4 className="font-bold text-white mb-1">Optimistic Democracy</h4>
              <p className="text-sm text-gray-400">
                The Equivalence Principle ensures assessments agree semantically, not just numerically.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">{"\uD83D\uDD17"}</div>
              <h4 className="font-bold text-white mb-1">Composable Trust</h4>
              <p className="text-sm text-gray-400">
                Any contract reads trust tiers via a single view call. No APIs, no middleware.
              </p>
            </div>
          </div>
        </motion.div>

        {/* vs Ethos */}
        <motion.div
          className="mt-12 glass rounded-2xl p-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            vouch.fun vs Traditional Reputation
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-glass-border">
              <h4 className="font-bold text-gray-500 mb-2">Traditional (Ethos, etc.)</h4>
              <ul className="space-y-1 text-gray-400">
                <li>- Human peer reviews (subjective)</li>
                <li>- Centralized API dependency</li>
                <li>- Sybil-vulnerable (fake vouches)</li>
                <li>- Not composable on-chain</li>
              </ul>
            </div>
            <div className="bg-accent-dim rounded-xl p-4 border border-accent/20">
              <h4 className="font-bold text-accent-bright mb-2">vouch.fun (AI Consensus)</h4>
              <ul className="space-y-1 text-gray-300">
                <li>- AI evaluates real activity (objective)</li>
                <li>- Fully on-chain, no API</li>
                <li>- Sybil-resistant (code speaks)</li>
                <li>- One-line composability</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">Ready to integrate trust into your contract?</p>
          <Link
            to="/integrate"
            className="inline-block px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-bright transition-colors"
          >
            View Integration Docs
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
