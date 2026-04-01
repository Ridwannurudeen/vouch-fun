import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SearchBar from "../components/SearchBar";
import StatsBar from "../components/StatsBar";
import ProfileCard from "../components/ProfileCard";
import { readProfileByHandle } from "../lib/genlayer";
import type { TrustProfile } from "../types";

const SAMPLE_HANDLES = ["vbuterin", "gakonst", "ridwannurudeen"];
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
            <p className="text-xl text-gray-500">The Trust Layer for GenLayer's Agentic Economy</p>
            <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
              AI-verified trust profiles from GitHub and on-chain activity.
              Evaluated by 5 independent validators via Optimistic Democracy consensus.
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
                Enter any GitHub handle to begin evaluation
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Consensus</h3>
              <p className="text-sm text-gray-500">
                5 AI validators evaluate independently and reach agreement
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
                Verified profile stored on-chain, queryable by any contract
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
            Evaluated by AI consensus — stored on-chain
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {loadingFeatured
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : featured.map((p) => <ProfileCard key={p.handle} profile={p} />)}
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
            Any GenLayer contract can query trust tiers in a single view call.
            No APIs, no middleware, no rate limits.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono max-w-2xl mx-auto">
            <span className="text-gray-500"># From any Intelligent Contract:</span>{"\n"}
            tier = gl.ContractAt(vouch).get_trust_tier(addr){"\n"}
            <span className="text-green-400">if</span> tier == <span className="text-amber-300">"TRUSTED"</span>: allow()
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
