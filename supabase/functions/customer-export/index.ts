// supabase/functions/customer-export/index.ts
// =============================================================================
// REST API for programmatic export of customer data.
// Used for CRM/DMS integration.
//
// POST /functions/v1/customer-export
// Authorization: Bearer <access_token>
//
// Body: {
//   customer_id?: string,
//   status_filter?: string[],
//   include_documents?: boolean
// }
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return corsResponse(req);

  const corsHeaders = getCorsHeaders(req);

  function jsonResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate via Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Get user's organization
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id, organizations(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      return jsonResponse({ error: "No organization found for user" }, 403);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = membership.organizations as any;
    const orgId = org.id;
    const orgName = org.name;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id as string | undefined;
    const statusFilter = body.status_filter as string[] | undefined;
    const includeDocs = body.include_documents !== false; // default true

    // Load customers
    let customerQuery = supabase
      .from("client_customers")
      .select("*")
      .eq("organization_id", orgId);

    if (customerId) {
      customerQuery = customerQuery.eq("id", customerId);
    }

    const { data: customers, error: custError } = await customerQuery;
    if (custError) {
      return jsonResponse({ error: "Failed to load customers: " + custError.message }, 500);
    }

    // Load documents if requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let docsMap: Record<string, any[]> = {};
    if (includeDocs && customers && customers.length > 0) {
      let docQuery = supabase
        .from("customer_documents")
        .select("*")
        .eq("organization_id", orgId);

      if (customerId) {
        docQuery = docQuery.eq("customer_id", customerId);
      }
      if (statusFilter && statusFilter.length > 0) {
        docQuery = docQuery.in("status", statusFilter);
      }

      const { data: docs, error: docError } = await docQuery;
      if (docError) {
        return jsonResponse({ error: "Failed to load documents: " + docError.message }, 500);
      }

      for (const doc of docs ?? []) {
        const cid = doc.customer_id;
        if (!docsMap[cid]) docsMap[cid] = [];
        docsMap[cid].push({
          id: doc.id,
          template_key: doc.template_key,
          name: doc.name,
          status: doc.status,
          version: doc.version,
          data: doc.data,
          approved_at: doc.approved_at,
          created_at: doc.created_at,
        });
      }
    }

    // Build response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportCustomers = (customers ?? []).map((c: any) => {
      const name = c.customer_type === "natural_person"
        ? [c.first_name, c.last_name].filter(Boolean).join(" ")
        : c.company_name;

      return {
        id: c.id,
        customer_type: c.customer_type,
        name,
        uid_number: c.uid_number,
        risk_level: c.risk_level,
        status: c.status,
        next_review: c.next_review,
        ...(includeDocs ? { documents: docsMap[c.id] || [] } : {}),
      };
    });

    return jsonResponse({
      organization: { id: orgId, name: orgName },
      customers: exportCustomers,
      exported_at: new Date().toISOString(),
      export_version: "1.0",
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

