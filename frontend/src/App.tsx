import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Integrate from "./pages/Integrate";
import Explore from "./pages/Explore";
import Compare from "./pages/Compare";
import Gates from "./pages/Gates";
import HowItWorks from "./pages/HowItWorks";
import AgentDemo from "./pages/AgentDemo";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
