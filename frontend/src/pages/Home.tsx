import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import StatsBar from "../components/StatsBar";
import ProfileCard from "../components/ProfileCard";
import { readProfileByHandle } from "../lib/genlayer";
import type { TrustProfile } from "../types";

const SAMPLE_HANDLES = ["vbuterin", "gakonst", "ridwannurudeen"];
const FEATURED_HANDLES = ["vbuterin", "gakonst", "ridwannurudeen"];

export default function Home() {
  const [featured, setFeatured] = useState<TrustProfile[]>([]);

  useEffect(() => {
    Promise.all(FEATURED_HANDLES.map((h) => readProfileByHandle(h)))
      .then((profiles) => setFeatured(profiles.filter((p): p is TrustProfile => p !== null)));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <div className="flex flex-col items-center justify-center pt-24 pb-12 gap-8">
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
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-3">
                {"\u{1F50D}"}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Search</h3>
              <p className="text-sm text-gray-500">
                Enter any GitHub handle to begin evaluation
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-3">
                {"\u2696\uFE0F"}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Consensus</h3>
              <p className="text-sm text-gray-500">
                5 AI validators evaluate independently and reach agreement
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-3">
                {"\u{1F512}"}
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
        {featured.length > 0 && (
          <div className="py-12 border-t border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Featured Profiles
            </h2>
            <p className="text-sm text-gray-400 text-center mb-8">
              Evaluated by AI consensus — stored on-chain
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {featured.map((p) => (
                <ProfileCard key={p.handle} profile={p} />
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                to="/explore"
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
              >
                Explore all profiles &rarr;
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
