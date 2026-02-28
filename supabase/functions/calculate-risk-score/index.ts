// supabase/functions/calculate-risk-score/index.ts
// =============================================================================
// Batch risk score calculation for all customers of an organization
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

// Inline risk scoring (mirrors shared/lib/riskScoring.ts for Deno)
const DEFAULT_WEIGHTS = { country: 25, industry: 15, pep: 20, products: 15, volume: 10, source_of_funds: 15 };

const FATF_HIGH_RISK: Record<string, number> = { IR: 90, KP: 95, MM: 85 };
const SECO_SANCTIONS: Record<string, number> = { BY: 60, RU: 65, CU: 55, ER: 55, LB: 50, SY: 85, AF: 80, YE: 75, LY: 75, SD: 75, SO: 80, IQ: 70, VE: 65, SS: 70, CD: 65, CF: 65 };
const LOW_RISK: string[] = ["CH","DE","AT","FR","IT","GB","US","CA","JP","AU","NZ","SE","NO","DK","FI","NL","BE","LU","IE","ES","PT","SG","HK","KR"];

function getCountryRisk(code: string, custom?: Record<string, number>): number {
  const c = code.toUpperCase();
  if (custom && c in custom) return custom[c];
  if (c in FATF_HIGH_RISK) return FATF_HIGH_RISK[c];
  if (c in SECO_SANCTIONS) return SECO_SANCTIONS[c];
  if (LOW_RISK.includes(c)) return 10;
  return 30;
}

function riskCategory(score: number): string {
  if (score <= 25) return "low";
  if (score <= 50) return "standard";
  if (score <= 75) return "elevated";
  return "high";
}

// deno-lint-ignore no-explicit-any
function calcRisk(customer: any, weights: Record<string, number>, countryMap: Record<string, number>): { score: number; level: string; factors: Record<string, number> } {
  const data = customer.data ?? customer;
  const total = Object.values(weights).reduce((a: number, b: number) => (a as number) + (b as number), 0) as number;
  const norm = total > 0 ? 100 / total : 1;

  const countryScore = data.nationality ? getCountryRisk(String(data.nationality), countryMap) : 30;
  const pepScore = data.pep_status ? 90 : 5;
  const industryScore = 30; // simplified for batch
  const productScore = 30;
  const volScore = 30;
  const sofScore = 30;

  const factors = { country: countryScore, industry: industryScore, pep: pepScore, products: productScore, volume: volScore, source_of_funds: sofScore };

  const overall = Math.round(
    (countryScore * weights.country + industryScore * weights.industry + pepScore * weights.pep +
     productScore * weights.products + volScore * weights.volume + sofScore * weights.source_of_funds) * norm / 100
  );

  return { score: Math.min(100, Math.max(0, overall)), level: riskCategory(overall), factors };
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    // Auth check
    const auth = await verifyAuth(req);
    if (!auth.authenticated) return unauthorizedResponse(cors);

    const ip = getClientIp(req);
    const rl = await checkRateLimit(ip, "calculate-risk-score", 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(cors, rl.retryAfter);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Load org's SRO to find the right scoring profile
    const { data: org } = await supabase
      .from("organizations")
      .select("sro")
      .eq("id", organization_id)
      .single();

    const sro = org?.sro ?? "VQF";

    // Load risk scoring profile
    const { data: profile } = await supabase
      .from("risk_scoring_profiles")
      .select("weights, country_risk_map")
      .eq("sro", sro)
      .eq("name", "Standard")
      .maybeSingle();

    const weights = (profile?.weights as Record<string, number>) ?? DEFAULT_WEIGHTS;
    const countryMap = (profile?.country_risk_map as Record<string, number>) ?? {};

    // Load all customers for this org
    const { data: customers, error: custErr } = await supabase
      .from("client_customers")
      .select("id, data")
      .eq("organization_id", organization_id);

    if (custErr) throw custErr;
    if (!customers || customers.length === 0) {
      return new Response(JSON.stringify({ calculated: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = auth.userId;

    // Calculate scores for all customers
    let calculated = 0;
    for (const customer of customers) {
      const result = calcRisk(customer, weights, countryMap);

      const { error: upsertErr } = await supabase
        .from("customer_risk_scores")
        .upsert({
          customer_id: customer.id,
          organization_id,
          overall_score: result.score,
          risk_level: result.level,
          factors: result.factors,
          calculated_at: new Date().toISOString(),
          calculated_by: userId,
        }, { onConflict: "customer_id" });

      if (!upsertErr) calculated++;
    }

    return new Response(JSON.stringify({ calculated, total: customers.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calculate-risk-score error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
