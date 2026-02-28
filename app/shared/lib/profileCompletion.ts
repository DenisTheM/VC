import type { ProfileFieldDef } from "@shared/data/profileFields";

/** Calculate profile completion percentage (0-100) */
export function calcProfileCompletion(
  data: Record<string, unknown> | null | undefined,
  fields: ProfileFieldDef[],
): number {
  if (!data) return 0;
  const required = fields.filter((f) => f.required !== false);
  if (required.length === 0) return 100;

  let filled = 0;
  for (const f of required) {
    const v = data[f.id];
    if (v !== undefined && v !== "" && v !== null && !(Array.isArray(v) && v.length === 0)) {
      filled++;
    }
  }
  return Math.round((filled / required.length) * 100);
}

/** Return color for a completion percentage */
export function completionColor(pct: number): { bg: string; color: string; label: string } {
  if (pct >= 80) return { bg: "#ecf5f1", color: "#16654e", label: "Gut" };
  if (pct >= 50) return { bg: "#fffbeb", color: "#d97706", label: "Unvollständig" };
  return { bg: "#fef2f2", color: "#dc2626", label: "Lückenhaft" };
}
