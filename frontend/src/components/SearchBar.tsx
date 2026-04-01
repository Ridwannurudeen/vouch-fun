import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const KNOWN_HANDLES = [
  "vbuterin", "gakonst", "ridwannurudeen", "torvalds",
  "haydenzadams", "samczsun",
];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const matches = query.trim()
    ? KNOWN_HANDLES.filter((h) => h.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    navigate(`/profile/${encodeURIComponent(trimmed)}`);
  };

  const handleSelect = (handle: string) => {
    setQuery(handle);
    setShowDropdown(false);
    navigate(`/profile/${encodeURIComponent(handle)}`);
  };

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setShowDropdown(false), 150);
  };

  const handleFocus = () => {
    clearTimeout(blurTimeout.current);
    if (query.trim()) setShowDropdown(true);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(!!e.target.value.trim());
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="GitHub handle, ENS name, wallet, or @twitter"
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

      {showDropdown && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {matches.map((handle) => (
            <button
              key={handle}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(handle)}
              className="w-full text-left px-6 py-3 font-mono text-sm text-gray-700
                         hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {handle}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
