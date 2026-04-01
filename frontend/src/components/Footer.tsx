import { Link } from "react-router-dom";
import { contractAddress } from "../lib/genlayer";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-16">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-gray-900">vouch.fun</span>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Composable reputation oracle powered by AI consensus on GenLayer.
              Trust profiles verified by 5 independent validators.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Navigate
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/explore" className="text-sm text-gray-600 hover:text-gray-900">
                Explore Profiles
              </Link>
              <Link to="/compare" className="text-sm text-gray-600 hover:text-gray-900">
                Compare
              </Link>
              <Link to="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
                How It Works
              </Link>
              <Link to="/integrate" className="text-sm text-gray-600 hover:text-gray-900">
                Integrate
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Resources
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/Ridwannurudeen/vouch-fun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                GitHub
              </a>
              <a
                href="https://www.genlayer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                GenLayer
              </a>
              {contractAddress && (
                <span className="text-xs text-gray-400 font-mono break-all mt-1">
                  Contract: {contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            Built for the Bradbury Builders Hackathon
          </span>
          <span className="text-xs text-gray-400">
            Powered by GenLayer Optimistic Democracy
          </span>
        </div>
      </div>
    </footer>
  );
}
