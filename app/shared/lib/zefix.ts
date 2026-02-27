import { supabase } from "./supabase";

// ─── Zefix (Handelsregister) ────────────────────────────────────────

export interface ZefixResult {
  name: string;
  uid: string;
  legalForm: string;
  legalSeat: string;
  address: string;
  purpose: string | null;
  persons: { name: string; role: string }[] | null;
  foundingYear?: string | null;
}

export interface ZefixResponse {
  results: ZefixResult[];
  hint: string | null;
}

export async function searchZefix(query: string): Promise<ZefixResponse> {
  const { data, error } = await supabase.functions.invoke("zefix-lookup", {
    body: { query },
  });

  if (error) {
    console.error("Zefix lookup failed:", error);
    return { results: [], hint: "Zefix-Abfrage fehlgeschlagen." };
  }

  return data as ZefixResponse;
}
