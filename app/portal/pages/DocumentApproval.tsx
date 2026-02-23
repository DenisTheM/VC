import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { loadClientDocuments, approveDocument, type ClientOrg, type PortalDoc } from "../lib/api";
import { MarkdownContent } from "@shared/components/MarkdownContent";
import { exportDocumentAsPdf } from "@shared/lib/pdfExport";

interface DocumentApprovalProps {
  org: ClientOrg | null;
}

export function DocumentApproval({ org }: DocumentApprovalProps) {
  const [docs, setDocs] = useState<PortalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PortalDoc | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = () => {
    if (!org) return;
    setLoading(true);
    setError(false);
    loadClientDocuments(org.id)
      .then((all) => setDocs(all.filter((d) => d.status === "review")))
      .catch((err) => {
        console.error("Failed to load documents:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [org]);

  const handleApprove = async (doc: PortalDoc) => {
    if (!window.confirm(`Ich habe das Dokument "${doc.name}" geprüft und gebe es hiermit frei.`)) return;
    setApprovingId(doc.id);
    try {
      await approveDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    } catch (err) {
      console.error("Failed to approve document:", err);
      alert(err instanceof Error ? err.message : "Freigabe fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setApprovingId(null);
    }
  };

  if (!org) {
    return (
      <div style={{ padding: "40px 48px", color: T.ink3, fontFamily: T.sans }}>
        Organisation wird geladen...
      </div>
    );
  }

  /* -- Detail view --------------------------------------------------- */
  if (selectedDoc) {
    return (
      <div style={{ padding: "40px 48px", maxWidth: 960 }}>
        <button
          onClick={() => setSelectedDoc(null)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: T.ink3,
            fontSize: 13,
            fontFamily: T.sans,
            cursor: "pointer",
            padding: 0,
            marginBottom: 20,
          }}
        >
          <Icon d={icons.back} size={16} color={T.ink3} />
          Zurück zu Freigaben
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#d97706", background: "#fffbeb", padding: "3px 10px", borderRadius: 6, fontFamily: T.sans, border: "1px solid #d9770622" }}>
            Freigabe ausstehend
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          {selectedDoc.name}
        </h1>
        <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
          Version {selectedDoc.version} · {selectedDoc.updatedAt}
        </p>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              Rechtsgrundlage
            </div>
            <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans, lineHeight: 1.5 }}>
              {selectedDoc.legalBasis || "—"}
            </div>
          </div>
          <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              Umfang
            </div>
            <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>
              {selectedDoc.pages} Seiten ({selectedDoc.format})
            </div>
          </div>
        </div>

        {/* Document content */}
        {selectedDoc.content && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                maxHeight: 600,
                overflow: "auto",
                background: "#fff",
                borderRadius: T.r,
                border: `1px solid ${T.border}`,
                padding: "28px 32px",
              }}
            >
              <MarkdownContent content={selectedDoc.content!} />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => handleApprove(selectedDoc)}
            disabled={approvingId === selectedDoc.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: T.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: approvingId === selectedDoc.id ? "wait" : "pointer",
              fontFamily: T.sans,
              opacity: approvingId === selectedDoc.id ? 0.6 : 1,
            }}
          >
            <Icon d={icons.check} size={14} color="#fff" />
            {approvingId === selectedDoc.id ? "Wird freigegeben..." : "Dokument freigeben"}
          </button>
          {selectedDoc.content && (
            <button
              onClick={() => {
                exportDocumentAsPdf({
                  name: selectedDoc.name,
                  version: selectedDoc.version,
                  content: selectedDoc.content!,
                  legalBasis: selectedDoc.legalBasis || undefined,
                  orgName: org?.name || undefined,
                });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
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
              <Icon d={icons.download} size={14} color={T.ink3} />
              PDF Download
            </button>
          )}
        </div>
      </div>
    );
  }

  /* -- List view ------------------------------------------------------ */
  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Freigaben" />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
        Dokument-Freigaben
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Prüfen und geben Sie neue Compliance-Dokumente für {org.short_name || org.name} frei.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
          Dokumente werden geladen...
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center", fontFamily: T.sans }}>
          <div style={{ fontSize: 14, color: T.ink3, marginBottom: 12 }}>Dokumente konnten nicht geladen werden.</div>
          <button onClick={load} style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
            Erneut versuchen
          </button>
        </div>
      ) : docs.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "48px 32px",
            border: `1px solid ${T.border}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ecf5f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon d={icons.check} size={24} color="#16654e" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 6 }}>
            Keine ausstehenden Freigaben
          </div>
          <p style={{ fontSize: 13.5, color: T.ink3, fontFamily: T.sans, margin: 0 }}>
            Alle Dokumente sind freigegeben. Neue Dokumente erscheinen hier automatisch.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "18px 22px",
                border: `1px solid ${T.border}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#fffbeb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon d={icons.doc} size={18} color="#d97706" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                  Version {doc.version} · {doc.updatedAt}
                </div>
              </div>

              {/* Approve button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleApprove(doc); }}
                disabled={approvingId === doc.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: approvingId === doc.id ? "wait" : "pointer",
                  fontFamily: T.sans,
                  opacity: approvingId === doc.id ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                <Icon d={icons.check} size={12} color="#fff" />
                {approvingId === doc.id ? "..." : "Freigeben"}
              </button>

              <Icon d={icons.arrow} size={14} color={T.ink4} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
