import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LeafIcon } from "../../components/SankalpoIcons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, profileError, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || authLoading) return;
    navigate(profile?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, profile, authLoading, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(signInError?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <LeafIcon size={26} strokeWidth={1.7} />
          SANKALPO
        </div>

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Continue your journey toward a greener community.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            required
            onChange={(event) => setEmail(event.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Your password"
            value={password}
            autoComplete="current-password"
            required
            onChange={(event) => setPassword(event.target.value)}
          />

          {(error || (user && profileError)) && (
            <p className="auth-error">
              {error || `Signed in, but your profile could not be loaded: ${profileError}`}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}