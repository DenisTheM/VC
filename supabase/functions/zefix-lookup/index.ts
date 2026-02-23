import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZEFIX_API = "https://www.zefix.ch/ZefixREST/api/v1";

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

    // Step 1: Search by name (public zefix.ch API — no auth required)
    const searchRes = await fetch(`${ZEFIX_API}/firm/search.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        name: query.trim(),
        languageKey: "de",
        maxEntries: 10,
      }),
    });

    if (!searchRes.ok) {
      return json({
        results: [],
        hint: `Zefix-API nicht erreichbar (Status ${searchRes.status}).`,
      });
    }

    const searchData = await searchRes.json();
    const list = searchData?.list;
    if (!Array.isArray(list) || list.length === 0) {
      return json({ results: [], hint: null });
    }

    // Step 2: For top results, fetch details (max 8 to avoid rate limiting)
    const topResults = list.slice(0, 8);
    const detailed = await Promise.all(
      topResults.map(async (company: Record<string, unknown>) => {
        try {
          const ehraid = company.ehraid as number;
          if (!ehraid) return mapSearchResult(company);

          const detailRes = await fetch(`${ZEFIX_API}/firm/${ehraid}`, {
            headers: { "Accept": "application/json" },
          });

          if (!detailRes.ok) return mapSearchResult(company);

          const detail = await detailRes.json();
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

// Legal form ID → short name mapping (common Swiss legal forms)
const LEGAL_FORMS: Record<number, string> = {
  1: "EF", // Einzelfirma
  2: "KlG", // Kollektivgesellschaft
  3: "KmG", // Kommanditgesellschaft
  4: "GmbH",
  6: "AG",
  7: "KmAG", // Kommanditaktiengesellschaft
  8: "Gen", // Genossenschaft
  9: "Verein",
  10: "Stiftung",
  15: "FI KmG", // Kommanditgesellschaft für KAG
  16: "FI SICAV", // SICAV
  17: "FI SICAF", // SICAF
  21: "Inst öR", // Institut des öffentlichen Rechts
};

// Map search-only result (fallback if detail fetch fails)
function mapSearchResult(c: Record<string, unknown>) {
  return {
    name: (c.name as string) || "",
    uid: (c.uidFormatted as string) || formatUid(c.uid as string),
    legalForm: LEGAL_FORMS[c.legalFormId as number] || "",
    legalSeat: (c.legalSeat as string) || "",
    address: (c.legalSeat as string) || "",
    foundingYear: extractYear(c.shabDate as string),
    purpose: null,
  };
}

// Map detailed result with full address and purpose
function mapDetailResult(c: Record<string, unknown>) {
  if (!c) return null;

  // Build address
  const addr = c.address as Record<string, unknown> | undefined;
  let fullAddress = "";
  if (addr) {
    const street = [addr.street, addr.houseNumber ? ` ${addr.houseNumber}` : ""]
      .join("")
      .trim();
    const city = [addr.swissZipCode, addr.town].filter(Boolean).join(" ");
    fullAddress = [street, city].filter(Boolean).join(", ");
  }
  if (!fullAddress) {
    fullAddress = (c.legalSeat as string) || "";
  }

  return {
    name: (c.name as string) || "",
    uid: (c.uidFormatted as string) || formatUid(c.uid as string),
    legalForm: LEGAL_FORMS[c.legalFormId as number] || "",
    legalSeat: (c.legalSeat as string) || "",
    address: fullAddress,
    foundingYear: extractYear(c.shabDate as string),
    purpose: (c.purpose as string) || null,
  };
}

function formatUid(uid: string | undefined): string {
  if (!uid) return "";
  const clean = uid.replace(/[^0-9]/g, "");
  if (clean.length === 9) {
    return `CHE-${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}`;
  }
  return uid;
}

function extractYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.substring(0, 4), 10);
  return year > 1800 && year <= new Date().getFullYear() ? year : null;
}
