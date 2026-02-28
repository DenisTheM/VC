// Client-side screening logic + result mapping

export interface ScreeningMatch {
  id: string;
  name: string;
  score: number;
  datasets: string[];
  schema: string;
  birthDate?: string | null;
  nationality?: string | null;
}

export interface ScreeningResult {
  id: string;
  customer_id: string;
  organization_id: string;
  screening_type: "sanctions" | "pep" | "adverse_media";
  query_name: string;
  query_date_of_birth: string | null;
  query_nationality: string | null;
  source: string;
  status: "clear" | "potential_match" | "confirmed_match" | "false_positive";
  matches: ScreeningMatch[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  screened_at: string;
}

/**
 * Map screening status to display info
 */
export function screeningStatusInfo(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "clear":
      return { label: "Keine Treffer", color: "#16a34a", bg: "#f0fdf4" };
    case "potential_match":
      return { label: "Möglicher Treffer", color: "#ea580c", bg: "#fff7ed" };
    case "confirmed_match":
      return { label: "Bestätigter Treffer", color: "#dc2626", bg: "#fef2f2" };
    case "false_positive":
      return { label: "Fehlalarm", color: "#6b7280", bg: "#f9fafb" };
    default:
      return { label: "Unbekannt", color: "#6b7280", bg: "#f9fafb" };
  }
}

/**
 * Map dataset IDs to human-readable names
 */
export function datasetName(dataset: string): string {
  const MAP: Record<string, string> = {
    "ch_seco_sanctions": "SECO Sanktionen",
    "eu_sanctions": "EU Sanktionsliste",
    "un_sc_sanctions": "UN Sanktionsliste",
    "us_ofac_sdn": "US OFAC SDN",
    "gb_hmt_sanctions": "UK HMT Sanktionen",
    "interpol_red_notices": "Interpol Red Notices",
    "worldbank_debarred": "Weltbank Sperrliste",
    "eu_peps": "EU PEP-Liste",
    "ru_nsd_isin": "Russland NSD",
    "default": "OpenSanctions",
  };
  return MAP[dataset] ?? dataset;
}

/**
 * Format match score as percentage with color
 */
export function matchScoreDisplay(score: number): { text: string; color: string } {
  const pct = Math.round(score * 100);
  if (pct >= 90) return { text: `${pct}%`, color: "#dc2626" };
  if (pct >= 80) return { text: `${pct}%`, color: "#ea580c" };
  if (pct >= 70) return { text: `${pct}%`, color: "#d97706" };
  return { text: `${pct}%`, color: "#6b7280" };
}
