import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { Field } from "@shared/components/Field";
import { PROFILE_FIELDS } from "../data/profileFields";
import { loadDocumentsByOrg, type DbDocument } from "../lib/api";
import { DOC_TYPES } from "../data/docTypes";

interface ProfilePageProps {
  profile: Record<string, unknown>;
  setProfile: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  onSave: () => Promise<void>;
  saving: boolean;
  orgId: string | null;
  orgName?: string;
  onBack?: () => void;
  onGenerate?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: T.s2, color: T.ink3, label: "Entwurf" },
  review: { bg: "#fffbeb", color: "#d97706", label: "In Prüfung" },
  current: { bg: "#ecf5f1", color: "#16654e", label: "Aktuell" },
  outdated: { bg: "#fef2f2", color: "#dc2626", label: "Veraltet" },
};

export function ProfilePage({ profile, setProfile, onSave, saving, orgId, orgName, onBack, onGenerate }: ProfilePageProps) {
  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setDocsLoading(true);
    loadDocumentsByOrg(orgId)
      .then(setDocs)
      .catch((err) => console.error("Failed to load documents:", err))
      .finally(() => setDocsLoading(false));
  }, [orgId]);

  const required = PROFILE_FIELDS.filter((f) => f.required !== false);
  const filled = required.filter((f) => {
    const v = profile[f.id];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  const pct = required.length > 0 ? Math.round((filled.length / required.length) * 100) : 0;

  // Group fields by section
  const sections: Record<string, typeof PROFILE_FIELDS> = {};
  PROFILE_FIELDS.forEach((f) => {
    if (!sections[f.section]) sections[f.section] = [];
    sections[f.section].push(f);
  });

  return (
    <div>
      <SectionLabel text="Ebene A" />
      {onBack && (
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: T.ink3,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: T.sans,
            padding: 0,
            marginBottom: 12,
          }}
        >
          <Icon d={icons.back} size={14} color={T.ink3} />
          Alle Kunden
        </button>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 28,
            fontWeight: 700,
            color: T.ink,
            margin: 0,
          }}
        >
          {orgName ? `${orgName}` : "Firmenprofil"}
        </h1>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: pct === 100 ? T.accent : T.amber,
            fontFamily: T.sans,
          }}
        >
          {pct}% vollständig
        </span>
      </div>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 20px" }}>
        Diese Angaben fliessen in jedes generierte Dokument ein. Je vollständiger, desto präziser.
      </p>

      {/* Save button + Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.s2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 3,
              background: pct === 100 ? T.accent : T.amber,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: T.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: T.sans,
            opacity: saving ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {saving ? "Speichern..." : "Profil speichern"}
        </button>
      </div>

      {/* Sections */}
      {Object.entries(sections).map(([sectionName, fields]) => (
        <div
          key={sectionName}
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 26px 10px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              fontFamily: T.sans,
              marginBottom: 18,
              paddingBottom: 10,
              borderBottom: `1px solid ${T.borderL}`,
            }}
          >
            {sectionName}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 20px",
            }}
          >
            {fields.map((f) => (
              <div
                key={f.id}
                style={f.type === "textarea" || f.type === "multi" ? { gridColumn: "1 / -1" } : undefined}
              >
                <Field
                  field={f}
                  value={profile[f.id]}
                  onChange={(v) =>
                    setProfile((prev) => ({ ...prev, [f.id]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Documents for this client */}
      {orgId && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
              Dokumente {orgName ? `für ${orgName}` : ""}
            </div>
            {onGenerate && (
              <button
                onClick={onGenerate}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: T.sans,
                }}
              >
                <Icon d={icons.plus} size={14} color="#fff" />
                Dokument generieren
              </button>
            )}
          </div>

          {docsLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: T.ink3, fontFamily: T.sans, fontSize: 13 }}>
              Dokumente werden geladen...
            </div>
          ) : docs.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: T.rLg,
                padding: "32px 24px",
                border: `1px solid ${T.border}`,
                boxShadow: T.shSm,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13.5, color: T.ink3, fontFamily: T.sans }}>
                Noch keine Dokumente für diesen Kunden.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                borderRadius: T.rLg,
                border: `1px solid ${T.border}`,
                boxShadow: T.shSm,
                overflow: "hidden",
              }}
            >
              {docs.map((doc, i) => {
                const docType = DOC_TYPES[doc.doc_type];
                const status = STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft;
                const date = new Date(doc.created_at).toLocaleDateString("de-CH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderTop: i > 0 ? `1px solid ${T.borderL}` : undefined,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 7,
                        background: T.accentS,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon d={docType?.icon ?? icons.doc} size={15} color={T.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 1 }}>
                        {docType?.name ?? doc.doc_type} &middot; {doc.jurisdiction} &middot; {date}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: status.bg,
                        color: status.color,
                        fontFamily: T.sans,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
