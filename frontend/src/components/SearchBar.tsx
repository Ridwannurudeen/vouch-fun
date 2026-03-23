import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/profile/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter GitHub handle or wallet address"
          className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl
                     focus:border-gray-900 focus:outline-none transition-colors
                     font-mono placeholder:font-sans placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-gray-900 text-white
                     rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300
                     disabled:cursor-not-allowed transition-colors"
        >
          Vouch
        </button>
      </div>
    </form>
  );
}
