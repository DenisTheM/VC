import { T } from "@shared/styles/tokens";

/* ------------------------------------------------------------------ */
/*  Customer Document Status Config                                    */
/* ------------------------------------------------------------------ */

export const CUSTOMER_DOC_STATUS = {
  draft: { label: "Entwurf", bg: T.blueS, color: T.blue },
  in_review: { label: "Zur Prüfung", bg: T.amberS, color: T.amberD },
  approved: { label: "Freigegeben", bg: T.accentS, color: T.accent },
  rejected: { label: "Abgelehnt", bg: T.redS, color: T.redD },
  outdated: { label: "Veraltet", bg: T.s2, color: T.ink3 },
} as const;

export type CustomerDocStatus = keyof typeof CUSTOMER_DOC_STATUS;

/* ------------------------------------------------------------------ */
/*  Customer Risk Level Config                                         */
/* ------------------------------------------------------------------ */

export const RISK_LEVEL = {
  low: { label: "Niedrig", bg: T.accentS, color: T.accent },
  standard: { label: "Standard", bg: T.blueS, color: T.blue },
  elevated: { label: "Erhöht", bg: T.amberS, color: T.amberD },
  high: { label: "Hoch", bg: T.redS, color: T.redD },
} as const;

export type RiskLevel = keyof typeof RISK_LEVEL;

/* ------------------------------------------------------------------ */
/*  Customer Status Config                                             */
/* ------------------------------------------------------------------ */

export const CUSTOMER_STATUS = {
  active: { label: "Aktiv", bg: T.accentS, color: T.accent },
  inactive: { label: "Inaktiv", bg: T.s2, color: T.ink3 },
  archived: { label: "Archiviert", bg: T.redS, color: T.redD },
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
  open: { label: "Offen", bg: T.amberS, color: T.amberD },
  in_progress: { label: "In Bearbeitung", bg: T.blueS, color: T.blue },
  resolved: { label: "Gelöst", bg: T.accentS, color: T.accent },
} as const;

export type HelpStatus = keyof typeof HELP_STATUS;

/* ------------------------------------------------------------------ */
/*  Contact Role Config                                                */
/* ------------------------------------------------------------------ */

export const CONTACT_ROLES = [
  "Geschäftsführer",
  "Wirtschaftlich Berechtigter",
  "Kontrollinhaber",
  "Compliance Officer",
  "Zeichnungsberechtigter",
  "Verwaltungsrat",
  "Ansprechperson",
  "Andere",
] as const;

export type ContactRole = (typeof CONTACT_ROLES)[number];

/* ------------------------------------------------------------------ */
/*  Audit Action Color Config                                          */
/* ------------------------------------------------------------------ */

export const AUDIT_ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  created: { bg: T.accentS, color: T.accent },
  approved: { bg: T.accentS, color: T.accent },
  contact_added: { bg: T.accentS, color: T.accent },
  updated: { bg: T.blueS, color: T.blue },
  contact_updated: { bg: T.blueS, color: T.blue },
  submitted: { bg: T.amberS, color: T.amberD },
  status_changed: { bg: T.amberS, color: T.amberD },
  rejected: { bg: T.redS, color: T.redD },
  archived: { bg: T.redS, color: T.redD },
  deleted: { bg: T.redS, color: T.redD },
  contact_removed: { bg: T.redS, color: T.redD },
  outdated: { bg: T.s2, color: T.ink3 },
} as const;
