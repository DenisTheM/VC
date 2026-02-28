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

// Human-readable labels for profile field keys
const FIELD_LABELS: Record<string, string> = {
  company_name: "Firmenname",
  legal_form: "Rechtsform",
  uid: "UID-Nummer",
  address: "Sitz",
  founding_year: "Gründungsjahr",
  industry: "Branche",
  business_detail: "Geschäftstätigkeit",
  employees: "Mitarbeitende",
  geschaeftsleitung: "Geschäftsleitung",
  verwaltungsrat: "Verwaltungsrat",
  compliance_officer: "Compliance Officer",
  sro: "SRO-Mitgliedschaft",
  sro_status: "SRO-Status",
  finma_license: "FINMA-Lizenz",
  tx_volume: "Jährl. Transaktionsvolumen",
  client_types: "Kundentypen",
  geo_focus: "Geographischer Fokus",
  products: "Produkte & Dienstleistungen",
  crypto: "Crypto/DLT-Bezug",
  cross_border: "Grenzüberschreitende Tätigkeit",
  existing_infra: "Bestehende Compliance-Infrastruktur",
  country: "Land",
};

// SRO-specific reference data for prompt enrichment
const SRO_CONTEXT: Record<string, string> = {
  VQF: `VQF (Verein zur Qualitätssicherung von Finanzdienstleistungen) — Sitz: Zug.
Grösste und älteste SRO der Schweiz, spezialisiert auf den Parabankensektor.
Mitgliederfokus: FinTechs, Crypto/DLT-Unternehmen, Vermögensverwalter, Zahlungsdienstleister.
Spezifische Anforderungen:
- Modulares Compliance-System nach VQF-Reglement
- GwG-Grundkurs obligatorisch für alle Mitarbeitenden
- Dossiergebühr pro Kundenbeziehung (ca. CHF 30/Dossier)
- Periodische Kontrollen durch VQF-Prüfer (Administrationspauschale CHF 500 + ca. CHF 250/Std.)
- Besonderer Fokus auf VASP-Mitglieder (Virtual Asset Service Provider) seit 2024
- VQF-Reglement Art. 6-21: Sorgfaltspflichten, Dokumentation, Meldepflicht`,

  PolyReg: `PolyReg — Sitz: Zürich.
Zweitgrösste SRO, spezialisiert auf den Parabankensektor.
Mitgliederfokus: Finanzintermediäre im Parabankensektor, VASP-Mitglieder.
Spezifische Anforderungen:
- Verschärfte Aufsichtsanforderungen für VASP-Mitglieder seit Januar 2026
- Regelmässige Compliance-Berichte an PolyReg
- Risikobasierter Aufsichtsansatz
- Spezialregelungen für digitale Finanzdienstleister`,

  "SO-FIT": `SO-FIT — Westschweizer SRO.
Mitgliederfokus: Finanzintermediäre im Westschweizer Markt (Romandie).
Spezifische Anforderungen:
- Dokumentation kann auf Französisch geführt werden
- Orientiert sich eng an FINMA-Vorgaben
- Regionale Aufsichtspraxis für Westschweizer Finanzintermediäre`,

  ARIF: `ARIF (Association Romande des Intermédiaires Financiers) — Westschweiz.
Mitgliederfokus: Romandie-basierte Finanzintermediäre, spezialisierte Branchenverbände.
Spezifische Anforderungen:
- Bilinguale Dokumentation (FR/DE) möglich
- Enge Zusammenarbeit mit Genfer Finanzplatz
- Spezifische Reglemente für Vermögensverwalter und Trustees`,

  "OAR-G": `OAR-G (Organisme d'Autorégulation du canton de Genève).
Mitgliederfokus: Genfer Finanzintermediäre.
Spezifische Anforderungen:
- Kantonale Aufsicht Genf
- Französischsprachige Dokumentation
- Fokus auf Genfer Private Banking und Vermögensverwaltung`,

  "SRO SAV/SNV": `SRO SAV/SNV (SRO des Schweizerischen Anwaltsverbandes und Notarenverbandes).
Mitgliederfokus: Anwälte und Notare, die als Finanzintermediäre tätig sind.
Spezifische Anforderungen:
- Berufsgeheimnisschutz (Art. 321 StGB) muss mit GwG-Pflichten koordiniert werden
- Besondere Regeln für anwaltliche Sorgfaltspflichten bei Finanztransaktionen
- Meldepflicht vs. Anwaltsgeheimnis: Klare Abgrenzung erforderlich
- Spezifische Dokumentationsanforderungen für juristische Mandate mit Finanzkomponente`,

  "SRO Treuhand Suisse": `SRO Treuhand Suisse.
Mitgliederfokus: Treuhandgesellschaften, Mitglieder von TREUHAND|SUISSE, EXPERTsuisse, veb und SVIT.
Spezifische Anforderungen:
- Treuhandspezifische Sorgfaltspflichten
- Besonderer Fokus auf Domizilgesellschaften und Sitzunternehmen
- Erweiterte Abklärungspflichten bei wirtschaftlicher Berechtigung
- Spezifische Risikokategorisierung für Treuhandmandate`,

  "SRO Leasingverband": `SRO Leasingverband.
Mitgliederfokus: Leasinggesellschaften (sektorspezifisch).
Spezifische Anforderungen:
- Branchenspezifische Schwellenwerte für Leasingverträge
- Vereinfachte Sorgfaltspflichten bei Standardleasing
- Erhöhte Sorgfalt bei grenzüberschreitendem Leasing
- Spezifische Regeln für Kfz-Leasing vs. Immobilienleasing`,

  "SRO SVV": `SRO SVV (SRO des Schweizerischen Versicherungsverbandes).
Mitgliederfokus: Versicherungsgesellschaften und Versicherungsvermittler.
Spezifische Anforderungen:
- Lebensversicherungsspezifische Sorgfaltspflichten (Art. 2 Abs. 1 lit. d GwG)
- Schwellenwert Einmalprämie CHF 25'000 / Jahresprämie CHF 5'000
- Besondere Identifikationspflichten bei Rückkauf und Abtretung
- Begünstigtenprüfung bei Lebensversicherungspolicen`,
};

/** Build a structured narrative from the raw company profile */
function buildCompanyNarrative(p: Record<string, unknown>): string {
  const get = (key: string): string => {
    const v = p[key];
    if (v === undefined || v === null || v === "") return "";
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "boolean") return v ? "Ja" : "Nein";
    return String(v);
  };

  const parts: string[] = [];

  // Identity
  const name = get("company_name");
  const form = get("legal_form");
  const uid = get("uid");
  const address = get("address");
  const year = get("founding_year");
  if (name) {
    let identity = `**${name}**`;
    if (form) identity += ` (${form})`;
    if (address) identity += `, mit Sitz in ${address}`;
    if (year) identity += `, gegründet ${year}`;
    if (uid) identity += ` (UID: ${uid})`;
    identity += ".";
    parts.push(identity);
  }

  // Business activity — this is the Zefix "Zweck" field, very valuable
  const detail = get("business_detail");
  if (detail) {
    parts.push(`**Geschäftstätigkeit:** ${detail}`);
  }
  const industry = get("industry");
  if (industry) {
    parts.push(`**Branche:** ${industry}`);
  }

  // Organisation
  const lines: string[] = [];
  const employees = get("employees");
  if (employees) lines.push(`${employees} Mitarbeitende`);
  const gl = get("geschaeftsleitung");
  if (gl) lines.push(`Geschäftsleitung: ${gl}`);
  const vr = get("verwaltungsrat");
  if (vr) lines.push(`Verwaltungsrat: ${vr}`);
  const co = get("compliance_officer");
  if (co) lines.push(`Compliance Officer: ${co}`);
  if (lines.length > 0) {
    parts.push(`**Organisation:** ${lines.join("; ")}.`);
  }

  // Regulation
  const regLines: string[] = [];
  const sro = get("sro");
  const sroStatus = get("sro_status");
  if (sro) regLines.push(`SRO: ${sro}${sroStatus ? ` (${sroStatus})` : ""}`);
  const finma = get("finma_license");
  if (finma && finma !== "Keine") regLines.push(`FINMA-Lizenz: ${finma}`);
  if (regLines.length > 0) {
    parts.push(`**Regulierung:** ${regLines.join("; ")}.`);
  }

  // Risk profile
  const riskLines: string[] = [];
  const txVol = get("tx_volume");
  if (txVol) riskLines.push(`Transaktionsvolumen: ${txVol}`);
  const clients = get("client_types");
  if (clients) riskLines.push(`Kundentypen: ${clients}`);
  const geo = get("geo_focus");
  if (geo) riskLines.push(`Geogr. Fokus: ${geo}`);
  const products = get("products");
  if (products) riskLines.push(`Produkte: ${products}`);
  const crypto = get("crypto");
  if (crypto === "Ja") riskLines.push("Crypto/DLT-Bezug: Ja");
  const crossBorder = get("cross_border");
  if (crossBorder === "Ja") riskLines.push("Grenzüberschreitende Tätigkeit: Ja");
  if (riskLines.length > 0) {
    parts.push(`**Risikoprofil:** ${riskLines.join("; ")}.`);
  }

  // Existing infrastructure
  const infra = get("existing_infra");
  if (infra && infra !== "Keine") {
    parts.push(`**Bestehende Compliance-Infrastruktur:** ${infra}.`);
  }

  return parts.join("\n\n");
}

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

    // Build the prompt — enriched with SRO context
    const sroName = companyProfile?.sro?.toString() || "";
    const sroContext = SRO_CONTEXT[sroName] || "";

    const systemPrompt = `Du bist ein erfahrener Schweizer AML-Compliance-Experte und Jurist, spezialisiert auf:
- Schweizer Geldwäschereigesetz (GwG/AMLA)
- FINMA-Verordnung über die Bekämpfung von Geldwäscherei (GwV-FINMA / AMLO-FINMA)
- SRO-Regularien (VQF, PolyReg, SO-FIT, ARIF, OAR-G, SRO SAV/SNV, SRO Treuhand Suisse, SRO Leasingverband, SRO SVV)
- Deutsche GwG-Anforderungen (BaFin)
- EU Anti-Money Laundering Directives (AMLD)

Du erstellst professionelle, regulierungskonforme Compliance-Dokumente auf Deutsch (Schweizer Standarddeutsch).

QUALITÄTSANFORDERUNGEN — ZWINGEND EINZUHALTEN:
1. **Firmenbezug:** Jedes Kapitel MUSS konkret auf die beschriebene Firma eingehen. Verwende den Firmennamen, die Branche, die Produkte und das Risikoprofil durchgehend im Text. Keine generischen Vorlagen — das Dokument muss massgeschneidert sein.
2. **Keine Halluzinationen:** Referenziere NUR Gesetzesartikel, die du sicher kennst. Erfinde KEINE Artikelnummern oder Gesetzestexte. Wenn du dir bei einer spezifischen Referenz unsicher bist, schreibe "vgl. [Gesetz]" ohne konkrete Artikelnummer statt eine falsche Nummer anzugeben.
3. **Korrekte Gesetzesreferenzen (Schweiz):**
   - GwG (Geldwäschereigesetz, SR 955.0): Art. 2 (Geltungsbereich), Art. 3 (Identifizierung), Art. 4 (Feststellung wB), Art. 5 (Erneute Identifizierung), Art. 6 (Besondere Sorgfaltspflichten), Art. 6a (PEP), Art. 7 (Dokumentationspflicht), Art. 8 (Organisatorische Massnahmen), Art. 9 (Meldepflicht MROS), Art. 10 (Vermögenssperre), Art. 11 (Strafbestimmungen)
   - GwV-FINMA / AMLO-FINMA (SR 955.033.0): Art. 13 (Erhöhte Risiken), Art. 14 (Transaktionsüberwachung), Art. 15 (Verstärkte Sorgfaltspflichten), Art. 19-20 (Monitoring), Art. 24 (Compliance-Stelle), Art. 25 (Risikoanalyse), Art. 26 (Ausbildung)
   - VSB/CDB 20 (Standesregeln zur Sorgfaltspflicht der Banken)
4. **Keine Platzhalter:** Verwende keine Platzhalter wie "[Firmenname]", "[Datum]", "[Name]" etc. Verwende stattdessen die konkreten Angaben aus dem Firmenprofil. Nur wo tatsächlich individuelle Eingaben nötig sind (Unterschrift, Datum des Inkrafttretens), verwende ausfüllbare Felder mit _____.
5. **Praxisorientiert:** Jede Regel muss umsetzbar formuliert sein. Beschreibe konkrete Prozesse, Verantwortlichkeiten und Fristen statt abstrakter Grundsätze.
${sroContext ? `\nSRO-SPEZIFISCHER KONTEXT FÜR DIESES DOKUMENT:\n${sroContext}\n\nBerücksichtige die spezifischen Anforderungen dieser SRO im gesamten Dokument. Wenn die SRO besondere Reglemente, Schwellenwerte oder Prüfanforderungen hat, integriere diese konkret in die relevanten Kapitel.\n` : ""}
FORMATIERUNGSREGELN:
- Verwende Standard-Markdown: # ## ### für Überschriften, - für Listen, **fett** für Hervorhebungen
- Verwende \`---\` für horizontale Trennlinien (NICHT %%%%% oder ===== oder andere Sonderzeichen)
- Verwende \`- [ ] Text\` für Checkboxen zum Ankreuzen (NICHT & Text oder andere Sonderzeichen)
- Verwende \`_____\` (5+ Underscores) für ausfüllbare Formularfelder, z.B. "Datum: _____________________"
- Verwende KEINE Sonderzeichen wie &, %, § als Aufzählungszeichen oder Dekoration
- Halte das Format schlicht, druckfreundlich und professionell
- Formatiere das Dokument in Markdown mit klarer Kapitelstruktur
- Verwende Blockquotes (>) für wichtige Hinweise:
  > **Wichtig:** für zentrale Compliance-Hinweise
  > **Achtung:** für Warnungen und Risiken
  > **Rechtsgrundlage:** für Gesetzesreferenzen
- Beginne das Dokument mit einer kurzen Zusammenfassung (3-4 Sätze), die den Firmennamen und die Branche nennt
- Verwende Tabellen wo sinnvoll (Risikokategorien, Schwellenwerte, Zuständigkeiten)
- Nummeriere Hauptkapitel (1. Einleitung, 2. Geltungsbereich, ...)`;

    // Build narrative company summary instead of raw key-value pairs
    const profileNarrative = buildCompanyNarrative(companyProfile as Record<string, unknown>);

    // Build wizard answers with human-readable labels
    const answersSummary = answers
      ? Object.entries(answers)
          .filter(([k, v]) => v !== undefined && v !== "" && v !== null && !k.startsWith("__"))
          .map(([k, v]) => {
            const label = FIELD_LABELS[k] || k;
            const val = Array.isArray(v) ? v.join(", ") : (typeof v === "boolean" ? (v ? "Ja" : "Nein") : v);
            return `- ${label}: ${val}`;
          })
          .join("\n")
      : "Keine zusätzlichen Angaben.";

    const jurisdictionMap: Record<string, string> = {
      CH: "Schweiz — Anwendbare Gesetze: GwG (SR 955.0), GwV-FINMA (SR 955.033.0), VSB/CDB 20, FINMA-Aufsichtsmitteilungen, SRO-Reglemente",
      DE: "Deutschland — Anwendbare Gesetze: GwG (deutsches Geldwäschegesetz), BaFin-Auslegungshinweise",
      EU: "Europäische Union — Anwendbare Gesetze: AMLD 4/5/6, EU-AMLA-Verordnung 2024",
    };

    // Extract custom prompt from answers (prefixed with __ to separate from doc-specific fields)
    const customPrompt = answers?.__customPrompt?.toString().trim() || "";

    const docReadableName = DOC_NAMES[docType] || docType;

    const userPrompt = `Erstelle ein vollständiges Dokument "${docReadableName}" für folgende Firma:

## Firmenprofil
${profileNarrative}

## Rechtsrahmen / Jurisdiktion
${jurisdictionMap[jurisdiction] || jurisdiction}

## Dokumentspezifische Angaben
${answersSummary}

## Auftrag
Erstelle das Dokument "${docReadableName}" mit allen relevanten Kapiteln. Beachte dabei:
- Verwende den Firmennamen "${companyProfile?.company_name || "die Firma"}" durchgehend im Text
- Passe alle Regelungen konkret auf die Branche, Produkte und das Risikoprofil der Firma an
- Referenziere nur Gesetzesartikel, deren Inhalt du sicher kennst
- Das Dokument soll sofort verwendbar sein und den aktuellen regulatorischen Stand widerspiegeln${
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
          max_tokens: 16000,
          temperature: 0,
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

    // Post-generation quality validation
    const warnings: string[] = [];

    // Check for placeholder text that should have been replaced
    const placeholderPatterns = /\[(Firmenname|Name|Datum|Unternehmen|Firma|Organisation|SRO|Stadt|Adresse|Compliance Officer)\]/gi;
    const placeholderMatches = generatedContent.match(placeholderPatterns);
    if (placeholderMatches && placeholderMatches.length > 2) {
      warnings.push(`${placeholderMatches.length} Platzhalter gefunden — Dokument enthält möglicherweise generische Inhalte`);
    }

    // Check minimum content length (a proper compliance doc should be substantial)
    const wordCount = generatedContent.split(/\s+/).length;
    if (wordCount < 500) {
      warnings.push(`Dokument ist mit ${wordCount} Wörtern möglicherweise zu kurz für ein vollständiges Compliance-Dokument`);
    }

    // Check that the company name appears in the document (personalization check)
    const companyName = companyProfile?.company_name?.toString() || "";
    if (companyName && !generatedContent.includes(companyName)) {
      warnings.push("Firmenname kommt im Dokument nicht vor — möglicherweise zu generisch");
    }

    // Check for chapter headings (document should have structure)
    const headingCount = (generatedContent.match(/^#{1,3}\s+/gm) || []).length;
    if (headingCount < 3) {
      warnings.push(`Nur ${headingCount} Kapitelüberschriften — Dokument könnte unvollständig sein`);
    }

    if (warnings.length > 0) {
      console.warn(`[generate-document] Quality warnings for ${docType}:`, warnings);
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
        ...(warnings.length > 0 ? { warnings } : {}),
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
