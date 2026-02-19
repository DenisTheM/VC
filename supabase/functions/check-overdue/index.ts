import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

const TRANSLATIONS: Record<string, {
  subject: string; heading: string;
  body: (name: string, hours: number) => string; cta: string;
}> = {
  en: {
    subject: "⚠ Still Alive Alert — {name} hasn't checked in",
    heading: "Still Alive — Safety Alert",
    body: (name, hours) => `${name} has not checked in for ${Math.round(hours)} hours. This exceeds their configured safety deadline. Please try to reach them and verify they are okay.`,
    cta: "This is an automated safety notification. Please follow up.",
  },
  de: {
    subject: "⚠ Noch Da Alarm — {name} hat sich nicht gemeldet",
    heading: "Noch Da — Sicherheitsalarm",
    body: (name, hours) => `${name} hat sich seit ${Math.round(hours)} Stunden nicht gemeldet. Die konfigurierte Sicherheitsfrist wurde überschritten. Bitte versuchen Sie, Kontakt aufzunehmen.`,
    cta: "Dies ist eine automatische Sicherheitsbenachrichtigung.",
  },
  fr: {
    subject: "⚠ Encore Là Alerte — {name} ne s'est pas manifesté(e)",
    heading: "Encore Là — Alerte de sécurité",
    body: (name, hours) => `${name} ne s'est pas manifesté(e) depuis ${Math.round(hours)} heures. Le délai de sécurité configuré a été dépassé. Veuillez essayer de le/la contacter.`,
    cta: "Ceci est une notification de sécurité automatique.",
  },
};

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: overdueUsers, error: queryErr } = await supabase
      .from("overdue_users")
      .select("user_id, name, language, hours_overdue, is_overdue")
      .eq("is_overdue", true);
    if (queryErr) throw queryErr;
    if (!overdueUsers || overdueUsers.length === 0) {
      return jsonRes({ alerts_sent: 0, message: "No overdue users" });
    }
    let totalAlerts = 0;
    const errors: string[] = [];
    for (const user of overdueUsers) {
      const { data: recentAlerts } = await supabase
        .from("alert_log").select("id")
        .eq("user_id", user.user_id).eq("alert_type", "overdue_email")
        .gte("sent_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
        .limit(1);
      if (recentAlerts && recentAlerts.length > 0) continue;
      const { data: contacts } = await supabase
        .from("contacts").select("name, email, phone")
        .eq("user_id", user.user_id);
      if (!contacts || contacts.length === 0) continue;
      const t = TRANSLATIONS[user.language || "en"] || TRANSLATIONS.en;
      for (const contact of contacts) {
        try {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [contact.email],
              subject: t.subject.replace("{name}", user.name || "A user"),
              html: buildEmail(t.heading, t.body(user.name || "Your contact", user.hours_overdue), t.cta, contact.name, contact.phone),
            }),
          });
          await supabase.from("alert_log").insert({
            user_id: user.user_id, alert_type: "overdue_email",
            recipient: contact.email, status: resp.ok ? "sent" : "failed",
          });
          if (resp.ok) totalAlerts++;
        } catch (e) { errors.push(String(e)); }
      }
    }
    return jsonRes({ alerts_sent: totalAlerts, errors: errors.length });
  } catch (err) {
    return jsonRes({ error: String(err) }, 500);
  }
});

function buildEmail(heading: string, body: string, cta: string, contactName: string, phone?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#171717;border-radius:16px;padding:32px;border:1px solid #262626;">
<div style="text-align:center;margin-bottom:24px;">
<div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.15);margin:0 auto 12px;line-height:48px;font-size:24px;">⚠</div>
<h1 style="color:#ef4444;font-size:20px;margin:0;">${heading}</h1></div>
<div style="color:#d4d4d4;font-size:15px;line-height:1.6;margin-bottom:24px;">
<p>Hi ${contactName},</p><p>${body}</p>
${phone ? `<p style="color:#a3a3a3;font-size:13px;">Phone on file: ${phone}</p>` : ""}</div>
<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;text-align:center;">
<p style="color:#fca5a5;font-size:13px;margin:0;">${cta}</p></div>
<div style="text-align:center;margin-top:24px;color:#525252;font-size:11px;">
<p>Sent by Still Alive — stillalive.app</p></div></div></body></html>`;
}

function jsonRes(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
