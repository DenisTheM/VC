import { createContext, useContext } from "react";
import type { Profile } from "../lib/auth";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User;
  profile: Profile;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthGuard");
  return ctx;
}
