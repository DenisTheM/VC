// FATF/SECO high-risk and monitored countries
// Sources: FATF High-Risk Jurisdictions, SECO Sanction Lists
// Last updated: 2026-02

/** Risk level for a country: 0-100 */
export interface CountryRisk {
  code: string;
  name: string;
  risk: number;
  category: "high" | "elevated" | "standard" | "low";
  lists: string[]; // FATF, SECO, EU, UN
}

// FATF high-risk (call for action)
export const FATF_HIGH_RISK: Record<string, number> = {
  IR: 90, // Iran
  KP: 95, // North Korea
  MM: 85, // Myanmar
};

// FATF increased monitoring (grey list)
export const FATF_GREY_LIST: Record<string, number> = {
  SY: 85, // Syria
  AF: 80, // Afghanistan
  YE: 75, // Yemen
  LY: 75, // Libya
  SD: 75, // Sudan
  SO: 80, // Somalia
  IQ: 70, // Iraq
  VE: 65, // Venezuela
  NI: 60, // Nicaragua
  PK: 60, // Pakistan
  HT: 65, // Haiti
  KH: 55, // Cambodia
  ML: 60, // Mali
  GW: 60, // Guinea-Bissau
  MZ: 55, // Mozambique
  UG: 55, // Uganda
  ZW: 55, // Zimbabwe
  CD: 65, // DR Congo
  CF: 65, // Central African Republic
  SS: 70, // South Sudan
  BF: 55, // Burkina Faso
  TD: 55, // Chad
  NG: 50, // Nigeria
  TZ: 45, // Tanzania
  JO: 40, // Jordan
  PH: 45, // Philippines
  TT: 40, // Trinidad and Tobago
  VN: 40, // Vietnam
  AL: 40, // Albania
  BB: 35, // Barbados
  BG: 35, // Bulgaria
  BJ: 40, // Benin
  CM: 45, // Cameroon
  GH: 40, // Ghana
  HR: 30, // Croatia
  MC: 30, // Monaco
  SN: 35, // Senegal
  ZA: 35, // South Africa
};

// SECO-specific sanctions list additions
export const SECO_SANCTIONS: Record<string, number> = {
  BY: 60, // Belarus
  RU: 65, // Russia
  CU: 55, // Cuba
  ER: 55, // Eritrea
  LB: 50, // Lebanon
};

// Low-risk countries (FATF members / EEA / Schweiz)
export const LOW_RISK_COUNTRIES: string[] = [
  "CH", "DE", "AT", "FR", "IT", "GB", "US", "CA", "JP", "AU", "NZ",
  "SE", "NO", "DK", "FI", "NL", "BE", "LU", "IE", "ES", "PT",
  "SG", "HK", "KR", "IL", "IS", "LI", "EE", "CZ", "PL", "SI",
  "SK", "LT", "LV", "MT", "CY",
];

/**
 * Get risk score for a country by ISO 2 code.
 * Returns 0-100 where higher = riskier.
 * Falls back to 30 (standard) for unknown countries.
 */
export function getCountryRisk(
  countryCode: string,
  customMap?: Record<string, number>,
): number {
  const code = countryCode.toUpperCase();

  // Custom map takes priority
  if (customMap && code in customMap) return customMap[code];

  // FATF high-risk
  if (code in FATF_HIGH_RISK) return FATF_HIGH_RISK[code];

  // SECO sanctions
  if (code in SECO_SANCTIONS) return SECO_SANCTIONS[code];

  // FATF grey list
  if (code in FATF_GREY_LIST) return FATF_GREY_LIST[code];

  // Low-risk countries
  if (LOW_RISK_COUNTRIES.includes(code)) return 10;

  // Default: standard risk
  return 30;
}

/**
 * Map risk score to category label
 */
export function riskCategory(score: number): "low" | "standard" | "elevated" | "high" {
  if (score <= 25) return "low";
  if (score <= 50) return "standard";
  if (score <= 75) return "elevated";
  return "high";
}

/**
 * Map risk level to display color
 */
export function riskColor(level: string): string {
  switch (level) {
    case "low": return "#16a34a";
    case "standard": return "#ca8a04";
    case "elevated": return "#ea580c";
    case "high": return "#dc2626";
    default: return "#6b7280";
  }
}

/**
 * Map risk level to background color
 */
export function riskBg(level: string): string {
  switch (level) {
    case "low": return "#f0fdf4";
    case "standard": return "#fefce8";
    case "elevated": return "#fff7ed";
    case "high": return "#fef2f2";
    default: return "#f9fafb";
  }
}

/**
 * Map risk level to German label
 */
export function riskLabel(level: string): string {
  switch (level) {
    case "low": return "Tief";
    case "standard": return "Standard";
    case "elevated": return "Erhöht";
    case "high": return "Hoch";
    default: return "Unbekannt";
  }
}
