import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZEFIX_API = "https://www.zefix.admin.ch/ZefixPublicREST/api/v1";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Parse request
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return json({ error: "Query must be at least 2 characters" }, 400);
    }

    // Build Zefix auth header (optional — works if credentials are configured)
    const zefixUser = Deno.env.get("ZEFIX_USERNAME");
    const zefixPass = Deno.env.get("ZEFIX_PASSWORD");
    const zefixHeaders: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
    };
    if (zefixUser && zefixPass) {
      zefixHeaders["Authorization"] = `Basic ${btoa(`${zefixUser}:${zefixPass}`)}`;
    }

    // Step 1: Search by name
    const searchRes = await fetch(`${ZEFIX_API}/company/search`, {
      method: "POST",
      headers: zefixHeaders,
      body: JSON.stringify({ name: query.trim(), activeOnly: true }),
    });

    if (!searchRes.ok) {
      const status = searchRes.status;
      if (status === 401 || status === 403) {
        return json({
          results: [],
          hint: "Zefix-API-Zugangsdaten nicht konfiguriert. Bitte ZEFIX_USERNAME und ZEFIX_PASSWORD als Supabase Secrets hinterlegen.",
        });
      }
      return json({
        results: [],
        hint: `Zefix-API nicht erreichbar (Status ${status}).`,
      });
    }

    const searchData = await searchRes.json();
    if (!Array.isArray(searchData) || searchData.length === 0) {
      return json({ results: [], hint: null });
    }

    // Step 2: For top results, fetch details (max 8 to avoid rate limiting)
    const topResults = searchData.slice(0, 8);
    const detailed = await Promise.all(
      topResults.map(async (company: Record<string, unknown>) => {
        try {
          const uid = company.uid as string;
          if (!uid) return mapSearchResult(company);

          const detailRes = await fetch(`${ZEFIX_API}/company/uid/${uid}`, {
            headers: zefixHeaders,
          });

          if (!detailRes.ok) return mapSearchResult(company);

          const detailData = await detailRes.json();
          // Detail endpoint may return an array
          const detail = Array.isArray(detailData) ? detailData[0] : detailData;
          return mapDetailResult(detail);
        } catch {
          return mapSearchResult(company);
        }
      }),
    );

    return json({ results: detailed.filter(Boolean), hint: null });
  } catch (err) {
    console.error("zefix-lookup error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// Map search-only result (fallback if detail fetch fails)
function mapSearchResult(c: Record<string, unknown>) {
  const lf = c.legalForm as Record<string, unknown> | undefined;
  return {
    name: (c.name as string) || "",
    uid: formatUid(c.uid as string),
    legalForm: lf?.shortName?.toString() || lf?.name?.toString() || "",
    legalSeat: (c.legalSeat as string) || "",
    address: (c.legalSeat as string) || "",
    foundingYear: null,
    purpose: null,
  };
}

// Map detailed result with full address and purpose
function mapDetailResult(c: Record<string, unknown>) {
  if (!c) return null;

  const lf = c.legalForm as Record<string, unknown> | undefined;
  const lfShort =
    (lf?.shortName as Record<string, string>)?.de ||
    (lf?.shortName as Record<string, string>)?.en ||
    "";
  const lfName =
    (lf?.name as Record<string, string>)?.de ||
    (lf?.name as Record<string, string>)?.en ||
    "";

  // Build address
  const addr = c.address as Record<string, unknown> | undefined;
  let fullAddress = "";
  if (addr) {
    const parts = [
      addr.street,
      addr.houseNumber ? ` ${addr.houseNumber}` : "",
    ]
      .join("")
      .trim();
    const city = [addr.swissZipCode, addr.city].filter(Boolean).join(" ");
    fullAddress = [parts, city].filter(Boolean).join(", ");
  }
  if (!fullAddress) {
    fullAddress = (c.legalSeat as string) || "";
  }

  // Extract founding year from sogcDate or registration
  let foundingYear: number | null = null;
  const sogcDate = c.sogcDate as string | undefined;
  if (sogcDate) {
    const year = parseInt(sogcDate.substring(0, 4), 10);
    if (year > 1800 && year <= new Date().getFullYear()) {
      foundingYear = year;
    }
  }

  // Purpose
  const purpose = (c.purpose as Record<string, string>)?.de ||
    (c.purpose as Record<string, string>)?.en ||
    (c.purpose as string) ||
    null;

  return {
    name: (c.name as string) || "",
    uid: formatUid(c.uid as string),
    legalForm: lfShort || lfName,
    legalSeat: (c.legalSeat as string) || "",
    address: fullAddress,
    foundingYear,
    purpose,
  };
}

function formatUid(uid: string | undefined): string {
  if (!uid) return "";
  // Format CHE-xxx.xxx.xxx if not already formatted
  const clean = uid.replace(/[^0-9]/g, "");
  if (clean.length === 9) {
    return `CHE-${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}`;
  }
  return uid;
}
