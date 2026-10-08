import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import UserLayout from "./layouts/UserLayout";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import Challenges from "./pages/Challenges/Challenges";
import Challenge from "./pages/Challenge/Challenge";
import Leaderboard from "./pages/Leaderboard/Leaderboard";
import Profile from "./pages/Profile/Profile";
import Community from "./pages/Community/Community";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminCommunity from "./pages/Admin/AdminCommunity";

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="route-loading">Checking your account...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="route-loading">Checking admin access...</div>;
  }

  return profile?.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/challenge/:id" element={<Challenge />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="community" element={<AdminCommunity />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;