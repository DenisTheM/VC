// supabase/functions/notify-help-request/index.ts
// =============================================================================
// Triggered when a client creates a help request.
// Sends email notification to Virtue Compliance admin and creates in-app notification.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("VC_FROM_EMAIL") || "Virtue Compliance <alerts@virtue-compliance.ch>";
const ADMIN_EMAIL = Deno.env.get("VC_ADMIN_EMAIL") || "es@virtue-compliance.ch";
const PORTAL_URL = Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate caller — verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { organization_id, subject } = body;

    if (!organization_id || !subject) {
      return jsonResponse({ error: "Missing organization_id or subject" }, 400);
    }

    // Verify caller is a member of this organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!membership) {
      return jsonResponse({ error: "Not a member of this organization" }, 403);
    }

    // Get organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const orgName = org?.name ?? "Unbekannte Organisation";

    // Send email to admin
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Neue Hilfe-Anfrage: ${subject}`,
      html: buildNotificationEmail({
        orgName,
        subject,
      }),
    });

    // Create in-app notification for all admin users
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    for (const admin of adminProfiles ?? []) {
      await supabase.from("notifications").insert({
        user_id: admin.id,
        title: "Neue Hilfe-Anfrage",
        body: `${orgName}: ${subject}`,
        link: "/app/docgen/help-requests",
      }).catch(() => {});
    }

    return jsonResponse({ sent: 1 });
  } catch (err) {
    console.error("notify-help-request error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
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

function buildNotificationEmail(opts: { orgName: string; subject: string }): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:700;color:#0f3d2e;letter-spacing:-0.5px;">Virtue Compliance</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Hilfe-Anfrage</div>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe;">
          Neue Anfrage
        </span>
      </div>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Eine neue Hilfe-Anfrage wurde im Kundenportal erstellt.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">Organisation:</div>
        <p style="font-size:14px;color:#374151;margin:0 0 12px;">${escapeHtml(opts.orgName)}</p>
        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">Betreff:</div>
        <p style="font-size:14px;color:#374151;margin:0;">${escapeHtml(opts.subject)}</p>
      </div>
      <div style="text-align:center;">
        <a href="${PORTAL_URL}/app/docgen"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Im Admin-Panel ansehen
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

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
