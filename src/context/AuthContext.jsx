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
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;
    let authEventVersion = 0;

    async function loadSession(sessionUser) {
      const currentRequest = ++requestId;
      setUser(sessionUser ?? null);
      setProfile(null);
      setProfileError("");
      setLoading(true);

      if (!sessionUser) {
        if (mounted && currentRequest === requestId) setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (!mounted || currentRequest !== requestId) return;
        if (error) throw error;
        if (!data) throw new Error("No profile exists for this account.");
        setProfile(data);
      } catch (error) {
        if (!mounted || currentRequest !== requestId) return;
        console.error("Profile loading error:", error);
        setProfileError(error?.message || "Unable to load your profile.");
      } finally {
        if (mounted && currentRequest === requestId) setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion += 1;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setProfile(null);
      setProfileError("");
      setLoading(true);
      setTimeout(() => {
        if (mounted) void loadSession(sessionUser);
      }, 0);
    });

    const initialEventVersion = authEventVersion;

    async function loadUser() {
      try {
        const {
          data: { user: sessionUser },
          error,
        } = await supabase.auth.getUser();

        if (error && !error.message.includes("Auth session missing")) {
          throw error;
        }
        if (!mounted || initialEventVersion !== authEventVersion) return;
        await loadSession(sessionUser ?? null);
      } catch (error) {
        if (!mounted || initialEventVersion !== authEventVersion) return;
        const message = error?.message || "";
        if (!message.includes("Auth session missing")) {
          console.error("Auth user error:", error);
          setProfileError(message || "Unable to check your session.");
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }

    void loadUser();

    return () => {
      mounted = false;
      requestId += 1;
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
        profileError,
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