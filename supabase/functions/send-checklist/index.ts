// supabase/functions/send-checklist/index.ts
// =============================================================================
// Sends the SRO-Registrierung checklist PDF via Resend to a blog visitor.
//
// Trigger: Public form on /blog/sro-registrierung.html (no auth required)
// Expects: { email: string }
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL =
  Deno.env.get("VC_FROM_EMAIL") ||
  "Virtue Compliance <portal@virtue-compliance.ch>";

const CHECKLIST_URL =
  "https://www.virtue-compliance.ch/assets/downloads/sro-checkliste-virtue-compliance.pdf";
const CALENDLY_URL = "https://calendly.com/meet-virtue-compliance";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return jsonResponse({ error: "E-Mail-Adresse ist erforderlich." }, 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ error: "Ungültige E-Mail-Adresse." }, 400);
    }

    await sendEmail({
      to: email,
      subject: "Ihre SRO-Registrierung Checkliste",
      html: buildChecklistEmail(email),
    });

    return jsonResponse({ success: true, message: "Checkliste versendet." });
  } catch (err) {
    console.error("send-checklist error:", err);
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

// ── Checklist Email Template ─────────────────────────────────────────────────

function buildChecklistEmail(email: string): string {
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
        SRO-Registrierung Checkliste
      </div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">
        Ihre SRO-Registrierung Checkliste
      </h1>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Vielen Dank f&uuml;r Ihr Interesse! Hier ist Ihre kostenlose Checkliste f&uuml;r die SRO-Registrierung in der Schweiz.
      </p>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px;">
        <strong>Die Checkliste enth&auml;lt:</strong>
      </p>
      <ul style="font-size:14px;color:#374151;line-height:1.8;margin:0 0 24px;padding-left:20px;">
        <li>Vollst&auml;ndige Dokumentenliste f&uuml;r das Aufnahmegesuch</li>
        <li>Interne Weisungen und Compliance-Vorlagen</li>
        <li>Schritt-f&uuml;r-Schritt Zeitplan mit Meilensteinen</li>
        <li>Kosten&uuml;bersicht der wichtigsten SRO</li>
      </ul>

      <!-- Download CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${CHECKLIST_URL}"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
          Checkliste herunterladen (PDF)
        </a>
      </div>

      <div style="border-top:1px solid #e5e7eb;margin:24px 0;"></div>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        <strong>N&auml;chster Schritt:</strong> Besprechen Sie Ihre SRO-Registrierung mit Elena Scheller &ndash; kostenlos und unverbindlich.
      </p>

      <!-- Calendly CTA -->
      <div style="text-align:center;margin:16px 0;">
        <a href="${CALENDLY_URL}"
           style="display:inline-block;background:#ffffff;color:#0f3d2e;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;border:2px solid #0f3d2e;">
          Erstgespr&auml;ch buchen
        </a>
      </div>

      <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:20px 0 0;">
        Sie erhalten diese E-Mail, weil Sie die SRO-Checkliste auf virtue-compliance.ch angefordert haben.
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
