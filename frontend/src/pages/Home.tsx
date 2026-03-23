import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import StatsBar from "../components/StatsBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-center pt-32 pb-16 gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-3">vouch.fun</h1>
            <p className="text-xl text-gray-500">Trust, Verified.</p>
            <p className="text-sm text-gray-400 mt-2 max-w-md">
              Composable reputation oracle for GenLayer.
              AI-verified trust profiles from GitHub and on-chain activity.
            </p>
          </div>
          <SearchBar />
          <StatsBar />
        </div>
      </main>
    </div>
  );
}
