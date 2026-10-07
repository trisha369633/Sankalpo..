import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Challenge from "./pages/Challenge/Challenge";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Leaderboard from "./pages/Leaderboard/Leaderboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/challenge/:id"
        element={<Challenge />}
      />

      <Route
        path="/leaderboard"
        element={<Leaderboard />}
      />

      <Route
        path="/admin"
        element={<AdminDashboard />}
      />
    </Routes>
  );
}

export default App;