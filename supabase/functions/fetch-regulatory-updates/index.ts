// supabase/functions/fetch-regulatory-updates/index.ts
// =============================================================================
// Daily cron-triggered Edge Function that:
// 1. Fetches RSS/Atom feeds from configured regulatory sources
// 2. Deduplicates entries against feed_entries table
// 3. Sends new entries to Claude AI for analysis & client matching
// 4. Creates draft regulatory_alerts with AI-prepared fields
//
// Trigger: Supabase Cron (pg_cron) — 1x daily
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseFeed, type FeedEntry } from "../_shared/rss-parser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

interface Source {
  id: string;
  name: string;
  region: string;
  feed_url: string;
  feed_type: "rss" | "atom" | "html";
}

interface OrgProfile {
  id: string;
  name: string;
  industry: string | null;
  sro: string | null;
  profile_data: Record<string, unknown> | null;
}

interface AiAlertAnalysis {
  severity: "critical" | "high" | "medium" | "info";
  category: string;
  legal_basis: string;
  summary: string;
  admin_comment: string;
  jurisdiction: string;
  affected_clients: {
    organization_id: string;
    risk: "high" | "medium" | "low";
    reason: string;
    client_comment: string;
  }[];
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load active regulatory sources
    const { data: sources, error: srcErr } = await supabase
      .from("regulatory_sources")
      .select("id, name, region, feed_url, feed_type")
      .eq("active", true);

    if (srcErr) throw srcErr;
    if (!sources || sources.length === 0) {
      return jsonResponse({ message: "No active sources configured", fetched: 0, new_entries: 0, alerts_created: 0 });
    }

    // 2. Load all organizations with their profiles (for AI matching)
    const orgs = await loadOrganizations(supabase);

    let totalFetched = 0;
    let totalNew = 0;
    let totalAlerts = 0;

    // 3. Process each source
    for (const source of sources as Source[]) {
      try {
        const entries = await parseFeed(source.feed_url, source.feed_type);
        totalFetched += entries.length;

        // Filter to new entries only (not yet in feed_entries)
        const newEntries = await filterNewEntries(supabase, source.id, entries);
        totalNew += newEntries.length;

        // Insert new entries into feed_entries
        for (const entry of newEntries) {
          const { data: feedEntry, error: insertErr } = await supabase
            .from("feed_entries")
            .insert({
              source_id: source.id,
              guid: entry.guid,
              title: entry.title,
              summary: entry.summary,
              link: entry.link,
              published_at: entry.publishedAt,
            })
            .select("id")
            .single();

          if (insertErr) {
            console.error(`Failed to insert feed entry "${entry.title}":`, insertErr);
            continue;
          }

          // 4. AI Analysis via Claude
          try {
            const analysis = await analyzeWithClaude(entry, source, orgs);

            if (!analysis) continue;

            // 5. Create draft alert
            const { data: alert, error: alertErr } = await supabase
              .from("regulatory_alerts")
              .insert({
                title: entry.title,
                source: source.name,
                jurisdiction: analysis.jurisdiction,
                date: entry.publishedAt
                  ? new Date(entry.publishedAt).toLocaleDateString("de-CH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : new Date().toLocaleDateString("de-CH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                severity: analysis.severity,
                status: "draft",
                category: analysis.category,
                summary: analysis.summary,
                legal_basis: analysis.legal_basis,
                elena_comment: analysis.admin_comment,
                feed_entry_id: feedEntry.id,
                auto_summary: analysis.summary,
                ai_legal_basis: analysis.legal_basis,
                ai_severity: analysis.severity,
                ai_category: analysis.category,
                ai_comment: analysis.admin_comment,
                source_url: entry.link,
              })
              .select("id")
              .single();

            if (alertErr) {
              console.error(`Failed to create alert for "${entry.title}":`, alertErr);
              continue;
            }

            // Link feed entry to alert
            await supabase
              .from("feed_entries")
              .update({ alert_id: alert.id })
              .eq("id", feedEntry.id);

            // 6. Create affected client entries
            if (analysis.affected_clients.length > 0) {
              const clientEntries = analysis.affected_clients.map((c) => ({
                alert_id: alert.id,
                organization_id: c.organization_id,
                reason: c.reason,
                risk: c.risk,
                elena_comment: c.client_comment,
                ai_risk: c.risk,
                ai_reason: c.reason,
                ai_elena_comment: c.client_comment,
              }));

              const { error: clientErr } = await supabase
                .from("alert_affected_clients")
                .insert(clientEntries);

              if (clientErr) {
                console.error(`Failed to insert affected clients for "${entry.title}":`, clientErr);
              }
            }

            totalAlerts++;
          } catch (aiErr) {
            console.error(`AI analysis failed for "${entry.title}":`, aiErr);
          }
        }

        // Update last_fetched_at
        await supabase
          .from("regulatory_sources")
          .update({ last_fetched_at: new Date().toISOString() })
          .eq("id", source.id);
      } catch (feedErr) {
        console.error(`Failed to process source "${source.name}":`, feedErr);
      }
    }

    return jsonResponse({
      fetched: totalFetched,
      new_entries: totalNew,
      alerts_created: totalAlerts,
    });
  } catch (err) {
    console.error("fetch-regulatory-updates error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadOrganizations(supabase: ReturnType<typeof createClient>): Promise<OrgProfile[]> {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, industry, sro");

  if (error) throw error;

  // Also load company_profiles for richer context
  const { data: profiles } = await supabase
    .from("company_profiles")
    .select("organization_id, data");

  const profileMap = new Map<string, Record<string, unknown>>();
  for (const p of profiles ?? []) {
    profileMap.set(p.organization_id, p.data);
  }

  return (orgs ?? []).map((o: { id: string; name: string; industry: string | null; sro: string | null }) => ({
    id: o.id,
    name: o.name,
    industry: o.industry,
    sro: o.sro,
    profile_data: profileMap.get(o.id) ?? null,
  }));
}

async function filterNewEntries(
  supabase: ReturnType<typeof createClient>,
  sourceId: string,
  entries: FeedEntry[],
): Promise<FeedEntry[]> {
  if (entries.length === 0) return [];

  const guids = entries.map((e) => e.guid);

  const { data: existing } = await supabase
    .from("feed_entries")
    .select("guid")
    .eq("source_id", sourceId)
    .in("guid", guids);

  const existingGuids = new Set((existing ?? []).map((e: { guid: string }) => e.guid));
  return entries.filter((e) => !existingGuids.has(e.guid));
}

async function analyzeWithClaude(
  entry: FeedEntry,
  source: Source,
  orgs: OrgProfile[],
): Promise<AiAlertAnalysis | null> {
  const orgDescriptions = orgs
    .map((o) => {
      const parts = [`- ${o.name}`];
      if (o.industry) parts.push(`Branche: ${o.industry}`);
      if (o.sro) parts.push(`SRO: ${o.sro}`);
      if (o.profile_data) {
        const pd = o.profile_data;
        if (pd.jurisdiction) parts.push(`Jurisdiktion: ${pd.jurisdiction}`);
        if (pd.businessFields) parts.push(`Geschaeftsfelder: ${pd.businessFields}`);
        if (pd.services) parts.push(`Dienstleistungen: ${pd.services}`);
      }
      return parts.join(" | ");
    })
    .join("\n");

  const orgIds = orgs.map((o) => `"${o.id}": "${o.name}"`).join(", ");

  const systemPrompt = `Du bist ein Schweizer AML/Compliance-Experte bei Virtue Compliance GmbH (Uznach, Schweiz).
Virtue Compliance bietet AML Compliance, KYC/KYB und regulatorische Betreuung fuer Finanzintermediaere (Schweiz & EU).

Analysiere die folgende regulatorische Aenderung und bewerte sie strukturiert.

Unsere Kunden:
${orgDescriptions}

Kunden-IDs: {${orgIds}}

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt (kein Markdown, keine Erklaerung), mit folgendem Schema:
{
  "severity": "critical" | "high" | "medium" | "info",
  "category": "z.B. GwG / AMLA, FATCA, KYC / CDD, Krypto / DLT, Sanktionen, Risiko-Framework",
  "legal_basis": "Relevante Rechtsgrundlagen, z.B. Art. 3 GwG, AMLO-FINMA Art. 20",
  "summary": "Praegnante Zusammenfassung auf Deutsch (2-4 Saetze)",
  "admin_comment": "Proaktiver Kommentar mit Handlungsempfehlung fuer den Admin (Elena-Stil, auf Deutsch)",
  "jurisdiction": "CH oder EU oder US oder INT",
  "affected_clients": [
    {
      "organization_id": "uuid des Kunden",
      "risk": "high" | "medium" | "low",
      "reason": "Warum dieser Kunde betroffen ist (Deutsch)",
      "client_comment": "Personalisierter Hinweis fuer diesen Kunden (Deutsch, Elena-Stil)"
    }
  ]
}

Regeln:
- Nur Kunden als betroffen markieren, die wirklich relevant betroffen sind
- "severity" basiert auf: Auswirkung auf beaufsichtigte Finanzintermediaere, Fristen, Sanktionsrisiko
- "admin_comment" soll konkrete naechste Schritte enthalten
- "client_comment" soll personalisiert und handlungsorientiert sein
- Bei reinen Informationsmeldungen ohne Kundenauswirkung: affected_clients = []`;

  const userMessage = `Quelle: ${source.name} (${source.region})
Titel: ${entry.title}
Link: ${entry.link}
Veroeffentlicht: ${entry.publishedAt || "unbekannt"}

Inhalt/Zusammenfassung:
${entry.summary || "(kein Inhalt verfuegbar)"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text;
  if (!text) return null;

  try {
    // Parse JSON — Claude may wrap in code fences, strip them
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis: AiAlertAnalysis = JSON.parse(cleaned);

    // Validate organization_ids
    const validOrgIds = new Set(orgs.map((o) => o.id));
    analysis.affected_clients = analysis.affected_clients.filter(
      (c) => validOrgIds.has(c.organization_id),
    );

    return analysis;
  } catch (parseErr) {
    console.error("Failed to parse Claude response:", parseErr, "\nRaw:", text);
    return null;
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
