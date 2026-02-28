// supabase/functions/notify-alert/index.ts
// =============================================================================
// Sends personalized email notifications to affected clients when an admin
// publishes (freigeben) a regulatory alert.
//
// Trigger: Called from the frontend when admin clicks "Freigeben & Veroeffentlichen"
// Expects: { alert_id: string }
//
// Tracks all email sends in alert_notification_log and updates
// alert_affected_clients.notified_at + notification_status.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("VC_FROM_EMAIL") || "Virtue Compliance <alerts@virtue-compliance.ch>";
const PORTAL_URL = Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

interface AffectedClient {
  id: string;
  organization_id: string;
  reason: string | null;
  risk: string;
  elena_comment: string | null;
  organizations: { name: string } | null;
}

interface AlertData {
  id: string;
  title: string;
  source: string | null;
  severity: string;
  category: string | null;
  summary: string | null;
  legal_basis: string | null;
  deadline: string | null;
  source_url: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return corsResponse(req);

  const corsHeaders = getCorsHeaders(req);

  function jsonResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { alert_id } = await req.json();
    if (!alert_id) {
      return jsonResponse({ error: "alert_id is required" }, 400);
    }

    // Load the alert
    const { data: alert, error: alertErr } = await supabase
      .from("regulatory_alerts")
      .select("id, title, source, severity, category, summary, legal_basis, deadline, source_url")
      .eq("id", alert_id)
      .single();

    if (alertErr || !alert) {
      return jsonResponse({ error: "Alert not found" }, 404);
    }

    // Load affected clients with organization names
    const { data: affectedClients, error: clientErr } = await supabase
      .from("alert_affected_clients")
      .select("id, organization_id, reason, risk, elena_comment, organizations(name)")
      .eq("alert_id", alert_id);

    if (clientErr) throw clientErr;
    if (!affectedClients || affectedClients.length === 0) {
      return jsonResponse({ sent: 0, message: "No affected clients" });
    }

    let sentCount = 0;
    const errors: string[] = [];

    // For each affected organization, find its members and send emails
    for (const client of affectedClients as unknown as AffectedClient[]) {
      const orgName = escapeHtml(client.organizations?.name ?? "Ihr Unternehmen");

      // Get all members of this organization
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", client.organization_id);

      if (!members || members.length === 0) continue;

      // Get email addresses from auth.users via profiles
      const userIds = members.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      let orgSentCount = 0;
      let orgFailCount = 0;

      // Batch-fetch emails (avoid N+1 getUserById)
      const emailMap = new Map<string, string>();
      await Promise.all((profiles ?? []).map(async (profile: { id: string }) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        if (authUser?.user?.email) emailMap.set(profile.id, authUser.user.email);
      }));

      for (const profile of profiles ?? []) {
        const email = emailMap.get(profile.id);
        if (!email) continue;

        try {
          await sendEmail({
            to: email,
            subject: `Regulatorische Meldung: ${(alert as AlertData).title}`,  // Subject is plain text, no HTML escaping needed
            html: buildAlertEmail(
              alert as AlertData,
              client,
              orgName,
              escapeHtml(profile.full_name || "Sehr geehrte Damen und Herren"),
            ),
          });
          orgSentCount++;
          sentCount++;

          // Log successful send
          await supabase.from("alert_notification_log").insert({
            alert_id: alert_id,
            organization_id: client.organization_id,
            recipient_email: email,
            recipient_name: profile.full_name || null,
            status: "sent",
          });
        } catch (emailErr) {
          orgFailCount++;
          const errMsg = String(emailErr);
          errors.push(`${email}: ${errMsg}`);

          // Log failed send
          await supabase.from("alert_notification_log").insert({
            alert_id: alert_id,
            organization_id: client.organization_id,
            recipient_email: email,
            recipient_name: profile.full_name || null,
            status: "failed",
            error_message: errMsg,
          });
        }
      }

      // Create in-app notifications for all org members
      for (const profile of profiles ?? []) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          type: "new_alert",
          title: "Neue regulatorische Meldung",
          body: (alert as AlertData).title,
          link: "/app/portal#alerts",
        }).catch(() => { /* ignore notification insert errors */ });
      }

      // Update affected client's notification status
      const status = orgFailCount === 0 && orgSentCount > 0
        ? "sent"
        : orgSentCount > 0 && orgFailCount > 0
          ? "partial"
          : orgFailCount > 0
            ? "failed"
            : null;

      if (status) {
        await supabase
          .from("alert_affected_clients")
          .update({
            notified_at: new Date().toISOString(),
            notification_status: status,
          })
          .eq("id", client.id);
      }
    }

    return jsonResponse({ sent: sentCount, errors: errors.length });
  } catch (err) {
    console.error("notify-alert error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// ── Send Email via Resend ────────────────────────────────────────────────────

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

// ── HTML Email Template ──────────────────────────────────────────────────────

function buildAlertEmail(
  alert: AlertData,
  client: AffectedClient,
  orgName: string,
  recipientName: string,
): string {
  const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: "Kritisch", color: "#dc2626", bg: "#fef2f2" },
    high: { label: "Hoch", color: "#d97706", bg: "#fffbeb" },
    medium: { label: "Mittel", color: "#16654e", bg: "#f0fdf4" },
    info: { label: "Info", color: "#6b7280", bg: "#f9fafb" },
  };

  const sev = severityConfig[alert.severity] || severityConfig.info;

  const riskConfig: Record<string, { label: string; color: string }> = {
    high: { label: "Hoch", color: "#dc2626" },
    medium: { label: "Mittel", color: "#d97706" },
    low: { label: "Niedrig", color: "#16654e" },
  };

  const risk = riskConfig[client.risk] || riskConfig.medium;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:700;color:#0f3d2e;letter-spacing:-0.5px;">
        Virtue Compliance
      </div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">
        Regulatorische Meldung
      </div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <!-- Severity Badge -->
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:${sev.bg};color:${sev.color};border:1px solid ${sev.color}20;">
          ${sev.label}
        </span>
        ${alert.category ? `<span style="display:inline-block;font-size:12px;padding:4px 12px;border-radius:20px;background:#f3f4f6;color:#374151;margin-left:8px;">${escapeHtml(alert.category)}</span>` : ""}
      </div>

      <!-- Title -->
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">
        ${escapeHtml(alert.title)}
      </h1>

      <!-- Greeting -->
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Guten Tag ${recipientName},
      </p>

      <!-- Summary -->
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
        ${escapeHtml(alert.summary || "")}
      </p>

      <!-- Client-specific impact -->
      <div style="background:${risk.color}08;border:1px solid ${risk.color}20;border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;color:${risk.color};margin-bottom:8px;">
          Auswirkung auf ${orgName}: ${risk.label}
        </div>
        ${client.reason ? `<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">${escapeHtml(client.reason)}</p>` : ""}
        ${client.elena_comment ? `
        <div style="background:#0f3d2e0a;border-radius:6px;padding:14px;margin-top:12px;">
          <div style="font-size:12px;font-weight:600;color:#0f3d2e;margin-bottom:6px;">Empfehlung von Virtue Compliance:</div>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">${escapeHtml(client.elena_comment!)}</p>
        </div>` : ""}
      </div>

      ${alert.legal_basis ? `
      <div style="font-size:13px;color:#6b7280;padding:12px;background:#f9fafb;border-radius:6px;margin-bottom:16px;">
        <strong>Rechtsgrundlage:</strong> ${escapeHtml(alert.legal_basis!)}
        ${alert.deadline ? ` &middot; <strong>Frist:</strong> ${escapeHtml(alert.deadline)}` : ""}
      </div>` : ""}

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;">
        <a href="${PORTAL_URL}/app/portal#alerts"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Im Portal ansehen
        </a>
      </div>

      ${alert.source_url ? `
      <div style="text-align:center;margin-top:12px;">
        <a href="${alert.source_url}" style="font-size:13px;color:#6b7280;text-decoration:underline;">Originalquelle ansehen</a>
      </div>` : ""}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#9ca3af;font-size:12px;line-height:1.5;">
      <p style="margin:0;">Virtue Compliance GmbH &middot; Uznach, Schweiz</p>
      <p style="margin:4px 0 0;">
        <a href="https://www.virtue-compliance.ch" style="color:#0f3d2e;text-decoration:none;">www.virtue-compliance.ch</a>
      </p>
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

