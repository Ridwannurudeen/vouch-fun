import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SearchBar from "../components/SearchBar";
import StatsBar from "../components/StatsBar";
import ProfileCard from "../components/ProfileCard";
import { readProfileByHandle } from "../lib/genlayer";
import type { TrustProfile } from "../types";

const SAMPLE_HANDLES = ["vbuterin", "torvalds", "samczsun", "haydenzadams"];
const FEATURED_HANDLES = ["vbuterin", "gakonst", "ridwannurudeen"];

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-4 bg-gray-100 rounded w-1/4 mb-4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-gray-100 rounded w-12" />
        <div className="h-6 bg-gray-100 rounded w-12" />
      </div>
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState<TrustProfile[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    Promise.all(FEATURED_HANDLES.map((h) => readProfileByHandle(h)))
      .then((profiles) => setFeatured(profiles.filter((p): p is TrustProfile => p !== null)))
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <div className="flex flex-col items-center justify-center pt-24 pb-12 gap-8 bg-gradient-to-b from-indigo-50 to-white -mx-4 px-4 rounded-b-3xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-3">vouch.fun</h1>
            <p className="text-xl text-gray-500">The Trust Layer for the Agentic Economy</p>
            <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
              Before agents transact, they need to trust each other.
              vouch.fun fetches real data from GitHub, Etherscan, and ENS, then synthesizes
              6-dimension trust profiles via decentralized AI consensus — grounded in evidence, not hallucination.
            </p>
          </div>
          <SearchBar />
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-xs text-gray-400">Try:</span>
            {SAMPLE_HANDLES.map((h) => (
              <Link
                key={h}
                to={`/profile/${h}`}
                className="text-xs font-mono text-gray-500 hover:text-gray-900 underline"
              >
                {h}
              </Link>
            ))}
          </div>
          <StatsBar />
        </div>

        {/* Agent use cases */}
        <div className="py-12 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Why Agents Need Trust
          </h2>
          <p className="text-sm text-gray-400 text-center mb-8 max-w-lg mx-auto">
            In the agentic economy, autonomous agents hire, transact, and delegate to each other.
            Before any interaction, they need to answer: "Can I trust this entity?"
            vouch.fun provides the answer across 6 dimensions.
          </p>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {[
              { title: "Agent hires auditor", desc: 'Check code dimension: get_dimension(addr, "code") — only agents with B+ grade can audit', icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
              { title: "Protocol gates access", desc: 'Check DeFi dimension: get_dimension(addr, "defi") — require proven DeFi experience before large swaps', icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: "DAO weights votes", desc: 'Check governance dimension: get_dimension(addr, "governance") — scale voting power by participation', icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
            ].map((uc) => (
              <div key={uc.title} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                <svg className="w-6 h-6 text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={uc.icon} />
                </svg>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{uc.title}</h3>
                <p className="text-xs text-gray-400">{uc.desc}</p>
              </div>
            ))}
          </div>
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
            6 Dimensions of Trust
          </h3>
          <p className="text-sm text-gray-400 text-center mb-8 max-w-lg mx-auto">
            Each profile is graded across code, on-chain, social, governance, DeFi, and identity
            with A-F grades and confidence levels.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Code", desc: "GitHub repos, commits, languages, stars", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
              { label: "On-Chain", desc: "Transactions, contracts, account age", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
              { label: "Social", desc: "Followers, influence, community reach", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
              { label: "Governance", desc: "DAO votes, proposals, delegation", icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" },
              { label: "DeFi", desc: "Protocol usage, TVL, yield farming", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Identity", desc: "ENS, verified accounts, Lens/Farcaster", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            ].map((d) => (
              <div key={d.label} className="border border-gray-100 rounded-xl p-4 text-center hover:border-indigo-200 transition-colors">
                <svg className="w-6 h-6 text-indigo-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={d.icon} />
                </svg>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{d.label}</h3>
                <p className="text-xs text-gray-400">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works teaser */}
        <div className="py-12 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Trust Through AI Consensus
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Search</h3>
              <p className="text-sm text-gray-500">
                Enter any GitHub handle, ENS name, wallet address, or @twitter
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Fetch + Grade</h3>
              <p className="text-sm text-gray-500">
                5 AI validators fetch real web data, then grade 6 dimensions independently
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Trust</h3>
              <p className="text-sm text-gray-500">
                Graded profile stored on-chain, composable by any contract
              </p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link
              to="/how-it-works"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Learn how it works &rarr;
            </Link>
          </div>
        </div>

        {/* Featured Profiles */}
        <div className="py-12 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Featured Profiles
          </h2>
          <p className="text-sm text-gray-400 text-center mb-8">
            6-dimension trust synthesis — stored on-chain
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {loadingFeatured
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : featured.map((p) => (
                  <ProfileCard key={p.identifier || (p as any).handle} profile={p} />
                ))}
          </div>
          <div className="text-center mt-6">
            <Link
              to="/explore"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Explore All Profiles
            </Link>
          </div>
        </div>

        {/* Composability teaser */}
        <div className="py-12 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Composable by Design
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-lg mx-auto mb-8">
            Any agent or contract queries trust dimensions in a single view call.
            Gate agent registration by code grade, protocol access by DeFi experience, or voting power by governance participation.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono max-w-2xl mx-auto">
            <span className="text-gray-500"># From any Intelligent Contract:</span>{"\n"}
            vouch = gl.ContractAt(vouch_addr){"\n"}
            tier = vouch.get_trust_tier(addr){"\n"}
            code = vouch.get_dimension(addr, <span className="text-amber-300">"code"</span>){"\n"}
            score = vouch.get_trust_score(addr){"\n\n"}
            <span className="text-green-400">if</span> tier == <span className="text-amber-300">"TRUSTED"</span> <span className="text-green-400">and</span> score &gt;= <span className="text-amber-300">70</span>: allow()
          </div>
          <div className="text-center mt-6">
            <Link
              to="/integrate"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              View full integration docs &rarr;
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
