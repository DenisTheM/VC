import { T } from "../styles/tokens";
import { Icon, icons } from "./Icon";

export interface FieldDef {
  id: string;
  label: string;
  type: "text" | "select" | "multi" | "toggle" | "textarea" | "number" | "date";
  options?: string[];
  required?: boolean;
  hint?: string;
  default?: string | number | boolean | string[];
  placeholder?: string;
}

interface FieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  highlight?: boolean;
}

export function Field({ field, value, onChange, highlight }: FieldProps) {
  const base: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: T.r,
    border: `1px solid ${highlight ? T.amber : T.border}`,
    fontSize: 14,
    fontFamily: T.sans,
    color: T.ink,
    outline: "none",
    background: highlight ? T.amberS : "#fff",
    boxSizing: "border-box",
  };

  const lbl = (
    <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
      {field.label}
      {field.required === false && <span style={{ fontWeight: 400, color: T.ink4 }}> (optional)</span>}
    </label>
  );

  const hnt = field.hint ? (
    <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 4, fontFamily: T.sans }}>
      &darr; {field.hint}
    </div>
  ) : null;

  if (field.type === "select") {
    return (
      <div style={{ marginBottom: 16 }}>
        {lbl}
        <select value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} style={{ ...base, cursor: "pointer" }}>
          <option value="">-- Bitte wählen --</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {hnt}
      </div>
    );
  }

  if (field.type === "multi") {
    const selected = (value as string[]) || [];
    return (
      <div style={{ marginBottom: 16 }}>
        {lbl}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, ...(highlight ? { padding: 8, borderRadius: T.r, border: `1px solid ${T.amber}`, background: T.amberS } : {}) }}>
          {field.options?.map((o) => {
            const sel = selected.includes(o);
            return (
              <button
                key={o}
                onClick={() => onChange(sel ? selected.filter((x) => x !== o) : [...selected, o])}
                style={{
                  padding: "6px 13px",
                  borderRadius: 20,
                  border: `1px solid ${sel ? T.accent : T.border}`,
                  background: sel ? T.accentS : "#fff",
                  color: sel ? T.accent : T.ink3,
                  fontSize: 12.5,
                  fontWeight: sel ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: T.sans,
                  transition: "all 0.15s",
                }}
              >
                {sel && <Icon d={icons.check} size={12} color={T.accent} />}
                {sel && " "}
                {o}
              </button>
            );
          })}
        </div>
        {hnt}
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <div style={{ marginBottom: 16 }}>
        {lbl}
        <div style={{ display: "flex", gap: 8, ...(highlight ? { padding: 8, borderRadius: T.r, border: `1px solid ${T.amber}`, background: T.amberS } : {}) }}>
          {["Ja", "Nein"].map((o) => {
            const sel = (value === true && o === "Ja") || (value === false && o === "Nein");
            return (
              <button
                key={o}
                onClick={() => onChange(o === "Ja")}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: `1px solid ${sel ? T.accent : T.border}`,
                  background: sel ? T.accentS : "#fff",
                  color: sel ? T.accent : T.ink3,
                  fontSize: 13,
                  fontWeight: sel ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: T.sans,
                  transition: "all 0.15s",
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
        {hnt}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div style={{ marginBottom: 16 }}>
        {lbl}
        <textarea value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.placeholder} style={{ ...base, resize: "vertical" }} />
        {hnt}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div style={{ marginBottom: 16 }}>
        {lbl}
        <input type="number" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} style={base} />
        {hnt}
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div style={{ marginBottom: 16 }}>
        {lbl}
        <input type="date" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} style={base} />
        {hnt}
      </div>
    );
  }

  // Default: text
  return (
    <div style={{ marginBottom: 16 }}>
      {lbl}
      <input type="text" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} style={base} />
      {hnt}
    </div>
  );
}
