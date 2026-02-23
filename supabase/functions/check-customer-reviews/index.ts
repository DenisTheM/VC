// supabase/functions/check-customer-reviews/index.ts
// =============================================================================
// Cron-triggered function that sends review reminders for client customers.
// Runs daily at 07:00 UTC (08:00 CET).
//
// Trigger points:
//   - 30 days before next_review → reminder_sent_30d
//   - 7 days before next_review → reminder_sent_7d
//   - On/after next_review (overdue) → reminder_sent_overdue
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("VC_FROM_EMAIL") || "Virtue Compliance <alerts@virtue-compliance.ch>";
const PORTAL_URL = Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // Load all active customers with next_review set
  const { data: customers, error } = await supabase
    .from("client_customers")
    .select(`
      id, customer_type, first_name, last_name, company_name,
      next_review, organization_id,
      reminder_sent_30d, reminder_sent_7d, reminder_sent_overdue,
      organizations(name)
    `)
    .eq("status", "active")
    .not("next_review", "is", null);

  if (error) {
    console.error("Failed to load customers:", error);
    return jsonResponse({ error: String(error) }, 500);
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const customer of customers ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = customer as any;
    const reviewDate = c.next_review;
    const orgId = c.organization_id;
    const orgName = c.organizations?.name ?? "Ihr Unternehmen";
    const customerName = c.customer_type === "natural_person"
      ? [c.first_name, c.last_name].filter(Boolean).join(" ")
      : c.company_name || "Unbekannt";

    // Determine which reminder to send
    let reminderType: "30d" | "7d" | "overdue" | null = null;
    let subject = "";
    let urgencyLabel = "";
    let urgencyColor = "";

    if (reviewDate === in30Days && !c.reminder_sent_30d) {
      reminderType = "30d";
      subject = `Kundenüberprüfung in 30 Tagen: ${customerName}`;
      urgencyLabel = "Fällig in 30 Tagen";
      urgencyColor = "#3b82f6";
    } else if (reviewDate === in7Days && !c.reminder_sent_7d) {
      reminderType = "7d";
      subject = `Kundenüberprüfung in 7 Tagen: ${customerName}`;
      urgencyLabel = "Fällig in 7 Tagen";
      urgencyColor = "#d97706";
    } else if (reviewDate <= today && !c.reminder_sent_overdue) {
      reminderType = "overdue";
      subject = `Überfällig: Kundenüberprüfung ${customerName}`;
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

    for (const profile of profiles ?? []) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      try {
        await sendEmail({
          to: email,
          subject,
          html: buildReminderEmail({
            recipientName: profile.full_name || "Sehr geehrte Damen und Herren",
            customerName,
            reviewDate,
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

    // Create in-app notification for all members
    for (const uid of userIds) {
      await supabase.from("notifications").insert({
        user_id: uid,
        title: subject,
        body: `Die periodische Überprüfung für ${customerName} ist ${reminderType === "overdue" ? "überfällig" : "bald fällig"}.`,
        link: "/portal/customers",
      }).catch(() => {});
    }

    // Set the reminder flag
    const flagUpdate: Record<string, boolean> = {};
    if (reminderType === "30d") flagUpdate.reminder_sent_30d = true;
    if (reminderType === "7d") flagUpdate.reminder_sent_7d = true;
    if (reminderType === "overdue") flagUpdate.reminder_sent_overdue = true;

    await supabase
      .from("client_customers")
      .update(flagUpdate)
      .eq("id", c.id);
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
  customerName: string;
  reviewDate: string;
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
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Kundenüberprüfung</div>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:${opts.urgencyColor}15;color:${opts.urgencyColor};border:1px solid ${opts.urgencyColor}30;">
          ${opts.urgencyLabel}
        </span>
      </div>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Guten Tag ${opts.recipientName},
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Die periodische Überprüfung des Kunden <strong>${opts.customerName}</strong>
        erfordert Ihre Aufmerksamkeit.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">Kunde:</div>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">${opts.customerName}</p>
        <div style="font-size:13px;color:${opts.urgencyColor};font-weight:600;">
          Überprüfungsdatum: ${opts.reviewDate}
        </div>
      </div>
      <div style="text-align:center;">
        <a href="${PORTAL_URL}/portal/customers"
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

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
