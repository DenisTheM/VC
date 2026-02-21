// supabase/functions/notify-contact/index.ts
// ═══════════════════════════════════════════════════════════════════════════
// Sends a welcome email to an emergency contact when they are first added.
// Explains what nochda is, what to expect, and what to do when an alert comes.
//
// Trigger: Call via database webhook on contacts INSERT, or from the app.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "nochda <hallo@nochda.app>";

// ── Translations ─────────────────────────────────────────────────────────────

interface WelcomeStrings {
  subject: (userName: string) => string;
  heading: string;
  greeting: (contactName: string) => string;
  intro: (userName: string) => string;
  whatIs: string;
  whatIsDesc: string;
  whatHappens: string;
  whatHappensDesc: (userName: string) => string;
  whatToDo: string;
  whatToDoSteps: (userName: string) => string[];
  note: string;
  footer: string;
}

const T: Record<string, WelcomeStrings> = {
  de: {
    subject: (name) => `${name} hat dich als Notfallkontakt bei nochda hinterlegt`,
    heading: "Du bist Notfallkontakt",
    greeting: (name) => `Hallo ${name},`,
    intro: (name) =>
      `${name} nutzt nochda — eine App für Menschen, die allein leben — und hat dich als Notfallkontakt eingetragen.`,
    whatIs: "Was ist nochda?",
    whatIsDesc:
      "nochda ist ein täglicher Check-in-Dienst. Der Nutzer bestätigt einmal am Tag mit einem Tap, dass es ihm gut geht. Wenn diese Bestätigung über einen bestimmten Zeitraum ausbleibt, werden die Notfallkontakte automatisch benachrichtigt.",
    whatHappens: "Was passiert im Ernstfall?",
    whatHappensDesc: (name) =>
      `Wenn ${name} sich nicht rechtzeitig meldet, erhältst du eine E-Mail mit dem Betreff «nochda Alarm». Das bedeutet, dass die eingestellte Frist überschritten wurde.`,
    whatToDo: "Was solltest du dann tun?",
    whatToDoSteps: (name) => [
      `Versuche ${name} telefonisch zu erreichen.`,
      "Wenn du keine Antwort bekommst, schau persönlich vorbei oder kontaktiere eine andere Vertrauensperson.",
      "Im Notfall: Ruf die Polizei (117) oder den Notruf (112/144).",
    ],
    note: "Diese Funktion ist rein vorsorglich. In den meisten Fällen hat die Person einfach vergessen, sich zu melden. Aber genau dafür gibt es dieses System — damit jemand nachschaut.",
    footer: "nochda — Ein Tap. Jeden Tag. Sicherheit.",
  },
  en: {
    subject: (name) => `${name} added you as an emergency contact on nochda`,
    heading: "You're an Emergency Contact",
    greeting: (name) => `Hi ${name},`,
    intro: (name) =>
      `${name} uses nochda — an app for people who live alone — and has added you as their emergency contact.`,
    whatIs: "What is nochda?",
    whatIsDesc:
      "nochda is a daily check-in service. The user confirms once a day with a single tap that they're okay. If they miss their check-in beyond a set deadline, their emergency contacts are automatically notified.",
    whatHappens: "What happens in an emergency?",
    whatHappensDesc: (name) =>
      `If ${name} doesn't check in on time, you'll receive an email with the subject "nochda Alert". This means their safety deadline has been exceeded.`,
    whatToDo: "What should you do?",
    whatToDoSteps: (name) => [
      `Try to reach ${name} by phone.`,
      "If you can't get through, visit them in person or contact someone who can.",
      "In an emergency: Call local emergency services.",
    ],
    note: "This feature is purely precautionary. In most cases, the person simply forgot to check in. But that's exactly why this system exists — so someone checks.",
    footer: "nochda — One tap. Every day. Peace of mind.",
  },
  fr: {
    subject: (name) => `${name} vous a ajouté(e) comme contact d'urgence sur nochda`,
    heading: "Vous êtes contact d'urgence",
    greeting: (name) => `Bonjour ${name},`,
    intro: (name) =>
      `${name} utilise nochda — une application pour les personnes vivant seules — et vous a désigné(e) comme contact d'urgence.`,
    whatIs: "Qu'est-ce que nochda ?",
    whatIsDesc:
      "nochda est un service de check-in quotidien. L'utilisateur confirme une fois par jour d'un simple tap qu'il va bien. S'il ne se manifeste pas dans le délai configuré, ses contacts d'urgence sont automatiquement prévenus.",
    whatHappens: "Que se passe-t-il en cas d'urgence ?",
    whatHappensDesc: (name) =>
      `Si ${name} ne se manifeste pas à temps, vous recevrez un e-mail avec l'objet « Alerte nochda ». Cela signifie que le délai de sécurité a été dépassé.`,
    whatToDo: "Que devez-vous faire ?",
    whatToDoSteps: (name) => [
      `Essayez de joindre ${name} par téléphone.`,
      "Si vous n'obtenez pas de réponse, rendez-vous sur place ou contactez une personne de confiance.",
      "En cas d'urgence : Appelez les services d'urgence (112).",
    ],
    note: "Cette fonctionnalité est purement préventive. Dans la plupart des cas, la personne a simplement oublié de se manifester. Mais c'est exactement pour cela que ce système existe — pour que quelqu'un vérifie.",
    footer: "nochda — Un tap. Chaque jour. Tranquillité.",
  },
};

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Accept either webhook payload or manual call with { contact_id }
    let contactId: string | null = null;
    let record: any = null;

    const body = await req.json().catch(() => null);

    if (body?.record) {
      // Database webhook payload
      record = body.record;
      contactId = record.id;
    } else if (body?.contact_id) {
      // Manual call
      contactId = body.contact_id;
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();
      record = data;
    }

    if (!record) {
      return jsonResponse({ error: "No contact data provided" }, 400);
    }

    // Get the user's profile (the person who added this contact)
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, language")
      .eq("id", record.user_id)
      .single();

    if (!profile) {
      return jsonResponse({ error: "User profile not found" }, 404);
    }

    const lang = profile.language || "de";
    const t = T[lang] || T.de;
    const userName = profile.name || "Jemand";
    const contactName = record.name || "Du";

    // Send the welcome email
    await sendEmail({
      to: record.email,
      subject: t.subject(userName),
      html: buildWelcomeEmail(t, userName, contactName),
    });

    // Log it
    await supabase.from("alert_log").insert({
      user_id: record.user_id,
      alert_type: "contact_welcome",
      recipient: record.email,
      status: "sent",
    });

    return jsonResponse({ success: true, sent_to: record.email });
  } catch (err) {
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

function buildWelcomeEmail(t: WelcomeStrings, userName: string, contactName: string): string {
  const steps = t.whatToDoSteps(userName)
    .map((s, i) => `<li style="margin-bottom:8px;">${s}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#060606;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:0 16px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;border:2px solid #4ade80;border-radius:50%;line-height:52px;text-align:center;">
        <span style="color:#4ade80;font-size:28px;">✓</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#0e0e0e;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.08);">

      <!-- Heading -->
      <h1 style="color:#4ade80;font-size:22px;font-weight:700;margin:0 0 24px;text-align:center;">
        ${t.heading}
      </h1>

      <!-- Greeting & Intro -->
      <p style="color:#e5e5e5;font-size:15px;line-height:1.6;margin:0 0 8px;">
        ${t.greeting(contactName)}
      </p>
      <p style="color:#d4d4d4;font-size:15px;line-height:1.6;margin:0 0 24px;">
        ${t.intro(userName)}
      </p>

      <!-- What is nochda -->
      <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">
          ${t.whatIs}
        </h2>
        <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0;">
          ${t.whatIsDesc}
        </p>
      </div>

      <!-- What happens -->
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="color:#ef4444;font-size:15px;font-weight:700;margin:0 0 8px;">
          ${t.whatHappens}
        </h2>
        <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0;">
          ${t.whatHappensDesc(userName)}
        </p>
      </div>

      <!-- What to do -->
      <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="color:#fbbf24;font-size:15px;font-weight:700;margin:0 0 12px;">
          ${t.whatToDo}
        </h2>
        <ol style="color:#d4d4d4;font-size:14px;line-height:1.6;margin:0;padding-left:20px;">
          ${steps}
        </ol>
      </div>

      <!-- Note -->
      <p style="color:#737373;font-size:13px;line-height:1.6;margin:0;padding:16px 0;border-top:1px solid rgba(255,255,255,0.06);">
        ${t.note}
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#404040;font-size:12px;">
      <p style="margin:0 0 4px;">${t.footer}</p>
      <p style="margin:0;">
        <a href="https://nochda.app" style="color:#4ade80;text-decoration:none;">nochda.app</a>
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
