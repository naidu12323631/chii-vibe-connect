import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Map a Supabase session into our lightweight User shape.
const toUser = (session: Session | null): User | null => {
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    display_name: (u.user_metadata?.display_name as string | undefined) ?? null,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Merge the user's profile avatar + display name (from the profiles table)
  // into the lightweight session user, so the nav can show their photo.
  const hydrateProfile = async (base: User | null) => {
    if (!base) return;
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", base.id)
      .maybeSingle();
    setUser((cur) =>
      cur && cur.id === base.id
        ? { ...cur, avatar_url: data?.avatar_url ?? null, display_name: data?.display_name ?? cur.display_name }
        : cur,
    );
  };

  useEffect(() => {
    // Restore any existing session, then keep it in sync.
    supabase.auth.getSession().then(({ data }) => {
      const u = toUser(data.session);
      setUser(u);
      setLoading(false);
      hydrateProfile(u);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = toUser(session);
      setUser(u);
      hydrateProfile(u);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Re-pull the profile avatar/name for the current user (call after editing).
  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await hydrateProfile(toUser(data.session));
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw new Error(error.message);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) throw new Error(error.message);
    // Redirects to Google; the app reloads at /app with the session on return.
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
