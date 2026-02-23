import { useState, useEffect } from "react";
import { SectionLabel } from "@shared/components/SectionLabel";
import { Icon, icons } from "@shared/components/Icon";
import { T } from "@shared/styles/tokens";
import { DOC_TYPES } from "../data/docTypes";
import { loadDocuments, loadDocumentAuditLog, type DbDocument, type AuditEntry } from "../lib/api";

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: T.s2, color: T.ink3, label: "Entwurf" },
  review: { bg: "#fffbeb", color: "#d97706", label: "In Prüfung" },
  current: { bg: "#ecf5f1", color: "#16654e", label: "Aktuell" },
  outdated: { bg: "#fef2f2", color: "#dc2626", label: "Veraltet" },
};

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    loadDocuments()
      .then(setDocuments)
      .catch((err) => {
        console.error("Failed to load documents:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <SectionLabel text="Dokumentenverwaltung" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        Dokumente
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Alle generierten Compliance-Dokumente auf einen Blick.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
          Dokumente werden geladen...
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center", fontFamily: T.sans }}>
          <div style={{ fontSize: 14, color: T.ink3, marginBottom: 12 }}>Dokumente konnten nicht geladen werden.</div>
          <button
            onClick={load}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: "#fff",
              color: T.ink,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            Erneut versuchen
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "48px 32px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: T.accentS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon d={icons.doc} size={24} color={T.accent} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 6 }}>
            Noch keine Dokumente
          </div>
          <p style={{ fontSize: 13.5, color: T.ink3, fontFamily: T.sans, margin: 0 }}>
            Generieren Sie Ihr erstes Compliance-Dokument über den Wizard.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {documents.map((doc) => {
            const docType = DOC_TYPES[doc.doc_type];
            const status = STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft;
            const isExpanded = expanded === doc.id;
            const date = new Date(doc.created_at).toLocaleDateString("de-CH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={doc.id}
                style={{
                  background: "#fff",
                  borderRadius: T.rLg,
                  border: `1px solid ${T.border}`,
                  boxShadow: T.shSm,
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setExpanded(isExpanded ? null : doc.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 20px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: T.accentS,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon d={docType?.icon ?? icons.doc} size={18} color={T.accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                      {doc.organizations?.name && (
                        <span style={{ fontWeight: 500, color: T.ink3 }}>{doc.organizations.name} &middot; </span>
                      )}
                      {docType?.name ?? doc.doc_type} &middot; {doc.jurisdiction} &middot; {date}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 10,
                      background: status.bg,
                      color: status.color,
                      fontFamily: T.sans,
                    }}
                  >
                    {status.label}
                  </span>
                  <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{doc.version}</span>
                  <span style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-flex" }}>
                    <Icon d={icons.arrow} size={14} color={T.ink4} />
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${T.borderL}`,
                      padding: "20px 24px",
                    }}
                  >
                    {doc.content && (
                      <div style={{ maxHeight: 400, overflow: "auto", marginBottom: 16 }}>
                        <pre
                          style={{
                            fontFamily: T.sans,
                            fontSize: 13,
                            color: T.ink2,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.65,
                            margin: 0,
                          }}
                        >
                          {doc.content}
                        </pre>
                      </div>
                    )}
                    <AdminAuditTimeline docId={doc.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AdminAuditTimeline — collapsible document change log               */
/* ------------------------------------------------------------------ */

const AUDIT_COLORS: Record<string, { dot: string; text: string }> = {
  created: { dot: T.primary, text: T.primary },
  approved: { dot: T.accent, text: T.accent },
  status_changed: { dot: T.amber, text: "#92400e" },
  updated: { dot: T.ink3, text: T.ink3 },
};

function AdminAuditTimeline({ docId }: { docId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      loadDocumentAuditLog(docId)
        .then((data) => { setEntries(data); setLoaded(true); })
        .catch((err) => console.error("Audit log failed:", err))
        .finally(() => setLoading(false));
    }
  };

  return (
    <div>
      <button
        onClick={toggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: open ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 600,
          color: T.ink2,
          transition: "all 0.15s ease",
        }}
      >
        <Icon d={icons.clock} size={15} color={T.ink3} />
        Änderungsverlauf
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Icon
            d={open ? "M19 15l-7-7-7 7" : "M9 5l7 7-7 7"}
            size={12}
            color={T.ink4}
          />
        </span>
      </button>

      {open && (
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "16px 18px",
            background: "#fff",
          }}
        >
          {loading ? (
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>Wird geladen...</div>
          ) : entries.length === 0 ? (
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>Keine Einträge vorhanden.</div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 20 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 5,
                  top: 6,
                  bottom: 6,
                  width: 2,
                  background: T.borderL,
                  borderRadius: 1,
                }}
              />
              {entries.map((entry, i) => {
                const colors = AUDIT_COLORS[entry.action] ?? AUDIT_COLORS.updated;
                return (
                  <div
                    key={entry.id}
                    style={{
                      position: "relative",
                      paddingBottom: i < entries.length - 1 ? 14 : 0,
                    }}
                  >
                    {/* Dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -17,
                        top: 4,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: colors.dot,
                        border: "2px solid #fff",
                        boxShadow: `0 0 0 1px ${T.border}`,
                      }}
                    />
                    <div style={{ fontSize: 12.5, fontFamily: T.sans, color: colors.text, fontWeight: 600 }}>
                      {entry.details}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: T.sans, color: T.ink4, marginTop: 1 }}>
                      {entry.changedAt} — {entry.changedBy}
                    </div>
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
