import { Link } from "react-router-dom";
import { contractAddress } from "../lib/genlayer";

export default function Footer() {
  return (
    <footer className="border-t border-glass-border bg-void-light mt-16">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-white">vouch.fun</span>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              6-dimension trust synthesis for the agentic economy.
              Graded by 5 independent AI validators on GenLayer.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Navigate
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/explore" className="text-sm text-gray-400 hover:text-white transition-colors">
                Explore Profiles
              </Link>
              <Link to="/compare" className="text-sm text-gray-400 hover:text-white transition-colors">
                Compare
              </Link>
              <Link to="/how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link to="/integrate" className="text-sm text-gray-400 hover:text-white transition-colors">
                Integrate
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Resources
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/Ridwannurudeen/vouch-fun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://www.genlayer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                GenLayer
              </a>
              {contractAddress && (
                <span className="text-xs text-gray-600 font-mono break-all mt-1">
                  Contract: {contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-glass-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-600">
            Built for the Bradbury Builders Hackathon
          </span>
          <span className="text-xs text-gray-600">
            Powered by GenLayer Optimistic Democracy
          </span>
        </div>
      </div>
    </footer>
  );
}
