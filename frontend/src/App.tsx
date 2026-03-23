import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Integrate from "./pages/Integrate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:handle" element={<Profile />} />
        <Route path="/integrate" element={<Integrate />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
