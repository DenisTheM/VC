// Shared rate limiter for Edge Functions
// Uses rate_limit_log table for IP-based token bucket

import { createClient } from "jsr:@supabase/supabase-js@2";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * Check if a request is within rate limits.
 * @param ip - Client IP address
 * @param endpoint - Edge Function name (e.g. "generate-document")
 * @param maxReqs - Max requests allowed in the window (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxReqs = 60,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const windowStart = new Date(Date.now() - windowMs).toISOString();

  // Count recent requests from this IP for this endpoint
  const { count, error: countErr } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .gte("requested_at", windowStart);

  if (countErr) {
    // Fail closed: deny request on DB errors to prevent abuse
    console.error("Rate limit check failed:", countErr);
    return { allowed: false, remaining: 0, retryAfter: 10 };
  }

  const currentCount = count ?? 0;

  if (currentCount >= maxReqs) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  // Log this request
  await supabase
    .from("rate_limit_log")
    .insert({ ip_address: ip, endpoint });

  // Periodic cleanup (1% chance per request)
  if (Math.random() < 0.01) {
    await supabase.rpc("cleanup_rate_limit_log").catch(() => {});
  }

  return { allowed: true, remaining: maxReqs - currentCount - 1 };
}

/**
 * Extract client IP from request headers.
 * Vercel/Supabase set various headers for the real client IP.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

/**
 * Create a rate-limited error response.
 */
export function rateLimitResponse(
  corsHeaders: Record<string, string>,
  retryAfter = 60,
): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Bitte versuchen Sie es später erneut." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
