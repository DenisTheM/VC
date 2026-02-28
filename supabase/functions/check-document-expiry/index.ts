// supabase/functions/check-document-expiry/index.ts
// =============================================================================
// Cron: Daily 07:30 UTC — check document expiry dates
// - 30 days before: reminder email to org members
// - 7 days before: urgent reminder
// - Expired: auto-transition current → outdated + notification
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

    const today = new Date().toISOString().split("T")[0];
    const in7d = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    // Load all current documents with next_review set
    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, name, organization_id, next_review, organizations(name, contact_name, contact_email)")
      .eq("status", "current")
      .not("next_review", "is", null)
      .lte("next_review", in30d);

    if (error) throw error;
    if (!docs || docs.length === 0) {
      return jsonResponse({ message: "No documents approaching expiry.", processed: 0 });
    }

    let reminders30 = 0;
    let reminders7 = 0;
    let expired = 0;

    for (const doc of docs) {
      const reviewDate = doc.next_review;
      const isExpired = reviewDate <= today;
      const isUrgent = !isExpired && reviewDate <= in7d;
      const org = doc.organizations as { name: string; contact_name: string | null; contact_email: string | null } | null;

      if (isExpired) {
        // Auto-transition to outdated
        await supabase
          .from("documents")
          .update({ status: "outdated", updated_at: new Date().toISOString() })
          .eq("id", doc.id);
        expired++;

        await sendExpiryEmail(supabase, doc, org, "expired");
      } else if (isUrgent) {
        reminders7++;
        await sendExpiryEmail(supabase, doc, org, "urgent");
      } else {
        reminders30++;
        await sendExpiryEmail(supabase, doc, org, "reminder");
      }
    }

    return jsonResponse({
      processed: docs.length,
      reminders30,
      reminders7,
      expired,
    });
  } catch (err) {
    console.error("check-document-expiry error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function sendExpiryEmail(supabase: any, doc: any, org: any, type: "reminder" | "urgent" | "expired") {
  if (!RESEND_API_KEY) return;

  // Get org members' emails
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", doc.organization_id);

  if (!members || members.length === 0) return;

  const userIds = members.map((m: { user_id: string }) => m.user_id);

  // Batch get emails
  for (const uid of userIds) {
    const { data: authUser } = await supabase.auth.admin.getUserById(uid);
    const email = authUser?.user?.email;
    if (!email) continue;

    const orgName = org?.name ?? "Ihre Organisation";
    const subject = type === "expired"
      ? `Dokument abgelaufen: ${doc.name}`
      : type === "urgent"
        ? `Dringend: ${doc.name} läuft in wenigen Tagen ab`
        : `Erinnerung: ${doc.name} läuft bald ab`;

    const reviewDate = new Date(doc.next_review).toLocaleDateString("de-CH");
    const bodyText = type === "expired"
      ? `Das Dokument "${doc.name}" für ${orgName} ist am ${reviewDate} abgelaufen und wurde auf "Veraltet" gesetzt. Bitte erstellen Sie eine aktualisierte Version.`
      : type === "urgent"
        ? `Das Dokument "${doc.name}" für ${orgName} läuft am ${reviewDate} ab. Bitte überprüfen Sie das Dokument umgehend.`
        : `Das Dokument "${doc.name}" für ${orgName} läuft am ${reviewDate} ab. Planen Sie rechtzeitig eine Überprüfung ein.`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject,
          html: buildExpiryEmail(subject, bodyText, orgName),
        }),
      });
    } catch (err) {
      console.error(`Failed to send expiry email to ${email}:`, err);
    }

    // In-app notification
    try {
      await supabase.from("notifications").insert({
        user_id: uid,
        type: "document_expiry",
        title: subject,
        body: bodyText.substring(0, 200),
        link: "/app/portal#docs",
      });
    } catch { /* ignore */ }
  }
}

function buildExpiryEmail(subject: string, bodyText: string, orgName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:700;color:#0f3d2e;letter-spacing:-0.5px;">Virtue Compliance</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Dokument-Erinnerung</div>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">${escapeHtml(subject)}</h1>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">${escapeHtml(bodyText)}</p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${PORTAL_URL}/app/portal#docs"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Dokumente ansehen
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;color:#9ca3af;font-size:12px;line-height:1.5;">
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

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
