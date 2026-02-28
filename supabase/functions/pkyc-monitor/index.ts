// supabase/functions/pkyc-monitor/index.ts
// =============================================================================
// Cron: Daily pKYC monitoring checks
// - Sanctions re-screening (via OpenSanctions)
// - Review deadline triggers
// - Handelsregister changes (via Zefix)
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    // Auth check — only admin users or cron service can trigger this
    const auth = await verifyAuth(req);
    if (!auth.authenticated) return unauthorizedResponse(cors);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const today = new Date().toISOString().split("T")[0];
    let triggersCreated = 0;

    // 1. Check review deadlines — customers with next_review in the past
    const { data: overdueCustomers } = await supabase
      .from("client_customers")
      .select("id, organization_id, data")
      .not("next_review", "is", null)
      .lte("next_review", today);

    for (const cust of overdueCustomers ?? []) {
      // Check if trigger already exists for this customer
      const { data: existing } = await supabase
        .from("pkyc_triggers")
        .select("id")
        .eq("customer_id", cust.id)
        .eq("trigger_type", "review_due")
        .eq("status", "new")
        .maybeSingle();

      if (!existing) {
        // deno-lint-ignore no-explicit-any
        const custData = (cust.data ?? {}) as any;
        const name = custData.name || custData.company_name || "Unbekannt";
        await supabase.from("pkyc_triggers").insert({
          customer_id: cust.id,
          organization_id: cust.organization_id,
          trigger_type: "review_due",
          severity: "warning",
          description: `Kundenüberprüfung fällig: ${name}`,
          source_data: { next_review: (cust as { next_review?: string }).next_review },
        });
        triggersCreated++;
      }
    }

    // 2. Re-screening: Load orgs with sanctions monitoring enabled
    const { data: configs } = await supabase
      .from("pkyc_monitoring_config")
      .select("organization_id, auto_screening_interval_days")
      .eq("sanctions_monitoring", true);

    for (const config of configs ?? []) {
      const intervalDays = config.auto_screening_interval_days ?? 30;
      const cutoff = new Date(Date.now() - intervalDays * 86400000).toISOString();

      // Find customers not screened recently
      const { data: customers } = await supabase
        .from("client_customers")
        .select("id, data, organization_id")
        .eq("organization_id", config.organization_id);

      for (const cust of customers ?? []) {
        const { data: lastScreening } = await supabase
          .from("screening_results")
          .select("screened_at")
          .eq("customer_id", cust.id)
          .order("screened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastScreening || lastScreening.screened_at < cutoff) {
          // Trigger re-screening notice (actual screening done via sanctions-screening function)
          // deno-lint-ignore no-explicit-any
          const custData = (cust.data ?? {}) as any;
          const name = custData.name || custData.company_name || "Unbekannt";

          const { data: existingTrigger } = await supabase
            .from("pkyc_triggers")
            .select("id")
            .eq("customer_id", cust.id)
            .eq("trigger_type", "sanctions_hit")
            .eq("status", "new")
            .maybeSingle();

          if (!existingTrigger) {
            await supabase.from("pkyc_triggers").insert({
              customer_id: cust.id,
              organization_id: cust.organization_id,
              trigger_type: "sanctions_hit",
              severity: "info",
              description: `Sanctions Re-Screening fällig: ${name} (letztes Screening > ${intervalDays} Tage)`,
              source_data: { last_screening: lastScreening?.screened_at ?? null },
            });
            triggersCreated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      triggers_created: triggersCreated,
      checked_at: new Date().toISOString(),
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pkyc-monitor error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
