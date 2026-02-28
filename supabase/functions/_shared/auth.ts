// Shared auth helper for Edge Functions
// Extracts and validates the user from the Authorization header

import { createClient } from "jsr:@supabase/supabase-js@2";

interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Verify the user's auth token from the request header.
 * Returns authenticated: false if no valid token is provided.
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { authenticated: false, userId: null, error: "Missing authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return { authenticated: false, userId: null, error: "Empty token" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { authenticated: false, userId: null, error: "Invalid or expired token" };
  }

  return { authenticated: true, userId: user.id };
}

/**
 * Create a 401 Unauthorized response.
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>, message = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
