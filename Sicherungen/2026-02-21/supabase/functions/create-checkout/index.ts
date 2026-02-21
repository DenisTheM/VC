import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://nochda.app";
const PRICES: Record<string, string> = {
  standard: Deno.env.get("STRIPE_PRICE_STANDARD") || "",
  family: Deno.env.get("STRIPE_PRICE_FAMILY") || "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Unauthorized", 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return err("Invalid token", 401);

    const { plan = "standard" } = await req.json().catch(() => ({}));
    const priceId = PRICES[plan];
    if (!priceId) return err("Invalid plan", 400);

    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, name").eq("id", user.id).single();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe("POST", "/v1/customers", { email: user.email!, name: profile?.name || "", "metadata[supabase_user_id]": user.id });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripe("POST", "/v1/checkout/sessions", {
      customer: customerId,
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${APP_URL}?payment=success`,
      cancel_url: `${APP_URL}?payment=canceled`,
      "metadata[user_id]": user.id,
      "metadata[plan]": plan,
      "subscription_data[metadata][user_id]": user.id,
      "subscription_data[metadata][plan]": plan,
      locale: "de",
      allow_promotion_codes: "true",
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    console.error("Checkout error:", e);
    return err(String(e), 500);
  }
});

async function stripe(method: string, path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${await res.text()}`);
  return res.json();
}

function err(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
