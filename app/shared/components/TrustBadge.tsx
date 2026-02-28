import { T } from "@shared/styles/tokens";

export function TrustBadge() {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: 20,
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: 600,
        color: "#166534",
        fontFamily: T.sans,
        letterSpacing: "0.2px",
      }}
    >
      <span style={{ fontSize: 14 }}>{"\u{1F1E8}\u{1F1ED}"}</span>
      Daten in der Schweiz
    </div>
  );
}
