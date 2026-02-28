// supabase/functions/check-action-reminders/index.ts
// =============================================================================
// Cron-triggered function that sends due-date reminders for client actions.
// Runs daily at 08:00 CET.
//
// Trigger points:
//   - 7 days before due_date → reminder_sent_7d
//   - On the day of due_date → reminder_sent_0d
//   - 1 day after due_date (overdue) → reminder_sent_overdue
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("VC_FROM_EMAIL") || "Virtue Compliance <alerts@virtue-compliance.ch>";
const PORTAL_URL = Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  const corsHeaders = getCorsHeaders(req);

  function jsonResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // Load all open actions with due_date
  const { data: actions, error } = await supabase
    .from("client_alert_actions")
    .select(`
      id, text, due, due_date, status,
      reminder_sent_7d, reminder_sent_0d, reminder_sent_overdue,
      alert_affected_clients!inner(
        organization_id,
        organizations(name),
        regulatory_alerts(title)
      )
    `)
    .neq("status", "erledigt")
    .not("due_date", "is", null);

  if (error) {
    console.error("Failed to load actions:", error);
    return jsonResponse({ error: String(error) }, 500);
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const action of actions ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = action as any;
    const dueDate = a.due_date;
    const orgId = a.alert_affected_clients?.organization_id;
    const orgName = a.alert_affected_clients?.organizations?.name ?? "Ihr Unternehmen";
    const alertTitle = a.alert_affected_clients?.regulatory_alerts?.title ?? "Regulatorische Meldung";

    // Determine which reminder to send
    let reminderType: "7d" | "0d" | "overdue" | null = null;
    let subject = "";
    let urgencyLabel = "";
    let urgencyColor = "";

    if (dueDate === in7Days && !a.reminder_sent_7d) {
      reminderType = "7d";
      subject = `Erinnerung: Massnahme fällig in 7 Tagen`;
      urgencyLabel = "Fällig in 7 Tagen";
      urgencyColor = "#d97706";
    } else if (dueDate === today && !a.reminder_sent_0d) {
      reminderType = "0d";
      subject = `Heute fällig: Massnahme erfordert Handlung`;
      urgencyLabel = "Heute fällig";
      urgencyColor = "#dc2626";
    } else if (dueDate < today && !a.reminder_sent_overdue) {
      reminderType = "overdue";
      subject = `Überfällig: Massnahme erfordert sofortige Handlung`;
      urgencyLabel = "Überfällig";
      urgencyColor = "#dc2626";
    }

    if (!reminderType || !orgId) continue;

    // Get org members
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId);

    if (!members || members.length === 0) continue;

    const userIds = members.map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

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
          subject,
          html: buildReminderEmail({
            recipientName: profile.full_name || "Sehr geehrte Damen und Herren",
            actionText: a.text,
            dueDate: a.due || dueDate,
            alertTitle,
            orgName,
            urgencyLabel,
            urgencyColor,
          }),
        });
        sentCount++;
      } catch (err) {
        errors.push(`${email}: ${String(err)}`);
      }
    }

    // Set the reminder flag
    const flagUpdate: Record<string, boolean> = {};
    if (reminderType === "7d") flagUpdate.reminder_sent_7d = true;
    if (reminderType === "0d") flagUpdate.reminder_sent_0d = true;
    if (reminderType === "overdue") flagUpdate.reminder_sent_overdue = true;

    await supabase
      .from("client_alert_actions")
      .update(flagUpdate)
      .eq("id", a.id);
  }

  return jsonResponse({ sent: sentCount, errors: errors.length });
});

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

function buildReminderEmail(opts: {
  recipientName: string;
  actionText: string;
  dueDate: string;
  alertTitle: string;
  orgName: string;
  urgencyLabel: string;
  urgencyColor: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:700;color:#0f3d2e;letter-spacing:-0.5px;">Virtue Compliance</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Fälligkeits-Erinnerung</div>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:${opts.urgencyColor}15;color:${opts.urgencyColor};border:1px solid ${opts.urgencyColor}30;">
          ${opts.urgencyLabel}
        </span>
      </div>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Guten Tag ${escapeHtml(opts.recipientName)},
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Eine Massnahme im Zusammenhang mit der regulatorischen Meldung
        <strong>${escapeHtml(opts.alertTitle)}</strong> erfordert Ihre Aufmerksamkeit.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">Massnahme:</div>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">${escapeHtml(opts.actionText)}</p>
        <div style="font-size:13px;color:${opts.urgencyColor};font-weight:600;">
          Frist: ${opts.dueDate}
        </div>
      </div>
      <div style="text-align:center;">
        <a href="${PORTAL_URL}/app/portal#alerts"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Im Portal ansehen
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">Virtue Compliance GmbH &middot; Uznach, Schweiz</p>
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

