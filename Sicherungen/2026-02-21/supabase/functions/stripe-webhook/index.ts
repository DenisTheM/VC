import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  let event: any;
  try {
    event = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || "standard";
        if (!userId) { console.error("No user_id in metadata"); break; }
        await supabase.from("profiles").update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
          plan: plan,
        }).eq("id", userId);
        console.log(`Activated ${plan} for ${userId}`);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "active";
        await supabase.from("profiles").update({ subscription_status: status }).eq("stripe_subscription_id", sub.id);
        console.log(`Subscription ${sub.id} -> ${status}`);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("profiles").update({ subscription_status: "canceled", stripe_subscription_id: null }).eq("stripe_subscription_id", sub.id);
        console.log(`Subscription ${sub.id} canceled`);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabase.from("profiles").update({ subscription_status: "past_due" }).eq("stripe_subscription_id", invoice.subscription);
          console.log(`Payment failed for ${invoice.subscription}`);
        }
        break;
      }
      default: console.log(`Unhandled: ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<any> {
  const parts = header.split(",").reduce((acc: any, part: string) => { const [k, v] = part.split("="); acc[k.trim()] = v; return acc; }, {});
  const timestamp = parts.t, signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Invalid header");
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) throw new Error("Timestamp too old");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected !== signature) throw new Error("Signature mismatch");
  return JSON.parse(payload);
}
