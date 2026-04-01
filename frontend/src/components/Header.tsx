import { useState } from "react";
import { Link } from "react-router-dom";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">vouch.fun</span>
          <span className="text-xs text-gray-500 font-mono mt-1">Trust, Verified.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900">Search</Link>
          <Link to="/explore" className="text-gray-600 hover:text-gray-900">Explore</Link>
          <Link to="/compare" className="text-gray-600 hover:text-gray-900">Compare</Link>
          <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
          <Link to="/integrate" className="text-gray-600 hover:text-gray-900">Integrate</Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 text-sm">
          <Link to="/" onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900 py-1">Search</Link>
          <Link to="/explore" onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900 py-1">Explore</Link>
          <Link to="/compare" onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900 py-1">Compare</Link>
          <Link to="/how-it-works" onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900 py-1">How It Works</Link>
          <Link to="/integrate" onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900 py-1">Integrate</Link>
        </nav>
      )}
    </header>
  );
}
