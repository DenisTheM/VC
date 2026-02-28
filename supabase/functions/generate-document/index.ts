import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOC_NAMES: Record<string, string> = {
  aml_policy: "AML-Richtlinie",
  kyc_checklist: "KYC-Checkliste",
  risk_assessment: "Risikoklassifizierung",
  audit_prep: "Audit-Vorbereitung",
  kyt_policy: "Transaktionsüberwachung",
  annual_report: "Compliance-Jahresbericht",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user — require auth header, verify user if possible
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Extract JWT and verify user via admin client (more reliable than anon client)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth verification failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", detail: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: profile } = await supabaseAdmin
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
    const { docType, jurisdiction, companyProfile, answers, organizationId, chapters } = await req.json();

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
- Formatiere das Dokument in Markdown mit klarer Kapitelstruktur
- Verwende Blockquotes (>) für wichtige Hinweise:
  > **Wichtig:** für zentrale Compliance-Hinweise
  > **Achtung:** für Warnungen und Risiken
  > **Rechtsgrundlage:** für Gesetzesreferenzen
- Beginne das Dokument mit einer kurzen Zusammenfassung (3-4 Sätze)
- Verwende Tabellen wo sinnvoll (Risikokategorien, Schwellenwerte, Zuständigkeiten)
- Nummeriere Hauptkapitel (1. Einleitung, 2. Geltungsbereich, ...)`;

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

    // Extract custom prompt from answers (prefixed with __ to separate from doc-specific fields)
    const customPrompt = answers?.__customPrompt?.toString().trim() || "";

    const userPrompt = `Erstelle ein vollständiges "${docType}" Compliance-Dokument für folgende Firma:

## Firmenprofil (Ebene A)
${profileSummary}

## Jurisdiktion (Ebene C)
${jurisdictionMap[jurisdiction] || jurisdiction}

## Dokumentspezifische Angaben (Ebene B)
${answersSummary}

Erstelle das Dokument mit allen relevanten Kapiteln, Gesetzesreferenzen und firmenspezifischen Anpassungen.
Das Dokument soll sofort verwendbar sein und den aktuellen regulatorischen Stand widerspiegeln.${
  chapters && Array.isArray(chapters) && chapters.length > 0
    ? `\n\n## Gewünschte Kapitelstruktur\n${chapters.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}\n\nBitte halte dich an diese Kapitelstruktur.`
    : ""
}${customPrompt ? `\n\n## Zusätzliche Anweisungen des Benutzers\n${customPrompt}` : ""}`;

    // Call Claude API with timeout
    console.log(`[generate-document] Starting generation: docType=${docType}, orgId=${organizationId}, jurisdiction=${jurisdiction}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let claudeResponse: Response;
    try {
      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 12000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const isAbort = (fetchErr as Error).name === "AbortError";
      console.error(`[generate-document] Claude API ${isAbort ? "timeout" : "fetch error"}:`, fetchErr);
      return new Response(JSON.stringify({
        error: isAbort
          ? "Die Generierung hat das Zeitlimit von 2 Minuten überschritten. Bitte versuchen Sie es erneut."
          : "Verbindung zur Claude API fehlgeschlagen.",
        code: isAbort ? "timeout" : "connection_error",
      }), {
        status: isAbort ? 504 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error(`[generate-document] Claude API error (${claudeResponse.status}):`, errorText);

      let errorMessage = "Dokumentgenerierung fehlgeschlagen.";
      let errorCode = "api_error";
      try {
        const parsed = JSON.parse(errorText);
        const errType = parsed?.error?.type;
        if (errType === "rate_limit_error") {
          errorMessage = "Claude API Rate-Limit erreicht — bitte in 30 Sekunden erneut versuchen.";
          errorCode = "rate_limit";
        } else if (errType === "overloaded_error") {
          errorMessage = "Claude API ist überlastet — bitte in 30 Sekunden erneut versuchen.";
          errorCode = "overloaded";
        } else if (errType === "invalid_request_error") {
          errorMessage = "Ungültige Anfrage an Claude API.";
          errorCode = "invalid_request";
        } else if (errType === "authentication_error") {
          errorMessage = "Claude API Authentifizierung fehlgeschlagen (API-Key prüfen).";
          errorCode = "auth_error";
        } else {
          errorMessage = `Claude API Fehler: ${parsed?.error?.message || errType || "Unbekannt"}`;
        }
      } catch { /* errorText wasn't JSON — use default message */ }

      return new Response(JSON.stringify({ error: errorMessage, code: errorCode }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResponse.json();
    const generatedContent = claudeData.content?.[0]?.text || "";

    if (!generatedContent || generatedContent.trim().length === 0) {
      console.error("[generate-document] Claude returned empty content:", JSON.stringify(claudeData));
      return new Response(JSON.stringify({
        error: "Claude hat ein leeres Dokument zurückgegeben. Bitte versuchen Sie es erneut.",
        code: "empty_content",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save document to database
    const { data: doc, error: insertError } = await supabaseAdmin
      .from("documents")
      .insert({
        doc_type: docType,
        name: DOC_NAMES[docType] || docType,
        content: generatedContent,
        jurisdiction,
        organization_id: organizationId,
        status: "draft",
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
          status: "draft",
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
