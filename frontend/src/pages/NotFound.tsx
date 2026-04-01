import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void text-white flex flex-col">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24 text-center flex-1">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-2">Page not found</h2>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist. Try searching for a profile instead.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-bright transition-colors"
          >
            Search Profiles
          </Link>
          <Link
            to="/explore"
            className="px-6 py-3 glass glass-hover rounded-lg font-medium transition-colors"
          >
            Explore All
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
