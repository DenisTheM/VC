// supabase/functions/notify-approval/index.ts
// =============================================================================
// Sends an email to the organization's Compliance Officer when an admin moves
// a document from "draft" to "review" — prompting the CO to log in and approve.
//
// Trigger: Called from Admin Panel (DocumentsPage) on status change draft→review
// Expects: { document_id: string, organization_id: string }
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL =
  Deno.env.get("VC_FROM_EMAIL") ||
  "Virtue Compliance <portal@virtue-compliance.ch>";
const PORTAL_URL =
  Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { document_id, organization_id } = await req.json();

    if (!document_id || !organization_id) {
      return jsonResponse({ error: "document_id und organization_id sind erforderlich." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load organization with contact_email
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, contact_email, contact_name")
      .eq("id", organization_id)
      .single();

    if (orgErr || !org) {
      return jsonResponse({ error: "Organisation nicht gefunden." }, 400);
    }

    if (!org.contact_email) {
      return jsonResponse({
        success: false,
        message: "Keine CO-E-Mail hinterlegt — keine Benachrichtigung versendet.",
      });
    }

    // Load document info
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, name, doc_type")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return jsonResponse({ error: "Dokument nicht gefunden." }, 400);
    }

    // Send approval request email
    const recipientName = org.contact_name || org.contact_email.split("@")[0];
    const portalLink = `${PORTAL_URL}/app/portal#approvals`;

    await sendEmail({
      to: org.contact_email,
      subject: `Dokument zur Freigabe bereit — ${doc.name} (${org.name})`,
      html: buildApprovalEmail(recipientName, org.name, doc.name, portalLink),
    });

    return jsonResponse({
      success: true,
      message: `Benachrichtigung an ${org.contact_email} versendet.`,
    });
  } catch (err) {
    console.error("notify-approval error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// ── Send Email via Resend ────────────────────────────────────────────────────

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend API error ${response.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ── Approval Request Email Template ──────────────────────────────────────────

function buildApprovalEmail(
  recipientName: string,
  orgName: string,
  docName: string,
  portalLink: string,
): string {
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
        Dokument-Freigabe
      </div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">
        Dokument zur Freigabe bereit
      </h1>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Guten Tag ${recipientName},
      </p>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Ein neues Compliance-Dokument f&uuml;r <strong>${orgName}</strong> wurde erstellt
        und ist bereit f&uuml;r Ihre Pr&uuml;fung und Freigabe:
      </p>

      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #0f3d2e;">
        <div style="font-size:15px;font-weight:600;color:#111827;">${docName}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">Organisation: ${orgName}</div>
      </div>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
        Bitte melden Sie sich im Portal an, um das Dokument zu pr&uuml;fen und freizugeben.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${portalLink}"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
          Dokument pr&uuml;fen &amp; freigeben
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:20px 0 0;">
        Sie erhalten diese E-Mail, weil Sie als Compliance Officer f&uuml;r ${orgName} registriert sind.
      </p>
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

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
