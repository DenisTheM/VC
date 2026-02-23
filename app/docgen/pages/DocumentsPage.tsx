import { useState, useEffect } from "react";
import { SectionLabel } from "@shared/components/SectionLabel";
import { Icon, icons } from "@shared/components/Icon";
import { T } from "@shared/styles/tokens";
import { DOC_TYPES } from "../data/docTypes";
import {
  loadDocuments,
  loadDocumentAuditLog,
  loadDocumentVersions,
  updateDocumentStatus,
  updateDocumentContent,
  bulkUpdateDocumentStatus,
  notifyApproval,
  type DbDocument,
  type AuditEntry,
  type DocVersion,
  type Organization,
} from "../lib/api";
import { exportDocumentAsPdf } from "@shared/lib/pdfExport";
import { VersionHistory } from "@shared/components/VersionHistory";
import { MarkdownContent } from "@shared/components/MarkdownContent";

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: T.s2, color: T.ink3, label: "Entwurf" },
  review: { bg: "#fffbeb", color: "#d97706", label: "In Prüfung" },
  current: { bg: "#ecf5f1", color: "#16654e", label: "Aktuell" },
  outdated: { bg: "#fef2f2", color: "#dc2626", label: "Veraltet" },
};

const FORMAT_COLORS: Record<string, { bg: string; color: string }> = {
  DOCX: { bg: "#eff6ff", color: "#3b82f6" },
  PDF: { bg: "#fef2f2", color: "#dc2626" },
  PPTX: { bg: "#fef3c7", color: "#d97706" },
  XLSX: { bg: "#ecf5f1", color: "#16654e" },
};

type StatusFilter = "all" | "current" | "review" | "draft" | "outdated";

interface DocumentsPageProps {
  organizations?: Organization[];
}

export function DocumentsPage({ organizations }: DocumentsPageProps) {
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DbDocument | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

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

  const statusCounts = {
    all: documents.length,
    current: documents.filter((d) => d.status === "current").length,
    review: documents.filter((d) => d.status === "review").length,
    draft: documents.filter((d) => d.status === "draft").length,
    outdated: documents.filter((d) => d.status === "outdated").length,
  };

  const orgs = [...new Map(documents.filter((d) => d.organizations).map((d) => [d.organization_id, d.organizations!.name])).entries()];

  const filtered = documents.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.organizations?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchOrg = !orgFilter || d.organization_id === orgFilter;
    return matchSearch && matchStatus && matchOrg;
  });

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkStatus(newStatus);
    try {
      await bulkUpdateDocumentStatus([...selectedIds], newStatus as DbDocument["status"]);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setBulkStatus(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* -- Detail View ------------------------------------------------- */
  if (selectedDoc) {
    return (
      <DocDetailView
        doc={selectedDoc}
        onBack={() => { setSelectedDoc(null); load(); }}
        onStatusChange={(newStatus) => {
          setSelectedDoc({ ...selectedDoc, status: newStatus });
        }}
      />
    );
  }

  /* -- List View ---------------------------------------------------- */
  return (
    <div>
      <SectionLabel text="Dokumentenverwaltung" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        Dokumente
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 20px" }}>
        Alle generierten Compliance-Dokumente auf einen Blick.
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
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {(["all", "current", "review", "draft", "outdated"] as StatusFilter[]).map((key) => {
              const isActive = statusFilter === key;
              const cfg = key === "all" ? { bg: T.s1, color: T.ink, label: "Total" } : STATUS_COLORS[key];
              return (
                <div
                  key={key}
                  onClick={() => setStatusFilter(isActive && key !== "all" ? "all" : key)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: T.r,
                    background: cfg.bg,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    border: `2px solid ${isActive ? cfg.color : "transparent"}`,
                    opacity: statusFilter !== "all" && !isActive ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: cfg.color, fontFamily: T.sans }}>
                    {statusCounts[key]}
                  </span>
                  <span style={{ fontSize: 12, color: cfg.color, fontFamily: T.sans }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
              <Icon d={icons.search} size={16} color={T.ink4} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dokumente durchsuchen..."
              style={{
                width: "100%",
                padding: "10px 12px 10px 38px",
                borderRadius: T.r,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                fontFamily: T.sans,
                color: T.ink,
                background: "#fff",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Filters: status pills + org dropdown */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(STATUS_COLORS).map(([key, cfg]) => {
              const isActive = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(isActive ? "all" : key as StatusFilter)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: `1px solid ${isActive ? cfg.color : T.border}`,
                    background: isActive ? cfg.bg : "#fff",
                    color: isActive ? cfg.color : T.ink3,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: T.sans,
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
            {orgs.length > 1 && (
              <select
                value={orgFilter || ""}
                onChange={(e) => setOrgFilter(e.target.value || null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  fontSize: 12.5,
                  fontFamily: T.sans,
                  color: T.ink2,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">Alle Organisationen</option>
                {orgs.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                marginBottom: 12,
                borderRadius: T.r,
                background: T.accentS,
                border: `1px solid ${T.accent}22`,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, fontFamily: T.sans }}>
                {selectedIds.size} ausgewählt
              </span>
              <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>Status ändern:</span>
              {(["current", "review", "draft", "outdated"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleBulkAction(s)}
                  disabled={!!bulkStatus}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${STATUS_COLORS[s].color}33`,
                    background: STATUS_COLORS[s].bg,
                    color: STATUS_COLORS[s].color,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: bulkStatus ? "default" : "pointer",
                    fontFamily: T.sans,
                    opacity: bulkStatus ? 0.5 : 1,
                  }}
                >
                  {STATUS_COLORS[s].label}
                </button>
              ))}
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: T.ink3,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: T.sans,
                }}
              >
                Abbrechen
              </button>
            </div>
          )}

          {/* Document list */}
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
              <Icon d={icons.doc} size={32} color={T.ink4} />
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine Dokumente gefunden.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((doc) => {
                const docType = DOC_TYPES[doc.doc_type];
                const status = STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft;
                const fmt = FORMAT_COLORS[doc.format] ?? FORMAT_COLORS.DOCX;
                const isSelected = selectedIds.has(doc.id);
                const date = new Date(doc.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: "#fff",
                      borderRadius: T.r,
                      border: `1px solid ${isSelected ? T.accent : T.border}`,
                      borderLeft: `3px solid ${status.color}`,
                      boxShadow: T.shSm,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shMd; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shSm; }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 18px",
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSelect(doc.id); }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          border: `2px solid ${isSelected ? T.accent : T.border}`,
                          background: isSelected ? T.accentS : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      >
                        {isSelected && <Icon d={icons.check} size={12} color={T.accent} />}
                      </div>

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
                        {doc.format || "DOCX"}
                      </span>

                      {/* Doc info */}
                      <div
                        onClick={() => setSelectedDoc(doc)}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                          {doc.organizations?.name && <span style={{ fontWeight: 500, color: T.ink3 }}>{doc.organizations.name} · </span>}
                          {docType?.name ?? doc.doc_type} · {date}
                        </div>
                      </div>

                      {/* Version */}
                      <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, flexShrink: 0 }}>{doc.version}</span>

                      {/* Status badge */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: status.color,
                          background: status.bg,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontFamily: T.sans,
                          flexShrink: 0,
                        }}
                      >
                        {status.label}
                      </span>

                      {/* Arrow */}
                      <div onClick={() => setSelectedDoc(doc)} style={{ display: "flex", flexShrink: 0 }}>
                        <Icon d="M9 5l7 7-7 7" size={14} color={T.ink4} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Document Detail View (Admin)
// =============================================================================

function DocDetailView({
  doc,
  onBack,
  onStatusChange,
}: {
  doc: DbDocument;
  onBack: () => void;
  onStatusChange: (s: DbDocument["status"]) => void;
}) {
  const status = STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft;
  const fmt = FORMAT_COLORS[doc.format] ?? FORMAT_COLORS.DOCX;
  const date = new Date(doc.updated_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
  const [changingStatus, setChangingStatus] = useState(false);
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);

  // Content editing state (only for draft documents)
  const [editContent, setEditContent] = useState(doc.content ?? "");
  const [savingContent, setSavingContent] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);
  const isDraft = doc.status === "draft";
  const contentDirty = editContent !== (doc.content ?? "");

  useEffect(() => {
    setEditContent(doc.content ?? "");
  }, [doc.id, doc.content]);

  useEffect(() => {
    setVersionsLoading(true);
    loadDocumentVersions(doc.id)
      .then(setVersions)
      .catch((err) => console.error("Failed to load versions:", err))
      .finally(() => setVersionsLoading(false));
  }, [doc.id]);

  const handleSaveContent = async () => {
    setSavingContent(true);
    setContentSaved(false);
    try {
      await updateDocumentContent(doc.id, editContent);
      doc.content = editContent;
      setContentSaved(true);
      setTimeout(() => setContentSaved(false), 3000);
    } catch (err) {
      console.error("Content save failed:", err);
    } finally {
      setSavingContent(false);
    }
  };

  const handleStatusChange = async (newStatus: DbDocument["status"]) => {
    // When moving from draft → review, send notification to CO
    const wasInDraft = doc.status === "draft";
    setChangingStatus(true);
    try {
      await updateDocumentStatus(doc.id, newStatus);
      onStatusChange(newStatus);
      // Notify CO when status changes to review from draft
      if (wasInDraft && newStatus === "review") {
        try {
          const result = await notifyApproval(doc.id, doc.organization_id);
          if (!result.success) {
            console.warn("CO notification failed:", result.message);
          }
        } catch {
          // Don't block the status change if notification fails
        }
      }
    } catch (err) {
      console.error("Status change failed:", err);
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div>
      <SectionLabel text="Dokument-Detail" />
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
          marginBottom: 16,
        }}
      >
        <Icon d={icons.back} size={14} color={T.ink3} />
        Alle Dokumente
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: fmt.color, background: fmt.bg, padding: "3px 10px", borderRadius: 6, fontFamily: T.sans }}>
          {doc.format || "DOCX"}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: status.color, background: status.bg, padding: "3px 10px", borderRadius: 6, fontFamily: T.sans, border: `1px solid ${status.color}22` }}>
          {status.label}
        </span>
      </div>

      <h1 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.ink, margin: "0 0 6px" }}>
        {doc.name}
      </h1>
      <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Version {doc.version} · Zuletzt aktualisiert: {date}
      </p>

      {/* Meta grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Organisation</div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>{doc.organizations?.name ?? "—"}</div>
        </div>
        <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Jurisdiktion</div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>{doc.jurisdiction}</div>
        </div>
        <div style={{ background: T.s1, borderRadius: T.r, padding: "14px 16px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>Rechtsgrundlage</div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>{doc.legal_basis ?? "—"}</div>
        </div>
      </div>

      {/* Status change */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.ink3, fontFamily: T.sans }}>Status ändern:</span>
        {(["draft", "review", "current", "outdated"] as DbDocument["status"][]).map((s) => {
          const cfg = STATUS_COLORS[s];
          const isActive = doc.status === s;
          return (
            <button
              key={s}
              onClick={() => !isActive && handleStatusChange(s)}
              disabled={changingStatus || isActive}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${isActive ? cfg.color : T.border}`,
                background: isActive ? cfg.bg : "#fff",
                color: isActive ? cfg.color : T.ink3,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: isActive || changingStatus ? "default" : "pointer",
                fontFamily: T.sans,
                opacity: changingStatus && !isActive ? 0.5 : 1,
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Content preview / editor */}
      {(doc.content || isDraft) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <button
              onClick={() => {
                exportDocumentAsPdf({
                  name: doc.name,
                  version: doc.version,
                  content: isDraft ? editContent : doc.content!,
                  legalBasis: doc.legal_basis || undefined,
                  orgName: doc.organizations?.name || undefined,
                });
              }}
              disabled={!(isDraft ? editContent : doc.content)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: T.primaryDeep,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.download} size={13} color="#fff" />
              PDF Download
            </button>
            {isDraft && (
              <>
                <button
                  onClick={handleSaveContent}
                  disabled={savingContent || !contentDirty}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: contentDirty ? T.accent : T.s2,
                    color: contentDirty ? "#fff" : T.ink4,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: savingContent || !contentDirty ? "default" : "pointer",
                    fontFamily: T.sans,
                    opacity: savingContent ? 0.6 : 1,
                  }}
                >
                  {savingContent ? "Speichern..." : "Inhalt speichern"}
                </button>
                {contentSaved && (
                  <span style={{ fontSize: 12, color: T.accent, fontWeight: 500, fontFamily: T.sans }}>
                    Gespeichert
                  </span>
                )}
              </>
            )}
          </div>
          {isDraft ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: "100%",
                minHeight: 500,
                maxHeight: 800,
                resize: "vertical",
                fontFamily: T.sans,
                fontSize: 13,
                color: T.ink2,
                lineHeight: 1.65,
                padding: "24px 28px",
                background: "#fff",
                borderRadius: T.r,
                border: `1px solid ${contentDirty ? T.accent : T.border}`,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <div
              style={{
                maxHeight: 400,
                overflow: "auto",
                background: "#fff",
                borderRadius: T.r,
                border: `1px solid ${T.border}`,
                padding: "24px 28px",
              }}
            >
              <MarkdownContent content={doc.content!} />
            </div>
          )}
        </div>
      )}

      {/* Audit Timeline */}
      <AdminAuditTimeline docId={doc.id} />

      {/* Version History */}
      <VersionHistory
        versions={versions}
        currentContent={doc.content}
        currentVersion={doc.version}
        loading={versionsLoading}
      />
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
