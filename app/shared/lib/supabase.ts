import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 0 } },
  auth: { persistSession: true, autoRefreshToken: true },
  global: {
    fetch: (url, options) => {
      const controller = new AbortController();
      const ms = options?.method === "POST" || options?.method === "PATCH" || options?.method === "DELETE" ? 30000 : 15000;
      const timeout = setTimeout(() => controller.abort(), ms);
      return fetch(url, { ...options, signal: controller.signal }).finally(() =>
        clearTimeout(timeout),
      );
    },
  },
});
