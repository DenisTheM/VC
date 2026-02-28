/** Design tokens matching virtue-compliance.ch (styles/tokens.css) */
export const T = {
  ink: "#111827",
  ink2: "#374151",
  ink3: "#6b7280",
  ink4: "#9ca3af",
  s0: "#ffffff",
  s1: "#f9fafb",
  s2: "#f3f4f6",
  border: "#e5e7eb",
  borderL: "#f0f1f3",
  primary: "#1e3a5f",
  primaryDeep: "#132a47",
  accent: "#16654e",
  accentS: "#ecf5f1",
  glow: "#6ee7b7",
  amber: "#f59e0b",
  amberS: "#fffbeb",
  red: "#ef4444",
  redS: "#fef2f2",
  r: "10px",
  rLg: "16px",
  shSm: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
  shMd: "0 4px 20px rgba(0,0,0,0.06)",
  shLg: "0 10px 40px rgba(0,0,0,0.08)",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",

  // Typography scale
  fs: {
    xs: 11,
    sm: 13,
    md: 14.5,
    lg: 18,
    xl: 24,
    xxl: 28,
  },

  // Spacing scale
  sp: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;
