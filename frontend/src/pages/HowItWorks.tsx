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
          className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600
                     flex items-center justify-center text-xl font-bold shrink-0"
        >
          {icon}
        </motion.div>
        {index < 4 && (
          <motion.div
            className="w-0.5 h-16 bg-indigo-100 mt-2"
            initial={{ scaleY: 0 }}
            animate={visible ? { scaleY: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{ transformOrigin: "top" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <span className="text-xs font-mono text-indigo-500 mb-1 block">
          Step {index + 1}
        </span>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-3">{description}</p>
        <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3 font-mono">
          {detail}
        </div>
      </div>
    </motion.div>
  );
}

const STEPS: StepProps[] = [
  {
    index: 0,
    title: "You search a GitHub handle",
    description:
      "Enter any GitHub username. vouch.fun submits it to GenLayer's network of AI validators for independent evaluation.",
    icon: "\u{1F50D}",
    detail: 'vouch("torvalds") \u2192 submitted to 5 validators',
  },
  {
    index: 1,
    title: "5 AI validators evaluate independently",
    description:
      "Each validator runs its own LLM instance to analyze the developer's GitHub activity and on-chain presence. No validator sees another's work.",
    icon: "\u{1F916}",
    detail:
      "Validator 1: grade A (45k stars) | Validator 2: grade A (520 commits) | ...",
  },
  {
    index: 2,
    title: "Validators compare via Equivalence Principle",
    description:
      "GenLayer's Optimistic Democracy consensus compares all assessments. If they're equivalent (not identical, but semantically aligned), consensus is reached.",
    icon: "\u2696\uFE0F",
    detail:
      "eq_principle.prompt_non_comparative(eval_fn, criteria=...)",
  },
  {
    index: 3,
    title: "Consensus reached, profile stored on-chain",
    description:
      "The agreed-upon trust profile is stored permanently on GenLayer. Anyone can read it \u2014 no API keys, no rate limits, no centralized authority.",
    icon: "\u{1F512}",
    detail:
      '{ trust_tier: "TRUSTED", code: "A", onchain: "A" } \u2192 on-chain',
  },
  {
    index: 4,
    title: "Any contract queries trust in one line",
    description:
      "Other Intelligent Contracts call get_trust_tier(address) to gate actions based on reputation. Trust becomes composable infrastructure.",
    icon: "\u{1F527}",
    detail:
      'tier = gl.ContractAt(vouch).get_trust_tier(addr)\nif tier == "TRUSTED": allow()',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">How It Works</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            vouch.fun uses GenLayer's AI consensus to create trust profiles
            that no single entity controls. Here's how.
          </p>
        </div>

        <div className="space-y-2">
          {STEPS.map((step) => (
            <Step key={step.index} {...step} />
          ))}
        </div>

        {/* Why GenLayer section */}
        <motion.div
          className="mt-16 border border-indigo-100 rounded-2xl p-8 bg-indigo-50/30"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Why This Is Only Possible on GenLayer
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl mb-2">{"\uD83E\uDDE0"}</div>
              <h4 className="font-bold text-gray-900 mb-1">AI-Native Consensus</h4>
              <p className="text-sm text-gray-600">
                Validators run LLMs, not just hash computations. Trust assessment requires intelligence.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">{"\uD83E\uDD1D"}</div>
              <h4 className="font-bold text-gray-900 mb-1">Optimistic Democracy</h4>
              <p className="text-sm text-gray-600">
                The Equivalence Principle ensures assessments agree semantically, not just numerically.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">{"\uD83D\uDD17"}</div>
              <h4 className="font-bold text-gray-900 mb-1">Composable Trust</h4>
              <p className="text-sm text-gray-600">
                Any contract reads trust tiers via a single view call. No APIs, no middleware.
              </p>
            </div>
          </div>
        </motion.div>

        {/* vs Ethos */}
        <motion.div
          className="mt-12 border border-gray-200 rounded-2xl p-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
            vouch.fun vs Traditional Reputation
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-500 mb-2">Traditional (Ethos, etc.)</h4>
              <ul className="space-y-1 text-gray-600">
                <li>- Human peer reviews (subjective)</li>
                <li>- Centralized API dependency</li>
                <li>- Sybil-vulnerable (fake vouches)</li>
                <li>- Not composable on-chain</li>
              </ul>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4">
              <h4 className="font-bold text-indigo-700 mb-2">vouch.fun (AI Consensus)</h4>
              <ul className="space-y-1 text-indigo-900">
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
          <p className="text-gray-500 mb-4">Ready to integrate trust into your contract?</p>
          <Link
            to="/integrate"
            className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            View Integration Docs
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
