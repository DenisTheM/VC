// supabase/functions/invite-member/index.ts
// =============================================================================
// Creates a new user account and adds them to an organization with a specific
// role. Sends a branded welcome email with a password-set link.
//
// Trigger: Called from Admin Panel (OrgMembersPanel) when inviting a new member
// Expects: { email: string, full_name: string, org_id: string, role: string }
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL =
  Deno.env.get("VC_FROM_EMAIL") ||
  "Virtue Compliance <portal@virtue-compliance.ch>";
const PORTAL_URL =
  Deno.env.get("VC_PORTAL_URL") || "https://app.virtue-compliance.ch";

const VALID_ROLES = ["viewer", "editor", "approver"];

const ROLE_LABELS: Record<string, string> = {
  viewer: "Betrachter",
  editor: "Bearbeiter",
  approver: "Freigeber",
};

serve(async (req) => {
  try {
    const { email, full_name, org_id, role } = await req.json();

    // ── Validate input ───────────────────────────────────────────────
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return jsonResponse({ error: "Ungültige E-Mail-Adresse." }, 400);
    }
    if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
      return jsonResponse({ error: "Name ist erforderlich." }, 400);
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return jsonResponse(
        { error: `Ungültige Rolle. Erlaubt: ${VALID_ROLES.join(", ")}` },
        400,
      );
    }
    if (!org_id) {
      return jsonResponse({ error: "Organisation-ID ist erforderlich." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Verify organization exists ───────────────────────────────────
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", org_id)
      .single();

    if (orgErr || !org) {
      return jsonResponse({ error: "Organisation nicht gefunden." }, 400);
    }

    // ── Check if user already exists ─────────────────────────────────
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already member of this org
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", org_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        return jsonResponse(
          {
            error: `${email} ist bereits Mitglied dieser Organisation.`,
          },
          409,
        );
      }

      // User exists but not in this org — add them
      const { error: memberErr } = await supabase
        .from("organization_members")
        .insert({ organization_id: org_id, user_id: userId, role });

      if (memberErr) throw memberErr;

      // Send info email about being added to org
      await sendEmail({
        to: email,
        subject: `Sie wurden zu ${org.name} hinzugefügt — Virtue Compliance`,
        html: buildAddedToOrgEmail(full_name.trim(), org.name, role),
      });

      return jsonResponse({
        success: true,
        message: `${email} wurde als bestehendes Mitglied zur Organisation hinzugefügt.`,
        existing_user: true,
      });
    }

    // ── Create new user (no password) ────────────────────────────────
    const { data: newUser, error: createErr } =
      await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
      });

    if (createErr) {
      console.error("createUser error:", createErr);
      return jsonResponse(
        { error: `Benutzer konnte nicht erstellt werden: ${createErr.message}` },
        500,
      );
    }

    userId = newUser.user.id;

    // ── Update profile (created by trigger on_auth_user_created) ─────
    // Small delay to let the trigger fire
    await new Promise((r) => setTimeout(r, 500));

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        role: "client",
        full_name: full_name.trim(),
        organization_id: org_id,
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("profile update error:", profileErr);
      // Don't fail — profile may not exist yet, or trigger hasn't fired.
      // Try upsert as fallback.
      await supabase.from("profiles").upsert({
        id: userId,
        role: "client",
        full_name: full_name.trim(),
        organization_id: org_id,
      });
    }

    // ── Add to organization_members ──────────────────────────────────
    const { error: memberErr } = await supabase
      .from("organization_members")
      .insert({ organization_id: org_id, user_id: userId, role });

    if (memberErr) {
      console.error("organization_members insert error:", memberErr);
      throw memberErr;
    }

    // ── Generate recovery link (password-set) ────────────────────────
    const { data: linkData, error: linkErr } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email: email.toLowerCase(),
        options: {
          redirectTo: `${PORTAL_URL}/app/login`,
        },
      });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("generateLink error:", linkErr);
      return jsonResponse(
        {
          success: true,
          message: `Benutzer erstellt, aber Einladungs-Link konnte nicht generiert werden. Bitte manuell zurücksetzen.`,
          warning: true,
        },
        201,
      );
    }

    const passwordLink = linkData.properties.action_link;

    // ── Send branded welcome email ───────────────────────────────────
    await sendEmail({
      to: email,
      subject: `Willkommen bei Virtue Compliance — Ihr Zugang für ${org.name}`,
      html: buildWelcomeEmail(
        full_name.trim(),
        org.name,
        role,
        passwordLink,
      ),
    });

    return jsonResponse({
      success: true,
      message: `Einladung an ${email} versendet.`,
    });
  } catch (err) {
    console.error("invite-member error:", err);
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

// ── Welcome Email Template ───────────────────────────────────────────────────

function buildWelcomeEmail(
  recipientName: string,
  orgName: string,
  role: string,
  passwordLink: string,
): string {
  const roleLabel = ROLE_LABELS[role] || role;

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
        Portal-Einladung
      </div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">
        Willkommen bei Virtue Compliance
      </h1>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Guten Tag ${recipientName},
      </p>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Sie wurden zum Compliance-Portal von <strong>${orgName}</strong> eingeladen.
        Ihr Zugang wurde mit der Rolle <strong>${roleLabel}</strong> eingerichtet.
      </p>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
        Bitte klicken Sie auf den folgenden Button, um Ihr Passwort zu setzen und
        das Portal zu öffnen:
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${passwordLink}"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
          Passwort setzen &amp; Portal öffnen
        </a>
      </div>

      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:20px;">
        <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
          <a href="${passwordLink}" style="color:#0f3d2e;word-break:break-all;font-size:12px;">${passwordLink}</a>
        </p>
      </div>

      <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:20px 0 0;">
        Dieser Link ist zeitlich begrenzt gültig. Falls er abgelaufen ist,
        kontaktieren Sie bitte Ihren Administrator.
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

// ── "Added to Org" Email (for existing users) ────────────────────────────────

function buildAddedToOrgEmail(
  recipientName: string,
  orgName: string,
  role: string,
): string {
  const roleLabel = ROLE_LABELS[role] || role;

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
        Organisations-Zugang
      </div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3;">
        Neuer Organisations-Zugang
      </h1>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        Guten Tag ${recipientName},
      </p>

      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
        Sie wurden zur Organisation <strong>${orgName}</strong> hinzugefügt
        (Rolle: <strong>${roleLabel}</strong>). Sie können sich wie gewohnt
        im Portal anmelden, um auf die Daten dieser Organisation zuzugreifen.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${PORTAL_URL}/app/login"
           style="display:inline-block;background:#0f3d2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
          Zum Portal
        </a>
      </div>
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
    headers: { "Content-Type": "application/json" },
  });
}
