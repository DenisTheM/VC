// supabase/functions/send-client-message/index.ts
// =============================================================================
// Sends a message from admin to all members of a client organization.
// Saves to admin_messages, sends email via Resend, creates in-app notifications.
//
// Expects: { organization_id, subject, body }
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
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // Parse body
    const { organization_id, subject, body } = await req.json();
    if (!organization_id || !subject || !body) {
      return jsonResponse({ error: "organization_id, subject, and body are required" }, 400);
    }

    // Get org name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const orgName = org?.name ?? "Organisation";

    // Save message to DB
    const { error: insertErr } = await supabase
      .from("admin_messages")
      .insert({
        organization_id,
        subject,
        body,
        sent_by: user.id,
      });

    if (insertErr) {
      console.error("Failed to save message:", insertErr);
      return jsonResponse({ error: "Nachricht konnte nicht gespeichert werden." }, 500);
    }

    // Get all members of the organization
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization_id);

    if (!members || members.length === 0) {
      return jsonResponse({ success: true, sent: 0, message: "Nachricht gespeichert, aber keine Mitglieder gefunden." });
    }

    const userIds = members.map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    let sentCount = 0;
    const errors: string[] = [];

    for (const p of profiles ?? []) {
      // Get email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(p.id);
      const email = authUser?.user?.email;

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: p.id,
        type: "admin_message",
        title: subject,
        body: body.length > 200 ? body.substring(0, 200) + "..." : body,
        link: "/portal/messages",
      }).catch(() => { /* ignore */ });

      if (!email || !RESEND_API_KEY) continue;

      // Send email
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
            subject: `Nachricht von Virtue Compliance: ${subject}`,
            html: buildMessageEmail(subject, body, orgName, p.full_name || "Sehr geehrte Damen und Herren"),
          }),
        });

        if (res.ok) {
          sentCount++;
        } else {
          const errBody = await res.text();
          errors.push(`${email}: ${errBody}`);
        }
      } catch (emailErr) {
        errors.push(`${email}: ${String(emailErr)}`);
      }
    }

    return jsonResponse({
      success: true,
      sent: sentCount,
      recipients: profiles?.length ?? 0,
      errors: errors.length,
    });
  } catch (err) {
    console.error("send-client-message error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function buildMessageEmail(subject: string, body: string, orgName: string, recipientName: string): string {
  // Escape HTML in body and convert newlines to <br>
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;font-weight:700;color:#0f3d2e;letter-spacing:-0.5px;">Virtue Compliance</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Nachricht</div>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">${subject}</h1>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Guten Tag ${recipientName},</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">${safeBody}</p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${PORTAL_URL}/portal"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Im Portal ansehen
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

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
