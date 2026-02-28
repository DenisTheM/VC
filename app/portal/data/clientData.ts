import { T } from "@shared/styles/tokens";

/* ------------------------------------------------------------------ */
/*  Config maps (UI display config — stays as static TypeScript)      */
/* ------------------------------------------------------------------ */

export const SEV = {
  critical: { label: "Kritisch", bg: T.redS, color: T.redD, border: T.red },
  high: { label: "Hoch", bg: T.amberS, color: T.amberD, border: T.amber },
  medium: { label: "Mittel", bg: T.accentS, color: T.accent, border: T.accent },
  info: { label: "Info", bg: T.s2, color: T.ink3, border: T.ink4 },
} as const;

export const IMPACT = {
  high: { label: "Hoch", bg: T.redS, color: T.redD },
  medium: { label: "Mittel", bg: T.amberS, color: T.amberD },
  low: { label: "Niedrig", bg: T.accentS, color: T.accent },
  none: { label: "Keine", bg: T.s2, color: T.ink3 },
} as const;

export const DOC_STATUS = {
  current: { label: "Aktuell", bg: T.accentS, color: T.accent },
  review: { label: "Review nötig", bg: T.amberS, color: T.amberD },
  draft: { label: "Entwurf", bg: T.blueS, color: T.blue },
  outdated: { label: "Veraltet", bg: T.redS, color: T.redD },
} as const;

export const FORMAT_COLORS = {
  DOCX: { bg: T.blueS, color: T.blue },
  PDF: { bg: T.redS, color: T.redD },
  PPTX: { bg: "#fff7ed", color: "#ea580c" },
  XLSX: { bg: T.accentS, color: T.accent },
} as const;

/* ------------------------------------------------------------------ */
/*  Action Status Config (offen → in_arbeit → erledigt)               */
/* ------------------------------------------------------------------ */

export const ACTION_STATUS = {
  offen: {
    label: "Offen",
    bg: T.amberS,
    color: T.amberD,
    border: T.amber,
    icon: null as string | null,
    strikethrough: false,
  },
  in_arbeit: {
    label: "In Arbeit",
    bg: T.blueS,
    color: T.blue,
    border: T.blue,
    icon: "clock" as string | null,
    strikethrough: false,
  },
  erledigt: {
    label: "Erledigt",
    bg: T.accentS,
    color: T.accent,
    border: T.accent,
    icon: "check" as string | null,
    strikethrough: true,
  },
} as const;
