import { T } from "@shared/styles/tokens";

export const SEVERITY_CFG = {
  critical: { label: "Kritisch", bg: T.redS, color: T.redD, border: T.red, icon: "\u26a0\ufe0f" },
  high: { label: "Hoch", bg: T.amberS, color: T.amberD, border: T.amber, icon: "\ud83d\udd36" },
  medium: { label: "Mittel", bg: "#f0fdf4", color: T.accent, border: T.accent, icon: "\ud83d\udd37" },
  info: { label: "Info", bg: T.s2, color: T.ink3, border: T.ink4, icon: "\u2139\ufe0f" },
} as const;

export const STATUS_CFG = {
  draft: { label: "Entwurf", bg: T.s2, color: T.ink3 },
  new: { label: "Neu", bg: T.redS, color: T.red },
  acknowledged: { label: "Gesehen", bg: T.amberS, color: T.amber },
  in_progress: { label: "In Bearbeitung", bg: T.blueS, color: T.blue },
  resolved: { label: "Erledigt", bg: T.accentS, color: T.accent },
  dismissed: { label: "Verworfen", bg: "#fafafa", color: "#a1a1aa" },
} as const;
