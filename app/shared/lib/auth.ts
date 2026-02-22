import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "client";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  organization_id: string | null;
}

export async function getProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, organization_id")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error.message, error.code, error);
    return null;
  }
  if (!data) {
    console.error("No profile data returned for user:", user.id);
    return null;
  }
  return data as Profile;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function getRedirectPath(role: UserRole): string {
  return role === "admin" ? "/app/docgen" : "/app/portal";
}
