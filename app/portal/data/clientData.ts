import { T } from "@shared/styles/tokens";

/* ------------------------------------------------------------------ */
/*  Config maps (UI display config — stays as static TypeScript)      */
/* ------------------------------------------------------------------ */

export const SEV = {
  critical: { label: "Kritisch", bg: "#fef2f2", color: "#dc2626", border: "#ef4444" },
  high: { label: "Hoch", bg: "#fffbeb", color: "#d97706", border: "#f59e0b" },
  medium: { label: "Mittel", bg: T.accentS, color: T.accent, border: T.accent },
  info: { label: "Info", bg: T.s2, color: T.ink3, border: T.ink4 },
} as const;

export const IMPACT = {
  high: { label: "Hoch", bg: "#fef2f2", color: "#dc2626" },
  medium: { label: "Mittel", bg: "#fffbeb", color: "#d97706" },
  low: { label: "Niedrig", bg: T.accentS, color: T.accent },
  none: { label: "Keine", bg: T.s2, color: T.ink3 },
} as const;

export const DOC_STATUS = {
  current: { label: "Aktuell", bg: T.accentS, color: T.accent },
  review: { label: "Review nötig", bg: "#fffbeb", color: "#d97706" },
  draft: { label: "Entwurf", bg: "#eff6ff", color: "#3b82f6" },
  outdated: { label: "Veraltet", bg: "#fef2f2", color: "#dc2626" },
} as const;

export const FORMAT_COLORS = {
  DOCX: { bg: "#eff6ff", color: "#3b82f6" },
  PDF: { bg: "#fef2f2", color: "#dc2626" },
  PPTX: { bg: "#fff7ed", color: "#ea580c" },
  XLSX: { bg: T.accentS, color: T.accent },
} as const;
