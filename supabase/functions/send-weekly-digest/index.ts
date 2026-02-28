// supabase/functions/send-weekly-digest/index.ts
// =============================================================================
// Cron: Monday 07:00 UTC (08:00 CET) — Weekly compliance digest email
// Sends each org a summary of: open actions, new alerts, upcoming deadlines
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("VC_FROM_EMAIL") || "Virtue Compliance <info@virtue-compliance.ch>";
const PORTAL_URL = Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Load all orgs that haven't opted out
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, contact_name, contact_email, digest_opt_out")
      .or("digest_opt_out.is.null,digest_opt_out.eq.false");

    if (orgErr) throw orgErr;
    if (!orgs || orgs.length === 0) {
      return jsonResponse({ message: "No organizations to digest.", sent: 0 });
    }

    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
    const in14d = new Date(now.getTime() + 14 * 86400000).toISOString().split("T")[0];
    let totalSent = 0;

    for (const org of orgs) {
      // Gather stats for this org
      const [actionsRes, alertsRes, docsRes, messagesRes] = await Promise.all([
        // Open client actions
        supabase
          .from("client_alert_actions")
          .select("id, text, due, status, alert_affected_clients!inner(organization_id)")
          .eq("alert_affected_clients.organization_id", org.id)
          .eq("status", "offen"),
        // New alerts since last week
        supabase
          .from("alert_affected_clients")
          .select("id, regulatory_alerts!inner(title, severity, created_at, status)")
          .eq("organization_id", org.id)
          .gte("regulatory_alerts.created_at", lastWeek)
          .neq("regulatory_alerts.status", "draft")
          .neq("regulatory_alerts.status", "dismissed"),
        // Expiring documents (next 14 days)
        supabase
          .from("documents")
          .select("id, name, next_review")
          .eq("organization_id", org.id)
          .eq("status", "current")
          .not("next_review", "is", null)
          .lte("next_review", in14d),
        // New messages since last week
        supabase
          .from("admin_messages")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("created_at", lastWeek),
      ]);

      // deno-lint-ignore no-explicit-any
      const openActions = (actionsRes.data ?? []) as any[];
      // deno-lint-ignore no-explicit-any
      const newAlerts = (alertsRes.data ?? []) as any[];
      const expiringDocs = (docsRes.data ?? []) as { id: string; name: string; next_review: string }[];
      const newMessageCount = messagesRes.count ?? 0;

      // Skip if nothing to report
      if (openActions.length === 0 && newAlerts.length === 0 && expiringDocs.length === 0 && newMessageCount === 0) {
        continue;
      }

      // Get org members' emails
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, profiles(full_name)")
        .eq("organization_id", org.id);

      if (!members || members.length === 0) continue;

      for (const member of members) {
        const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);
        const email = authUser?.user?.email;
        if (!email || !RESEND_API_KEY) continue;

        // deno-lint-ignore no-explicit-any
        const memberName = (member as any).profiles?.full_name || org.contact_name || "Sehr geehrte Damen und Herren";

        const html = buildDigestEmail({
          recipientName: memberName,
          orgName: org.name,
          openActions,
          newAlerts,
          expiringDocs,
          newMessageCount,
        });

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [email],
              subject: `Wöchentlicher Compliance-Digest — ${org.name}`,
              html,
            }),
          });

          if (res.ok) totalSent++;
        } catch (err) {
          console.error(`Digest email failed for ${email}:`, err);
        }
      }

      // Update last_digest_sent
      await supabase
        .from("organizations")
        .update({ last_digest_sent: now.toISOString() })
        .eq("id", org.id);
    }

    return jsonResponse({ sent: totalSent, orgs: orgs.length });
  } catch (err) {
    console.error("send-weekly-digest error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

interface DigestData {
  recipientName: string;
  orgName: string;
  // deno-lint-ignore no-explicit-any
  openActions: any[];
  // deno-lint-ignore no-explicit-any
  newAlerts: any[];
  expiringDocs: { id: string; name: string; next_review: string }[];
  newMessageCount: number;
}

function buildDigestEmail(data: DigestData): string {
  const { recipientName, orgName, openActions, newAlerts, expiringDocs, newMessageCount } = data;

  // Top 3 urgent actions
  const urgentActions = openActions
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 3);

  let actionsHtml = "";
  if (openActions.length > 0) {
    actionsHtml = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">Offene Massnahmen (${openActions.length})</h2>
        ${urgentActions.map((a) => `
          <div style="padding:8px 12px;background:#fffbeb;border-radius:6px;margin-bottom:6px;font-size:14px;color:#92400e;">
            ${escapeHtml(a.text)}${a.due ? ` — Frist: ${a.due}` : ""}
          </div>
        `).join("")}
        ${openActions.length > 3 ? `<div style="font-size:13px;color:#6b7280;">+ ${openActions.length - 3} weitere</div>` : ""}
      </div>
    `;
  }

  let alertsHtml = "";
  if (newAlerts.length > 0) {
    alertsHtml = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">Neue Meldungen (${newAlerts.length})</h2>
        ${newAlerts.slice(0, 3).map((a) => `
          <div style="padding:8px 12px;background:#eff6ff;border-radius:6px;margin-bottom:6px;font-size:14px;color:#1e40af;">
            ${escapeHtml(a.regulatory_alerts?.title ?? "Meldung")}
          </div>
        `).join("")}
      </div>
    `;
  }

  let docsHtml = "";
  if (expiringDocs.length > 0) {
    docsHtml = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">Anstehende Fristen</h2>
        ${expiringDocs.map((d) => {
          const date = new Date(d.next_review).toLocaleDateString("de-CH");
          return `
            <div style="padding:8px 12px;background:#fef2f2;border-radius:6px;margin-bottom:6px;font-size:14px;color:#991b1b;">
              ${escapeHtml(d.name)} — Ablauf: ${date}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  let messagesHtml = "";
  if (newMessageCount > 0) {
    messagesHtml = `
      <div style="margin-bottom:24px;">
        <div style="padding:8px 12px;background:#ecf5f1;border-radius:6px;font-size:14px;color:#16654e;">
          ${newMessageCount} neue Nachricht${newMessageCount !== 1 ? "en" : ""} von Virtue Compliance
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:700;color:#0f3d2e;letter-spacing:-0.5px;">Virtue Compliance</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Wöchentlicher Compliance-Digest</div>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">Guten Tag ${escapeHtml(recipientName)},</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">hier ist Ihr wöchentlicher Compliance-Überblick für <strong>${escapeHtml(orgName)}</strong>:</p>
      ${actionsHtml}
      ${alertsHtml}
      ${docsHtml}
      ${messagesHtml}
      <div style="text-align:center;margin-top:32px;">
        <a href="${PORTAL_URL}/app/portal"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Zum Portal
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;color:#9ca3af;font-size:12px;line-height:1.5;">
      <p style="margin:0;">Virtue Compliance GmbH &middot; Uznach, Schweiz</p>
      <p style="margin:4px 0 0;"><a href="https://www.virtue-compliance.ch" style="color:#0f3d2e;text-decoration:none;">www.virtue-compliance.ch</a></p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
