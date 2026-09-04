"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type CustomerAuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<{ error: AuthError | null }>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

function getRole(user: User | null) {
  const metadataRole = user?.user_metadata?.role;
  if (typeof metadataRole === "string" && metadataRole.trim()) {
    return metadataRole.trim().toLowerCase();
  }

  const appRole = user?.app_metadata?.role;
  if (typeof appRole === "string" && appRole.trim()) {
    return appRole.trim().toLowerCase();
  }

  return null;
}

function isCustomerSession(session: Session | null) {
  const role = getRole(session?.user ?? null);
  return Boolean(session?.user) && role !== "admin" && role !== "rider" && role !== "operator";
}

export default function CustomerAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(isCustomerSession(nextSession) ? nextSession : null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [supabase]);

  const value = useMemo<CustomerAuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    logout,
  }), [loading, logout, session]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth deve essere usato dentro CustomerAuthProvider");
  }
  return context;
}
