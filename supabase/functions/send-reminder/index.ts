import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@stillalive.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TRANSLATIONS: Record<string, { title: string; body: string }> = {
  en: { title: "Still Alive?", body: "Tap to check in and let your contacts know you're OK." },
  de: { title: "Noch da?", body: "Tippe, um dich zu melden. Deine Kontakte zählen auf dich." },
  fr: { title: "Encore là ?", body: "Appuyez pour confirmer que tout va bien." },
};

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: candidates, error: queryErr } = await supabase
      .from("reminder_candidates")
      .select("user_id, name, language, timezone, reminder_hour");
    if (queryErr) throw queryErr;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No reminders needed" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    let sentCount = 0;
    const errors: string[] = [];
    for (const user of candidates) {
      const userNow = new Date().toLocaleString("en-US", { timeZone: user.timezone, hour12: false });
      const currentHour = parseInt(userNow.split(",")[1].trim().split(":")[0], 10);
      if (currentHour !== user.reminder_hour) continue;
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", user.user_id);
      if (!subs || subs.length === 0) continue;
      const msg = TRANSLATIONS[user.language || "en"] || TRANSLATIONS.en;
      for (const sub of subs) {
        try {
          const audience = new URL(sub.endpoint).origin;
          const jwt = await createVapidJwt(audience, VAPID_SUBJECT, VAPID_PRIVATE_KEY);
          const resp = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
              TTL: "86400",
              Urgency: "normal",
            },
            body: new TextEncoder().encode(JSON.stringify({
              title: msg.title, body: msg.body, icon: "/icon-192.png", url: "/", tag: "daily-reminder",
            })),
          });
          if (!resp.ok && resp.status === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          await supabase.from("alert_log").insert({
            user_id: user.user_id, alert_type: "reminder",
            recipient: sub.endpoint.slice(0, 80), status: resp.ok ? "sent" : "failed",
          });
          if (resp.ok) sentCount++;
        } catch (e) { errors.push(String(e)); }
      }
    }
    return new Response(JSON.stringify({ sent: sentCount, errors: errors.length }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});

async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };
  const eh = base64UrlEncode(JSON.stringify(header));
  const ep = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${eh}.${ep}`;
  const keyData = base64UrlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey("pkcs8", keyData, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncode(new Uint8Array(sig))}`;
}
function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlDecode(input: string): Uint8Array {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
}
