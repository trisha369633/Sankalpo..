import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadSession(sessionUser) {
    setUser(sessionUser ?? null);
    setProfile(null);

    if (!sessionUser) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile loading error:", error);
    }

    setProfile(data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      let sessionUser = null;

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error && !error.message.includes("Auth session missing")) {
          console.error("Auth user error:", error);
        }

        sessionUser = user ?? null;
      } catch (error) {
        const message = error?.message || "";

        if (!message.includes("Auth session missing")) {
          console.error("Auth user error:", error);
        }
      }

      if (!mounted) return;
      await loadSession(sessionUser);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        loadSession(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}