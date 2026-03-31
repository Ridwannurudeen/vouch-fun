import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">vouch.fun</span>
          <span className="text-xs text-gray-500 font-mono mt-1">Trust, Verified.</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900">Search</Link>
          <Link to="/explore" className="text-gray-600 hover:text-gray-900">Explore</Link>
          <Link to="/compare" className="text-gray-600 hover:text-gray-900">Compare</Link>
          <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
          <Link to="/integrate" className="text-gray-600 hover:text-gray-900">Integrate</Link>
        </nav>
      </div>
    </header>
  );
}
