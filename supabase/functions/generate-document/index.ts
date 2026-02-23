import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { docType, jurisdiction, companyProfile, answers, organizationId } = await req.json();

    if (!docType || !jurisdiction || !companyProfile) {
      return new Response(JSON.stringify({ error: "Missing required fields: docType, jurisdiction, companyProfile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId ist erforderlich. Bitte wählen Sie eine Organisation." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the prompt
    const systemPrompt = `Du bist ein erfahrener Schweizer AML-Compliance-Experte und Jurist, spezialisiert auf:
- Schweizer Geldwäschereigesetz (GwG/AMLA)
- FINMA-Verordnung über die Bekämpfung von Geldwäscherei (AMLO-FINMA)
- SRO-Regularien (VQF, PolyReg, SRO/SLV, etc.)
- Deutsche GwG-Anforderungen (BaFin)
- EU Anti-Money Laundering Directives (AMLD)

Du erstellst professionelle, regulierungskonforme Compliance-Dokumente auf Deutsch (Schweizer Standarddeutsch).
Deine Dokumente sind:
- Rechtlich präzise und vollständig
- Praxisorientiert und umsetzbar
- Auf die spezifische Firma und deren Risikoprofil zugeschnitten
- Mit korrekten Gesetzesreferenzen versehen

FORMATIERUNGSREGELN FÜR DAS DOKUMENT:
- Verwende Standard-Markdown: # ## ### für Überschriften, - für Listen, **fett** für Hervorhebungen
- Verwende \`---\` für horizontale Trennlinien (NICHT %%%%% oder ===== oder andere Sonderzeichen)
- Verwende \`- [ ] Text\` für Checkboxen zum Ankreuzen (NICHT & Text oder andere Sonderzeichen)
- Verwende \`_____\` (5+ Underscores) für ausfüllbare Formularfelder, z.B. "Name: _____________________"
- Verwende KEINE Sonderzeichen wie &, %, § als Aufzählungszeichen oder Dekoration
- Halte das Format schlicht, druckfreundlich und professionell
- Formatiere das Dokument in Markdown mit klarer Kapitelstruktur`;

    const profileSummary = Object.entries(companyProfile)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");

    const answersSummary = answers
      ? Object.entries(answers)
          .filter(([, v]) => v !== undefined && v !== "" && v !== null)
          .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n")
      : "Keine zusätzlichen Angaben.";

    const jurisdictionMap: Record<string, string> = {
      CH: "Schweiz (FINMA / GwG / AMLO-FINMA / SRO-Regularien)",
      DE: "Deutschland (BaFin / GwG DE)",
      EU: "Europäische Union (AMLD / AMLA-EU)",
    };

    const userPrompt = `Erstelle ein vollständiges "${docType}" Compliance-Dokument für folgende Firma:

## Firmenprofil (Ebene A)
${profileSummary}

## Jurisdiktion (Ebene C)
${jurisdictionMap[jurisdiction] || jurisdiction}

## Dokumentspezifische Angaben (Ebene B)
${answersSummary}

Erstelle das Dokument mit allen relevanten Kapiteln, Gesetzesreferenzen und firmenspezifischen Anpassungen.
Das Dokument soll sofort verwendbar sein und den aktuellen regulatorischen Stand widerspiegeln.`;

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 12000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", errorText);
      return new Response(JSON.stringify({ error: "Document generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResponse.json();
    const generatedContent = claudeData.content?.[0]?.text || "";

    // Save document to database
    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({
        doc_type: docType,
        name: docType,
        content: generatedContent,
        jurisdiction,
        organization_id: organizationId,
        status: "review",
        wizard_answers: answers || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: doc.id,
          content: generatedContent,
          status: "review",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
