import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getProfile, type Profile } from "../lib/auth";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    // Get initial session + profile in parallel
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        // Start profile fetch immediately (no await on session)
        getProfile(session.user).then((profile) => {
          if (!cancelled) {
            setState({ user: session.user, session, profile, loading: false });
          }
        });
      } else {
        setState({ user: null, session: null, profile: null, loading: false });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        const profile = await getProfile(session.user);
        if (!cancelled) {
          setState({ user: session.user, session, profile, loading: false });
        }
      } else {
        setState({ user: null, session: null, profile: null, loading: false });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
