import { useState, useEffect } from "react";
import { T } from "../styles/tokens";
import { Icon, icons } from "./Icon";
import { DiffViewer } from "./DiffViewer";

export interface VersionEntry {
  id: string;
  version: string;
  name: string;
  content: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  versions: VersionEntry[];
  currentContent: string | null;
  currentVersion: string;
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("de-CH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function VersionHistory({ versions, currentContent, currentVersion, loading }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [diffIndex, setDiffIndex] = useState<number | null>(null);

  if (versions.length === 0 && !loading) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
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
        Versionsverlauf
        <span style={{ fontSize: 11, color: T.ink4, fontWeight: 500 }}>
          {versions.length} {versions.length === 1 ? "Version" : "Versionen"}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Icon d={open ? "M19 15l-7-7-7 7" : "M9 5l7 7-7 7"} size={12} color={T.ink4} />
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

              {/* Current version (top) */}
              <div style={{ position: "relative", paddingBottom: versions.length > 0 ? 14 : 0 }}>
                <div
                  style={{
                    position: "absolute",
                    left: -17,
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: T.accent,
                    border: "2px solid #fff",
                    boxShadow: `0 0 0 1px ${T.border}`,
                  }}
                />
                <div style={{ fontSize: 12.5, fontFamily: T.sans, color: T.accent, fontWeight: 600 }}>
                  Aktuelle Version ({currentVersion})
                </div>
                <div style={{ fontSize: 11, fontFamily: T.sans, color: T.ink4, marginTop: 1 }}>
                  Aktuell
                </div>
              </div>

              {/* Previous versions */}
              {versions.map((v, i) => {
                const isExpanded = diffIndex === i;
                return (
                  <div key={v.id} style={{ position: "relative", paddingBottom: i < versions.length - 1 ? 14 : 0 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -17,
                        top: 4,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: T.ink4,
                        border: "2px solid #fff",
                        boxShadow: `0 0 0 1px ${T.border}`,
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontFamily: T.sans, color: T.ink2, fontWeight: 600 }}>
                          {v.version}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: T.sans, color: T.ink4, marginTop: 1 }}>
                          {formatDate(v.created_at)}
                        </div>
                      </div>
                      {v.content && currentContent && (
                        <button
                          onClick={() => setDiffIndex(isExpanded ? null : i)}
                          style={{
                            background: isExpanded ? T.accentS : T.s1,
                            border: `1px solid ${isExpanded ? T.accent + "33" : T.border}`,
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 500,
                            color: isExpanded ? T.accent : T.ink3,
                            fontFamily: T.sans,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon d={icons.doc} size={11} color={isExpanded ? T.accent : T.ink4} />
                          {isExpanded ? "Diff schliessen" : "Diff anzeigen"}
                        </button>
                      )}
                    </div>

                    {/* Inline diff */}
                    {isExpanded && v.content && currentContent && (
                      <div style={{ marginTop: 10 }}>
                        <DiffViewer
                          oldText={v.content}
                          newText={currentContent}
                          oldLabel={`${v.version} (alt)`}
                          newLabel={`${currentVersion} (aktuell)`}
                        />
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
