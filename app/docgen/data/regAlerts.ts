import { T } from "@shared/styles/tokens";

export const SEVERITY_CFG = {
  critical: { label: "Kritisch", bg: "#fef2f2", color: "#dc2626", border: "#ef4444", icon: "\u26a0\ufe0f" },
  high: { label: "Hoch", bg: "#fffbeb", color: "#d97706", border: "#f59e0b", icon: "\ud83d\udd36" },
  medium: { label: "Mittel", bg: "#f0fdf4", color: "#16654e", border: "#16654e", icon: "\ud83d\udd37" },
  info: { label: "Info", bg: T.s2, color: T.ink3, border: T.ink4, icon: "\u2139\ufe0f" },
} as const;

export const STATUS_CFG = {
  draft: { label: "Entwurf", bg: "#f3f4f6", color: "#6b7280" },
  new: { label: "Neu", bg: "#fef2f2", color: "#ef4444" },
  acknowledged: { label: "Gesehen", bg: "#fffbeb", color: "#f59e0b" },
  in_progress: { label: "In Bearbeitung", bg: "#eff6ff", color: "#3b82f6" },
  resolved: { label: "Erledigt", bg: "#ecf5f1", color: "#16654e" },
  dismissed: { label: "Verworfen", bg: "#fafafa", color: "#a1a1aa" },
} as const;
