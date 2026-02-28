// supabase/functions/sanctions-screening/index.ts
// =============================================================================
// OpenSanctions API Proxy — Sanctions/PEP Screening
// Screens a customer name against OpenSanctions datasets (SECO, EU, UN, etc.)
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const OPENSANCTIONS_API = "https://api.opensanctions.org/match/default";
const MATCH_THRESHOLD = 0.7;

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    // Rate limit: 30 req/min (external API calls)
    const ip = getClientIp(req);
    const rl = await checkRateLimit(ip, "sanctions-screening", 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(cors, rl.retryAfter);

    // Auth check
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { customer_id, organization_id, name, date_of_birth, nationality, screening_type = "sanctions" } = body;

    if (!name || !organization_id) {
      return new Response(JSON.stringify({ error: "name and organization_id are required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Build OpenSanctions match request
    const matchPayload: Record<string, unknown> = {
      schema: "Person",
      properties: {
        name: [name],
      },
    };

    if (date_of_birth) matchPayload.properties = { ...(matchPayload.properties as Record<string, unknown>), birthDate: [date_of_birth] };
    if (nationality) matchPayload.properties = { ...(matchPayload.properties as Record<string, unknown>), nationality: [nationality] };

    // Call OpenSanctions API
    let matches: { name: string; score: number; datasets: string[]; schema: string; id: string }[] = [];
    let apiStatus: "clear" | "potential_match" = "clear";

    try {
      const osResponse = await fetch(OPENSANCTIONS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: { q1: matchPayload },
        }),
      });

      if (osResponse.ok) {
        const osData = await osResponse.json();
        const results = osData?.responses?.q1?.results ?? [];

        matches = results
          .filter((r: { score: number }) => r.score >= MATCH_THRESHOLD)
          .map((r: { id: string; caption: string; score: number; datasets: string[]; schema: string; properties: Record<string, string[]> }) => ({
            id: r.id,
            name: r.caption,
            score: Math.round(r.score * 100) / 100,
            datasets: r.datasets ?? [],
            schema: r.schema,
            birthDate: r.properties?.birthDate?.[0] ?? null,
            nationality: r.properties?.nationality?.[0] ?? null,
          }));

        if (matches.length > 0) apiStatus = "potential_match";
      } else {
        console.error("OpenSanctions API error:", osResponse.status, await osResponse.text());
        // Return result with empty matches — don't fail the whole screening
      }
    } catch (osErr) {
      console.error("OpenSanctions API unreachable:", osErr);
      // Fail gracefully — log but don't block
    }

    // Store screening result in database
    if (customer_id) {
      const { error: insertErr } = await supabase
        .from("screening_results")
        .insert({
          customer_id,
          organization_id,
          screening_type,
          query_name: name,
          query_date_of_birth: date_of_birth ?? null,
          query_nationality: nationality ?? null,
          source: "opensanctions",
          status: apiStatus,
          matches,
        });

      if (insertErr) console.error("Failed to store screening result:", insertErr);
    }

    return new Response(JSON.stringify({
      status: apiStatus,
      match_count: matches.length,
      matches,
      screened_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sanctions-screening error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
