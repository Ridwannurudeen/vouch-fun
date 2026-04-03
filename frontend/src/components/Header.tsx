import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const linkClass = (path: string) =>
    `transition-colors ${
      location.pathname === path
        ? "text-accent-bright"
        : "text-gray-400 hover:text-white"
    }`;

  return (
    <header className="border-b border-glass-border bg-void/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">vouch.fun</span>
          <span className="text-xs text-gray-500 font-mono mt-1">Trust Synthesis</span>
          <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-mono mt-1">GenLayer</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 text-sm">
          <Link to="/" className={linkClass("/")}>Search</Link>
          <Link to="/explore" className={linkClass("/explore")}>Explore</Link>
          <Link to="/agents" className={`${linkClass("/agents")} !text-indigo-400`}>Agents</Link>
          <Link to="/compare" className={linkClass("/compare")}>Compare</Link>
          <Link to="/gates" className={linkClass("/gates")}>Gates</Link>
          <Link to="/how-it-works" className={linkClass("/how-it-works")}>How It Works</Link>
          <Link to="/integrate" className={linkClass("/integrate")}>Integrate</Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-gray-400 hover:text-white"
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
        <nav className="md:hidden border-t border-glass-border px-4 pb-4 flex flex-col gap-3 text-sm bg-void/95 backdrop-blur-md">
          <Link to="/" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/")}`}>Search</Link>
          <Link to="/explore" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/explore")}`}>Explore</Link>
          <Link to="/agents" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/agents")}`}>Agents</Link>
          <Link to="/compare" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/compare")}`}>Compare</Link>
          <Link to="/gates" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/gates")}`}>Gates</Link>
          <Link to="/how-it-works" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/how-it-works")}`}>How It Works</Link>
          <Link to="/integrate" onClick={() => setOpen(false)} className={`py-1 ${linkClass("/integrate")}`}>Integrate</Link>
        </nav>
      )}
    </header>
  );
}
