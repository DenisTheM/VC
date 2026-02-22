import { T } from "../styles/tokens";

interface SectionLabelProps {
  text: string;
}

export function SectionLabel({ text }: SectionLabelProps) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 20, height: 1.5, background: T.accent, borderRadius: 2 }} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.accent,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          fontFamily: T.sans,
        }}
      >
        {text}
      </span>
    </div>
  );
}
