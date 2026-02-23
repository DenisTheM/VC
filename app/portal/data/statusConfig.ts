import { T } from "@shared/styles/tokens";

/* ------------------------------------------------------------------ */
/*  Customer Document Status Config                                    */
/* ------------------------------------------------------------------ */

export const CUSTOMER_DOC_STATUS = {
  draft: { label: "Entwurf", bg: "#eff6ff", color: "#3b82f6" },
  in_review: { label: "Zur Prüfung", bg: "#fffbeb", color: "#d97706" },
  approved: { label: "Freigegeben", bg: T.accentS, color: T.accent },
  rejected: { label: "Abgelehnt", bg: "#fef2f2", color: "#dc2626" },
  outdated: { label: "Veraltet", bg: T.s2, color: T.ink3 },
} as const;

export type CustomerDocStatus = keyof typeof CUSTOMER_DOC_STATUS;

/* ------------------------------------------------------------------ */
/*  Customer Risk Level Config                                         */
/* ------------------------------------------------------------------ */

export const RISK_LEVEL = {
  low: { label: "Niedrig", bg: T.accentS, color: T.accent },
  standard: { label: "Standard", bg: "#eff6ff", color: "#3b82f6" },
  elevated: { label: "Erhöht", bg: "#fffbeb", color: "#d97706" },
  high: { label: "Hoch", bg: "#fef2f2", color: "#dc2626" },
} as const;

export type RiskLevel = keyof typeof RISK_LEVEL;

/* ------------------------------------------------------------------ */
/*  Customer Status Config                                             */
/* ------------------------------------------------------------------ */

export const CUSTOMER_STATUS = {
  active: { label: "Aktiv", bg: T.accentS, color: T.accent },
  inactive: { label: "Inaktiv", bg: T.s2, color: T.ink3 },
  archived: { label: "Archiviert", bg: "#fef2f2", color: "#dc2626" },
} as const;

export type CustomerStatus = keyof typeof CUSTOMER_STATUS;

/* ------------------------------------------------------------------ */
/*  Customer Type Config                                               */
/* ------------------------------------------------------------------ */

export const CUSTOMER_TYPE = {
  natural_person: { label: "Natürliche Person", short: "NP" },
  legal_entity: { label: "Juristische Person", short: "JP" },
} as const;

export type CustomerType = keyof typeof CUSTOMER_TYPE;

/* ------------------------------------------------------------------ */
/*  Help Request Status Config                                         */
/* ------------------------------------------------------------------ */

export const HELP_STATUS = {
  open: { label: "Offen", bg: "#fffbeb", color: "#d97706" },
  in_progress: { label: "In Bearbeitung", bg: "#eff6ff", color: "#3b82f6" },
  resolved: { label: "Gelöst", bg: T.accentS, color: T.accent },
} as const;

export type HelpStatus = keyof typeof HELP_STATUS;
