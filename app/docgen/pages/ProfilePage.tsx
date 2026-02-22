import { useState, useEffect, useRef, useCallback } from "react";
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
  updatedAt?: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: T.s2, color: T.ink3, label: "Entwurf" },
  review: { bg: "#fffbeb", color: "#d97706", label: "In Prüfung" },
  current: { bg: "#ecf5f1", color: "#16654e", label: "Aktuell" },
  outdated: { bg: "#fef2f2", color: "#dc2626", label: "Veraltet" },
};

function isFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

export function ProfilePage({ profile, setProfile, onSave, saving, orgId, orgName, onBack, onGenerate, updatedAt }: ProfilePageProps) {
  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // Feature 2: Auto-save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Feature 3: Collapsible sections
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const initialCollapseRef = useRef(false);

  // Feature 6: Force re-render for relative time
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    setDocsLoading(true);
    loadDocumentsByOrg(orgId)
      .then(setDocs)
      .catch((err) => console.error("Failed to load documents:", err))
      .finally(() => setDocsLoading(false));
  }, [orgId]);

  // Feature 6: Refresh relative time every 30s
  useEffect(() => {
    if (!updatedAt) return;
    const interval = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  // Feature 2: Cleanup timers + save-on-unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        onSaveRef.current().catch(() => {});
      }
    };
  }, []);

  const required = PROFILE_FIELDS.filter((f) => f.required !== false);
  const filled = required.filter((f) => !isFieldEmpty(profile[f.id]));
  const pct = required.length > 0 ? Math.round((filled.length / required.length) * 100) : 0;

  // Group fields by section
  const sections: Record<string, typeof PROFILE_FIELDS> = {};
  PROFILE_FIELDS.forEach((f) => {
    if (!sections[f.section]) sections[f.section] = [];
    sections[f.section].push(f);
  });

  // Per-section completion stats
  const sectionStats: Record<string, { required: number; filled: number }> = {};
  Object.entries(sections).forEach(([name, fields]) => {
    const req = fields.filter((f) => f.required !== false);
    const fil = req.filter((f) => !isFieldEmpty(profile[f.id]));
    sectionStats[name] = { required: req.length, filled: fil.length };
  });

  // Feature 3: Auto-collapse completed sections on initial load
  useEffect(() => {
    if (initialCollapseRef.current) return;
    const completeNames = Object.entries(sectionStats)
      .filter(([, s]) => s.required > 0 && s.filled === s.required)
      .map(([name]) => name);
    if (completeNames.length > 0) {
      setCollapsed(new Set(completeNames));
      initialCollapseRef.current = true;
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Feature 2: Auto-save with debounce
  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setProfile((prev) => ({ ...prev, [fieldId]: value }));
    dirtyRef.current = true;
    setSaveStatus("idle");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!dirtyRef.current) return;
      setSaveStatus("saving");
      try {
        await onSaveRef.current();
        dirtyRef.current = false;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 3000);
      } catch (_e) {
        setSaveStatus("error");
      }
    }, 2000);
  }, [setProfile]);

  // Manual save handler
  const handleManualSave = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveStatus("saving");
    try {
      await onSave();
      dirtyRef.current = false;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 3000);
    } catch (_e) {
      setSaveStatus("error");
    }
  };

  // Feature 4: Document status summary
  const docStatusSummary = (() => {
    if (docs.length === 0) return null;
    const counts: Record<string, number> = {};
    docs.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    const parts: string[] = [];
    if (counts.current) parts.push(`${counts.current} aktuell`);
    if (counts.draft) parts.push(`${counts.draft} Entwurf`);
    if (counts.review) parts.push(`${counts.review} in Prüfung`);
    if (counts.outdated) parts.push(`${counts.outdated} veraltet`);
    return parts.join(", ");
  })();

  const sectionNames = Object.keys(sections);

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

      {/* Progress bar + Save button + Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
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
        {/* Feature 6: Last saved timestamp */}
        {updatedAt && (
          <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, whiteSpace: "nowrap" }}>
            Gespeichert: {formatRelativeTime(updatedAt)}
          </span>
        )}
        {/* Feature 2: Save status indicator */}
        <span style={{
          fontSize: 12,
          fontFamily: T.sans,
          fontWeight: 500,
          whiteSpace: "nowrap",
          color: saveStatus === "saved" ? T.accent
            : saveStatus === "saving" ? T.amber
            : saveStatus === "error" ? T.red
            : "transparent",
        }}>
          {saveStatus === "saving" && "Wird gespeichert..."}
          {saveStatus === "saved" && "\u2713 Gespeichert"}
          {saveStatus === "error" && "Fehler beim Speichern"}
        </span>
        <button
          onClick={handleManualSave}
          disabled={saving || saveStatus === "saving"}
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
            cursor: saving || saveStatus === "saving" ? "not-allowed" : "pointer",
            fontFamily: T.sans,
            opacity: saving || saveStatus === "saving" ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {saving || saveStatus === "saving" ? "Speichern..." : "Profil speichern"}
        </button>
      </div>

      {/* Feature 5: Sticky section navigation */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: T.s1,
        padding: "10px 0",
        marginBottom: 12,
        borderBottom: `1px solid ${T.borderL}`,
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
      }}>
        {sectionNames.map((name) => {
          const stats = sectionStats[name];
          const isComplete = stats.required > 0 && stats.filled === stats.required;
          return (
            <button
              key={name}
              onClick={() => {
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  next.delete(name);
                  return next;
                });
                setTimeout(() => {
                  const el = document.getElementById(`section-${name}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1px solid ${isComplete ? T.accent : T.border}`,
                background: isComplete ? T.accentS : "#fff",
                color: isComplete ? T.accent : T.ink3,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: T.sans,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {isComplete && <Icon d={icons.check} size={11} color={T.accent} />}
              {name}
            </button>
          );
        })}
        {orgId && (
          <button
            onClick={() => {
              const el = document.getElementById("section-dokumente");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid ${T.border}`,
              background: "#fff",
              color: T.ink3,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            Dokumente
          </button>
        )}
      </div>

      {/* Sections */}
      {Object.entries(sections).map(([sectionName, fields]) => {
        const stats = sectionStats[sectionName];
        const isCollapsed = collapsed.has(sectionName);
        const isComplete = stats.required > 0 && stats.filled === stats.required;

        return (
          <div
            key={sectionName}
            id={`section-${sectionName}`}
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
              marginBottom: 20,
              overflow: "hidden",
              scrollMarginTop: 56,
            }}
          >
            {/* Clickable section header */}
            <div
              onClick={() => toggleSection(sectionName)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 26px",
                cursor: "pointer",
                userSelect: "none",
                borderBottom: isCollapsed ? "none" : `1px solid ${T.borderL}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                  {sectionName}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: isComplete ? T.accent : T.ink4,
                  fontFamily: T.sans,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {isComplete ? (
                    <>
                      <Icon d={icons.check} size={12} color={T.accent} />
                      Vollständig
                    </>
                  ) : (
                    `${stats.filled}/${stats.required} ausgefüllt`
                  )}
                </span>
              </div>
              <span style={{
                transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                transition: "transform 0.2s",
                display: "inline-flex",
              }}>
                <Icon d={icons.arrow} size={12} color={T.ink4} />
              </span>
            </div>

            {/* Collapsible content */}
            {!isCollapsed && (
              <div style={{
                padding: "14px 26px 10px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 20px",
              }}>
                {fields.map((f) => (
                  <div
                    key={f.id}
                    style={f.type === "textarea" || f.type === "multi" ? { gridColumn: "1 / -1" } : undefined}
                  >
                    <Field
                      field={f}
                      value={profile[f.id]}
                      onChange={(v) => handleFieldChange(f.id, v)}
                      highlight={f.required !== false && isFieldEmpty(profile[f.id])}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Documents for this client */}
      {orgId && (
        <div id="section-dokumente" style={{ marginTop: 8, scrollMarginTop: 56 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                Dokumente {orgName ? `für ${orgName}` : ""}
              </div>
              {/* Feature 4: Document status summary badge */}
              {docStatusSummary && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: T.s2,
                  color: T.ink3,
                  fontFamily: T.sans,
                }}>
                  {docStatusSummary}
                </span>
              )}
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
                const isOpen = expandedDoc === doc.id;
                const date = new Date(doc.created_at).toLocaleDateString("de-CH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div key={doc.id} style={{ borderTop: i > 0 ? `1px solid ${T.borderL}` : undefined }}>
                    <div
                      onClick={() => setExpandedDoc(isOpen ? null : doc.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 18px",
                        cursor: "pointer",
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
                      <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-flex" }}>
                        <Icon d={icons.arrow} size={12} color={T.ink4} />
                      </span>
                    </div>
                    {isOpen && doc.content && (
                      <div
                        style={{
                          borderTop: `1px solid ${T.borderL}`,
                          padding: "16px 20px",
                          maxHeight: 400,
                          overflow: "auto",
                        }}
                      >
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
