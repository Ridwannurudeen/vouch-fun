import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Home from "./pages/Home";

const Profile = lazy(() => import("./pages/Profile"));
const Integrate = lazy(() => import("./pages/Integrate"));
const Explore = lazy(() => import("./pages/Explore"));
const Compare = lazy(() => import("./pages/Compare"));
const Gates = lazy(() => import("./pages/Gates"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AgentDemo = lazy(() => import("./pages/AgentDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-void text-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-gray-700 border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-mono">Loading route...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:handle" element={<Profile />} />
          <Route path="/integrate" element={<Integrate />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/:a/:b" element={<Compare />} />
          <Route path="/gates" element={<Gates />} />
          <Route path="/agents" element={<AgentDemo />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
