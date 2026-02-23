import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { DOC_STATUS, FORMAT_COLORS, SEV } from "../data/clientData";
import { loadClientDocuments, approveDocument, loadDocumentAuditLog, loadDocAlerts, type ClientOrg, type PortalDoc, type AuditEntry, type LinkedAlert } from "../lib/api";
import { exportDocumentAsPdf } from "@shared/lib/pdfExport";

interface ClientDocsProps {
  org: ClientOrg | null;
  initialDocName?: string | null;
  onDocConsumed?: () => void;
  onAlertNav?: (alertId: string) => void;
}

type StatusFilter = "all" | PortalDoc["status"];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "current", label: "Aktuell" },
  { key: "review", label: "Review nötig" },
  { key: "draft", label: "Entwurf" },
  { key: "outdated", label: "Veraltet" },
];

function downloadDoc(doc: PortalDoc, orgName?: string) {
  if (!doc.content) return;
  exportDocumentAsPdf({
    name: doc.name,
    version: doc.version,
    content: doc.content,
    legalBasis: doc.legalBasis,
    orgName: orgName,
  });
}

export function ClientDocs({ org, initialDocName, onDocConsumed, onAlertNav }: ClientDocsProps) {
  const [docs, setDocs] = useState<PortalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [selectedDoc, setSelectedDoc] = useState<PortalDoc | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showAlertOnly, setShowAlertOnly] = useState(false);

  const orgShort = org?.short_name || org?.name || "Ihr Unternehmen";

  const load = () => {
    if (!org) return;
    setLoading(true);
    setError(false);
    loadClientDocuments(org.id)
      .then(setDocs)
      .catch((err) => {
        console.error("Failed to load client docs:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [org]);

  // Deep-link: auto-select document when navigated from alerts
  useEffect(() => {
    if (initialDocName && docs.length > 0 && !selectedDoc) {
      const match = docs.find((d) => d.name === initialDocName);
      if (match) {
        setSelectedDoc(match);
        onDocConsumed?.();
      }
    }
  }, [initialDocName, docs]);

  /* -- Derived data ------------------------------------------------ */
  const categories = [...new Set(docs.map((d) => d.category))];

  const statusCounts: Record<string, number> = {
    all: docs.length,
    current: docs.filter((d) => d.status === "current").length,
    review: docs.filter((d) => d.status === "review").length,
    draft: docs.filter((d) => d.status === "draft").length,
    outdated: docs.filter((d) => d.status === "outdated").length,
  };

  const filtered = docs.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || d.category === activeCategory;
    const matchStatus = activeStatus === "all" || d.status === activeStatus;
    const matchAlert = !showAlertOnly || !!d.alert;
    return matchSearch && matchCat && matchStatus && matchAlert;
  });

  const grouped = categories
    .map((cat) => ({
      category: cat,
      docs: filtered.filter((d) => d.category === cat),
    }))
    .filter((g) => g.docs.length > 0);

  const totalDocs = docs.length;
  const currentCount = docs.filter((d) => d.status === "current").length;
  const reviewCount = docs.filter((d) => d.status === "review" || d.status === "draft").length;
  const alertCount = docs.filter((d) => d.alert).length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Dokumente werden geladen...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", fontFamily: T.sans }}>
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
    );
  }

  /* -- Detail view ------------------------------------------------- */
  if (selectedDoc) {
    return (
      <DocDetail
        doc={selectedDoc}
        org={org}
        approvingId={approvingId}
        onBack={() => setSelectedDoc(null)}
        onAlertNav={onAlertNav}
        onApprove={async (doc) => {
          if (!window.confirm("Ich habe das Dokument «" + doc.name + "» geprüft und gebe es hiermit frei.")) return;
          setApprovingId(doc.id);
          try {
            await approveDocument(doc.id);
            const now = new Date().toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
            const updated = { ...doc, status: "current" as const, approvedAt: now, updatedAt: now };
            setDocs((prev) => prev.map((d) => d.id === doc.id ? updated : d));
            setSelectedDoc(updated);
          } catch (err) {
            console.error("Failed to approve document:", err);
            alert(err instanceof Error ? err.message : "Freigabe fehlgeschlagen. Bitte versuchen Sie es erneut.");
          } finally {
            setApprovingId(null);
          }
        }}
      />
    );
  }

  /* -- List view --------------------------------------------------- */
  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Dokumentation" />

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: T.ink,
          fontFamily: T.sans,
          margin: "0 0 4px",
          letterSpacing: "-0.4px",
        }}
      >
        Ihre Dokumente
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Alle Compliance-Dokumente für {orgShort}, erstellt und gepflegt von Elena Hartmann.
      </p>

      {/* Stats bar — clickable as quick-filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatCard
          count={totalDocs}
          label="Dokumente"
          bg={T.s1}
          color={T.ink}
          borderColor={T.border}
          active={activeStatus === "all"}
          onClick={() => setActiveStatus("all")}
        />
        <StatCard
          count={currentCount}
          label="Aktuell"
          bg={T.accentS}
          color={T.accent}
          active={activeStatus === "current"}
          onClick={() => setActiveStatus(activeStatus === "current" ? "all" : "current")}
        />
        <StatCard
          count={reviewCount}
          label="Review nötig"
          bg="#fffbeb"
          color="#d97706"
          active={activeStatus === "review"}
          onClick={() => setActiveStatus(activeStatus === "review" ? "all" : "review")}
        />
        {alertCount > 0 && (
          <StatCard
            count={alertCount}
            label="Mit Hinweisen"
            bg="#fef2f2"
            color="#dc2626"
            active={showAlertOnly}
            onClick={() => setShowAlertOnly(!showAlertOnly)}
          />
        )}
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          borderRadius: T.r,
          border: `1px solid ${T.border}`,
          padding: "10px 14px",
          marginBottom: 16,
        }}
      >
        <Icon d={icons.search} size={16} color={T.ink4} />
        <input
          type="text"
          placeholder="Dokument suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            fontSize: 13.5,
            fontFamily: T.sans,
            color: T.ink,
            background: "transparent",
            width: "100%",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
          >
            <Icon d="M6 18L18 6M6 6l12 12" size={14} color={T.ink4} />
          </button>
        )}
      </div>

      {/* Filter bar: Status + Kategorie */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {/* Status filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 52 }}>
            Status
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {STATUS_FILTERS.map((f) => {
              const isActive = activeStatus === f.key;
              const count = statusCounts[f.key] ?? 0;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveStatus(isActive && f.key !== "all" ? "all" : f.key)}
                  style={{
                    background: isActive ? T.primaryDeep : "#fff",
                    color: isActive ? "#fff" : T.ink3,
                    border: `1px solid ${isActive ? T.primaryDeep : T.border}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: T.sans,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.label}
                  {f.key !== "all" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: isActive ? "rgba(255,255,255,0.2)" : T.s2,
                        color: isActive ? "rgba(255,255,255,0.85)" : T.ink4,
                        borderRadius: 4,
                        padding: "1px 5px",
                        minWidth: 18,
                        textAlign: "center",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 52 }}>
              Bereich
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button
                onClick={() => setActiveCategory(null)}
                style={{
                  background: !activeCategory ? T.primaryDeep : "#fff",
                  color: !activeCategory ? "#fff" : T.ink3,
                  border: `1px solid ${!activeCategory ? T.primaryDeep : T.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                Alle
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  style={{
                    background: activeCategory === cat ? T.primaryDeep : "#fff",
                    color: activeCategory === cat ? "#fff" : T.ink3,
                    border: `1px solid ${activeCategory === cat ? T.primaryDeep : T.border}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: T.sans,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active filters summary */}
      {(activeStatus !== "all" || activeCategory || search) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
            {filtered.length} {filtered.length === 1 ? "Dokument" : "Dokumente"} gefunden
          </span>
          <button
            onClick={() => { setActiveStatus("all"); setActiveCategory(null); setSearch(""); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              color: T.accent,
              fontWeight: 600,
              fontFamily: T.sans,
              padding: 0,
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Grouped document list */}
      {grouped.length === 0 ? (
        <div
          style={{
            padding: "48px 40px",
            textAlign: "center",
            color: T.ink3,
            fontFamily: T.sans,
            background: "#fff",
            borderRadius: T.rLg,
            border: `1px solid ${T.border}`,
          }}
        >
          <Icon d={icons.doc} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine Dokumente gefunden.</div>
          <div style={{ fontSize: 12.5, color: T.ink4, marginTop: 4 }}>Versuchen Sie andere Filter oder Suchbegriffe.</div>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.category} style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.ink3,
                fontFamily: T.sans,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon d={icons.folder} size={16} color={T.ink4} />
              {group.category}
              <span style={{ fontSize: 11, fontWeight: 500, color: T.ink4 }}>({group.docs.length})</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.docs.map((doc) => {
                const st = DOC_STATUS[doc.status] ?? DOC_STATUS.draft;
                const fmt = FORMAT_COLORS[doc.format] ?? FORMAT_COLORS.DOCX;

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{
                      background: "#fff",
                      borderRadius: T.r,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${st.color}`,
                      boxShadow: T.shSm,
                      cursor: "pointer",
                      transition: "box-shadow 0.15s, transform 0.15s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      {/* Format badge */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: fmt.color,
                          background: fmt.bg,
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontFamily: T.sans,
                          flexShrink: 0,
                        }}
                      >
                        {doc.format}
                      </span>

                      {/* Name + version */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.name}
                          </span>
                          <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, flexShrink: 0 }}>{doc.version}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: st.color,
                          background: st.bg,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontFamily: T.sans,
                          flexShrink: 0,
                        }}
                      >
                        {st.label}
                      </span>

                      {/* Alert indicator */}
                      {doc.alert && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#f59e0b",
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {/* Arrow */}
                      <Icon d="M9 5l7 7-7 7" size={14} color={T.ink4} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Elena info bar */}
      <div
        style={{
          background: T.accentS,
          borderRadius: T.r,
          padding: "16px 20px",
          border: `1px solid ${T.accent}22`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            fontFamily: T.sans,
            flexShrink: 0,
          }}
        >
          EH
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
            Dokumente werden von Elena Hartmann gepflegt
          </div>
          <div style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans }}>
            Alle Dokumente werden regelmässig auf regulatorische Änderungen geprüft und bei Bedarf aktualisiert.
          </div>
        </div>
        <button
          onClick={() => { window.location.href = "mailto:es@virtue-compliance.ch"; }}
          style={{
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: T.sans,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <Icon d={icons.mail} size={14} color="#fff" />
          Elena kontaktieren
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Document Detail View
// =============================================================================

function DocDetail({
  doc,
  org,
  approvingId,
  onBack,
  onAlertNav,
  onApprove,
}: {
  doc: PortalDoc;
  org: ClientOrg | null;
  approvingId: string | null;
  onBack: () => void;
  onAlertNav?: (alertId: string) => void;
  onApprove: (doc: PortalDoc) => void;
}) {
  const st = DOC_STATUS[doc.status] ?? DOC_STATUS.draft;
  const fmt = FORMAT_COLORS[doc.format] ?? FORMAT_COLORS.DOCX;

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      {/* Back button */}
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
          fontFamily: T.sans,
          cursor: "pointer",
          padding: 0,
          marginBottom: 20,
        }}
      >
        <Icon d={icons.back} size={16} color={T.ink3} />
        Zurück zu Dokumenten
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: fmt.color,
            background: fmt.bg,
            padding: "3px 10px",
            borderRadius: 6,
            fontFamily: T.sans,
          }}
        >
          {doc.format}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: st.color,
            background: st.bg,
            padding: "3px 10px",
            borderRadius: 6,
            fontFamily: T.sans,
            border: `1px solid ${st.color}22`,
          }}
        >
          {st.label}
        </span>
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: T.ink,
          fontFamily: T.sans,
          margin: "0 0 6px",
          letterSpacing: "-0.4px",
          lineHeight: 1.3,
        }}
      >
        {doc.name}
      </h1>
      <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, margin: "0 0 4px" }}>
        Version {doc.version} · Zuletzt aktualisiert: {doc.updatedAt}
      </p>
      {doc.desc && (
        <p style={{ fontSize: 13.5, color: T.ink2, fontFamily: T.sans, lineHeight: 1.6, margin: "0 0 24px" }}>
          {doc.desc}
        </p>
      )}
      {!doc.desc && <div style={{ marginBottom: 24 }} />}

      {/* Meta grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            Zuletzt aktualisiert
          </div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>
            {doc.updatedAt}
          </div>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
            von {doc.updatedBy}
          </div>
        </div>
        <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            Rechtsgrundlage
          </div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans, lineHeight: 1.5 }}>
            {doc.legalBasis}
          </div>
        </div>
        <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            Umfang
          </div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>
            {doc.pages} Seiten ({doc.format})
          </div>
        </div>
      </div>

      {/* Approval info */}
      {doc.status === "current" && doc.approvedAt && (
        <div
          style={{
            background: "#ecf5f1",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #16654e22",
          }}
        >
          <Icon d={icons.check} size={14} color="#16654e" />
          <span style={{ fontSize: 12.5, color: "#16654e", fontFamily: T.sans, fontWeight: 500 }}>
            Freigegeben am {doc.approvedAt}
          </span>
        </div>
      )}

      {/* Alert notice */}
      {doc.alert && (
        <div
          style={{
            background: "#fffbeb",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #f59e0b22",
          }}
        >
          <Icon d={icons.alert} size={14} color="#d97706" />
          <span style={{ fontSize: 12.5, color: "#92400e", fontFamily: T.sans, fontWeight: 500 }}>
            {doc.alert}
          </span>
        </div>
      )}

      {/* Audit Trail */}
      <AuditTimeline docId={doc.id} />

      {/* Document Preview */}
      {doc.content && <DocPreview doc={doc} orgName={org?.name || undefined} />}

      {/* Linked Alerts */}
      {org && <LinkedAlerts docName={doc.name} orgId={org.id} onAlertNav={onAlertNav} />}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button
          disabled={!doc.content}
          onClick={() => downloadDoc(doc, org?.name || undefined)}
          style={{
            background: doc.content ? T.primaryDeep : T.ink4,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: T.sans,
            cursor: doc.content ? "pointer" : "not-allowed",
            opacity: doc.content ? 1 : 0.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "opacity 0.15s ease",
          }}
        >
          <Icon d={icons.download} size={14} color="#fff" />
          Download
        </button>
        {doc.status === "review" && (
          <button
            disabled={approvingId === doc.id}
            onClick={() => onApprove(doc)}
            style={{
              background: T.accentS,
              color: T.accent,
              border: `1px solid ${T.accent}33`,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: T.sans,
              cursor: approvingId === doc.id ? "wait" : "pointer",
              opacity: approvingId === doc.id ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "opacity 0.15s ease",
            }}
          >
            <Icon d={icons.check} size={14} color={T.accent} />
            {approvingId === doc.id ? "Wird freigegeben..." : "Freigeben"}
          </button>
        )}
        <button
          onClick={() => { window.location.href = "mailto:es@virtue-compliance.ch?subject=" + encodeURIComponent("Frage zu Dokument: " + doc.name); }}
          style={{
            background: "#fff",
            color: T.ink3,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: T.sans,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s ease",
          }}
        >
          <Icon d={icons.mail} size={14} color={T.ink4} />
          Elena kontaktieren
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Linked Alerts — shows regulatory alerts that reference this document
// =============================================================================

function LinkedAlerts({
  docName,
  orgId,
  onAlertNav,
}: {
  docName: string;
  orgId: string;
  onAlertNav?: (alertId: string) => void;
}) {
  const [alerts, setAlerts] = useState<LinkedAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadDocAlerts(docName, orgId)
      .then(setAlerts)
      .catch((err) => console.error("Failed to load linked alerts:", err))
      .finally(() => setLoading(false));
  }, [docName, orgId]);

  if (loading) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>Verknüpfte Meldungen werden geladen...</div>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: T.ink3,
          fontFamily: T.sans,
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
        }}
      >
        Verknüpfte Meldungen
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a) => {
          const sev = SEV[a.severity as keyof typeof SEV] ?? SEV.info;
          return (
            <div
              key={a.id}
              onClick={() => onAlertNav?.(a.id)}
              style={{
                background: "#fff",
                borderRadius: T.r,
                padding: "12px 16px",
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${sev.border}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: onAlertNav ? "pointer" : "default",
                transition: "box-shadow 0.15s, transform 0.15s",
              }}
              onMouseOver={(e) => {
                if (onAlertNav) {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <Icon d={icons.alert} size={16} color={sev.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                  {a.title}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: sev.color,
                  background: sev.bg,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontFamily: T.sans,
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {sev.label}
              </span>
              <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, flexShrink: 0 }}>
                {a.date}
              </span>
              {onAlertNav && <Icon d="M9 5l7 7-7 7" size={12} color={T.ink4} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  count,
  label,
  bg,
  color,
  borderColor,
  active,
  onClick,
}: {
  count: number;
  label: string;
  bg: string;
  color: string;
  borderColor?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: T.r,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: onClick ? "pointer" : "default",
        border: `1.5px solid ${active ? color : borderColor ?? "transparent"}`,
        transition: "all 0.15s ease",
        boxShadow: active ? `0 0 0 2px ${color}22` : "none",
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: T.sans }}>{count}</span>
      <span style={{ fontSize: 12, color, fontFamily: T.sans, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DocPreview — professional document viewer                          */
/* ------------------------------------------------------------------ */

function DocPreview({ doc, orgName }: { doc: PortalDoc; orgName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const fmt = FORMAT_COLORS[doc.format] ?? FORMAT_COLORS.DOCX;

  if (!doc.content) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: isOpen ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 600,
          color: T.ink2,
          transition: "all 0.15s ease",
        }}
      >
        <Icon d={icons.doc} size={15} color={T.ink3} />
        Vorschau
        <span style={{ fontSize: 11, color: T.ink4, fontWeight: 500 }}>
          {doc.pages} Seiten
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Icon
            d={isOpen ? "M19 15l-7-7-7 7" : "M9 5l7 7-7 7"}
            size={12}
            color={T.ink4}
          />
        </span>
      </button>

      {/* Viewer panel */}
      {isOpen && (
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            overflow: "hidden",
          }}
        >
          {/* Viewer toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              background: T.primaryDeep,
              borderBottom: `1px solid rgba(255,255,255,0.08)`,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: fmt.color,
                background: fmt.bg,
                padding: "2px 7px",
                borderRadius: 4,
                fontFamily: T.sans,
              }}
            >
              {doc.format}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                fontFamily: T.sans,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {doc.name} — {doc.version}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); downloadDoc(doc, orgName); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                fontFamily: T.sans,
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
              }}
            >
              <Icon d={icons.download} size={12} color="rgba(255,255,255,0.7)" />
              Download
            </button>
          </div>

          {/* Document paper */}
          <div
            style={{
              background: "#f6f6f4",
              padding: "20px",
              maxHeight: 420,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 4,
                padding: "36px 40px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                maxWidth: 680,
                margin: "0 auto",
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 12.5,
                lineHeight: 1.75,
                color: T.ink2,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                letterSpacing: "0.01em",
              }}
            >
              {doc.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AuditTimeline — collapsible document change log                    */
/* ------------------------------------------------------------------ */

const AUDIT_COLORS: Record<string, { dot: string; text: string }> = {
  created: { dot: T.primary, text: T.primary },
  approved: { dot: T.accent, text: T.accent },
  status_changed: { dot: T.amber, text: "#92400e" },
  updated: { dot: T.ink3, text: T.ink3 },
};

function AuditTimeline({ docId }: { docId: string }) {
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
    <div style={{ marginBottom: 14 }}>
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
