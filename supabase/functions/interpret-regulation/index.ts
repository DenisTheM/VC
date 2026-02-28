// supabase/functions/interpret-regulation/index.ts
// =============================================================================
// AI Regulatory Change Interpreter
// Uses Claude API to analyze regulatory changes and provide actionable guidance
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

// Sanitize user-controlled strings before embedding in prompt
function sanitize(str: string | null | undefined, maxLen = 500): string {
  if (!str) return "";
  return str.slice(0, maxLen).replace(/[<>{}]/g, "");
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    // Auth check — mandatory
    const auth = await verifyAuth(req);
    if (!auth.authenticated) return unauthorizedResponse(cors);

    // Rate limit: 5 req/min (expensive AI calls)
    const ip = getClientIp(req);
    const rl = await checkRateLimit(ip, "interpret-regulation", 5, 60_000);
    if (!rl.allowed) return rateLimitResponse(cors, rl.retryAfter);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { alert_id, organization_id } = await req.json();
    if (!alert_id) {
      return new Response(JSON.stringify({ error: "alert_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Load alert data
    const { data: alert, error: alertErr } = await supabase
      .from("regulatory_alerts")
      .select("title, summary, legal_basis, jurisdiction, category")
      .eq("id", alert_id)
      .single();

    if (alertErr || !alert) {
      return new Response(JSON.stringify({ error: "Alert not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Load org context if provided
    let orgContext = "";
    if (organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name, sro, industry, country")
        .eq("id", organization_id)
        .single();

      const { data: profile } = await supabase
        .from("company_profiles")
        .select("data")
        .eq("organization_id", organization_id)
        .maybeSingle();

      // deno-lint-ignore no-explicit-any
      const pd = (profile?.data ?? {}) as any;

      if (org) {
        orgContext = `
Kundenkontext:
- Firma: ${org.name}
- SRO: ${org.sro ?? "Unbekannt"}
- Branche: ${pd.industry ?? org.industry ?? "Unbekannt"}
- Produkte: ${Array.isArray(pd.products) ? pd.products.join(", ") : pd.products ?? "Unbekannt"}
- Geo-Fokus: ${Array.isArray(pd.geo_focus) ? pd.geo_focus.join(", ") : pd.geo_focus ?? "Schweiz"}
- Land: ${org.country ?? "CH"}`;
      }
    }

    const systemPrompt = `Du bist ein Schweizer Compliance-Experte spezialisiert auf AML/GwG-Regulierung.
Analysiere regulatorische Änderungen und erstelle präzise, handlungsorientierte Zusammenfassungen für Finanzintermediäre.
Antworte auf Deutsch. Sei konkret und praxisnah.`;

    const userPrompt = `Analysiere folgende Regulierungsänderung für einen Schweizer Finanzintermediär:

Regulierung: ${sanitize(alert.title, 200)}
Zusammenfassung: ${sanitize(alert.summary, 2000) || "Nicht verfügbar"}
Rechtsgrundlage: ${sanitize(alert.legal_basis, 200) || "Nicht angegeben"}
Jurisdiktion: ${sanitize(alert.jurisdiction, 10) || "CH"}
Kategorie: ${sanitize(alert.category, 50) || "Allgemein"}
${orgContext}

Erstelle eine strukturierte Analyse im folgenden JSON-Format:
{
  "summary": "Zusammenfassung in 2-3 Sätzen",
  "impact_areas": ["Betroffener Bereich 1", "Betroffener Bereich 2"],
  "action_items": [
    {"priority": "high|medium|low", "action": "Konkrete Massnahme", "deadline_hint": "Zeitrahmen"}
  ],
  "affected_articles": ["Art. X GwG", "Art. Y GwV-FINMA"],
  "risk_assessment": "Einschätzung des Risikos für den Kunden"
}

Antworte NUR mit dem JSON-Objekt, ohne Markdown-Formatierung.`;

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Call Claude API
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Claude API error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.content?.[0]?.text ?? "";

    // Parse JSON from response
    let interpretation;
    try {
      interpretation = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      interpretation = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: rawText, impact_areas: [], action_items: [], affected_articles: [] };
    }

    // Store interpretation
    const { error: updateErr } = await supabase
      .from("regulatory_alerts")
      .update({
        ai_interpretation: interpretation,
        interpretation_model: "claude-sonnet-4-6",
        interpreted_at: new Date().toISOString(),
      })
      .eq("id", alert_id);

    if (updateErr) console.error("Failed to store interpretation:", updateErr);

    return new Response(JSON.stringify({
      interpretation,
      model: "claude-sonnet-4-6",
      interpreted_at: new Date().toISOString(),
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("interpret-regulation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
