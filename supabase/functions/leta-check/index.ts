// supabase/functions/leta-check/index.ts
// =============================================================================
// LETA Transparenzregister Check (Stub)
// Adapter pattern: returns "not_available" until LETA goes live (mid-2026)
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

// LETA API Status — set to true when LETA goes live
const LETA_LIVE = false;

interface LetaResult {
  available: boolean;
  status: "not_available" | "matched" | "discrepancy" | "not_found";
  message: string;
  // deno-lint-ignore no-explicit-any
  data?: any;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    // Auth check — mandatory
    const auth = await verifyAuth(req);
    if (!auth.authenticated) return unauthorizedResponse(cors);

    const ip = getClientIp(req);
    const rl = await checkRateLimit(ip, "leta-check", 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(cors, rl.retryAfter);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { customer_id, organization_id, entity_uid } = await req.json();

    if (!customer_id || !organization_id) {
      return new Response(JSON.stringify({ error: "customer_id and organization_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let result: LetaResult;

    if (!LETA_LIVE) {
      // Stub mode — LETA not yet available
      result = {
        available: false,
        status: "not_available",
        message: "Das LETA Transparenzregister ist noch nicht verfügbar (Go-Live voraussichtlich Mitte 2026). UBO-Daten werden lokal gespeichert und nach Go-Live automatisch abgeglichen.",
      };
    } else {
      // Real LETA API call (Phase 2 — after Go-Live)
      // const LETA_API_URL = Deno.env.get("LETA_API_URL") ?? "";
      // const LETA_API_KEY = Deno.env.get("LETA_API_KEY") ?? "";
      // ...
      result = {
        available: true,
        status: "not_found",
        message: "Kein Eintrag im LETA Register gefunden.",
      };
    }

    // Update UBO declaration with check result
    const { error: updateErr } = await supabase
      .from("ubo_declarations")
      .update({
        leta_status: result.status === "not_available" ? "not_checked" : result.status,
        leta_check_date: new Date().toISOString(),
        leta_response: result,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_id", customer_id)
      .eq("organization_id", organization_id);

    if (updateErr) console.error("Failed to update UBO declaration:", updateErr);

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("leta-check error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
