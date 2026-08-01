import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeUsername } from "@/lib/usernames";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Initializing session check");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthProvider: Session check complete", { session });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AuthProvider: Auth state changed", { event, session });
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    console.log("AuthProvider: signUp called");
    const cleanUsername = normalizeUsername(username);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: cleanUsername },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) {
      console.error("AuthProvider: signUp error", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("AuthProvider: signIn called");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("AuthProvider: signIn error", error);
      throw error;
    }
    console.log("AuthProvider: signIn successful");
  };

  const signOut = async () => {
    console.log("AuthProvider: signOut called");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: signOut error", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
