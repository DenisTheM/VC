import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { SEV, IMPACT } from "../data/clientData";
import { loadClientAlerts, type ClientOrg, type PortalAlert } from "../lib/api";

interface ClientAlertsProps {
  org: ClientOrg | null;
}

export function ClientAlerts({ org }: ClientAlertsProps) {
  const [alerts, setAlerts] = useState<PortalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PortalAlert | null>(null);

  const orgShort = org?.short_name || org?.name || "Ihr Unternehmen";

  useEffect(() => {
    if (!org) return;
    loadClientAlerts(org.id)
      .then(setAlerts)
      .catch((err) => console.error("Failed to load client alerts:", err))
      .finally(() => setLoading(false));
  }, [org]);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const newCount = alerts.filter((a) => a.isNew).length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Meldungen werden geladen...
      </div>
    );
  }

  /* -- Detail view ------------------------------------------------- */
  if (selected) {
    const sev = SEV[selected.severity] ?? SEV.info;
    const imp = IMPACT[selected.impact] ?? IMPACT.medium;

    return (
      <div style={{ padding: "40px 48px", maxWidth: 960 }}>
        {/* Back button */}
        <button
          onClick={() => setSelected(null)}
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
          Zurück zur Übersicht
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: sev.color,
              background: sev.bg,
              padding: "3px 10px",
              borderRadius: 6,
              fontFamily: T.sans,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              border: `1px solid ${sev.border}`,
            }}
          >
            {sev.label}
          </span>
          <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{selected.date}</span>
          <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>|</span>
          <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{selected.source}</span>
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
          {selected.title}
        </h1>
        <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, lineHeight: 1.6, margin: "0 0 28px" }}>
          {selected.summary}
        </p>

        <div style={{ display: "flex", gap: 24 }}>
          {/* Main content */}
          <div style={{ flex: 1 }}>
            {/* Impact section */}
            <div
              style={{
                background: imp.bg,
                borderRadius: T.r,
                padding: "16px 20px",
                marginBottom: 20,
                border: `1px solid ${imp.color}22`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: imp.color,
                    fontFamily: T.sans,
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                  }}
                >
                  Auswirkung auf {orgShort}: {imp.label}
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: T.ink2, fontFamily: T.sans, lineHeight: 1.6, margin: 0 }}>
                {selected.impactText}
              </p>
            </div>

            {/* Legal basis & deadline */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: T.s1,
                  borderRadius: T.r,
                  padding: "14px 16px",
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  Rechtsgrundlage
                </div>
                <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans, lineHeight: 1.5 }}>
                  {selected.legalBasis}
                </div>
              </div>
              <div
                style={{
                  background: T.s1,
                  borderRadius: T.r,
                  padding: "14px 16px",
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  Frist
                </div>
                <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>
                  {selected.deadline}
                </div>
              </div>
            </div>

            {/* Elena commentary (dark card) */}
            {selected.elenaComment && (
              <div
                style={{
                  background: T.primaryDeep,
                  borderRadius: T.rLg,
                  padding: "22px 24px",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: T.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                      fontFamily: T.sans,
                    }}
                  >
                    EH
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", fontFamily: T.sans }}>
                      Elena Hartmann
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: T.sans }}>
                      Ihre Compliance-Beraterin
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: T.sans,
                    lineHeight: 1.7,
                    margin: 0,
                    whiteSpace: "pre-line",
                  }}
                >
                  {selected.elenaComment}
                </p>
              </div>
            )}

            {/* Action items */}
            {selected.actions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: T.ink,
                    fontFamily: T.sans,
                    margin: "0 0 14px",
                  }}
                >
                  Massnahmen ({selected.actions.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.actions.map((action, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#fff",
                        borderRadius: T.r,
                        padding: "14px 16px",
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${action.status === "offen" ? T.amber : T.accent}`,
                          background: action.status === "offen" ? "#fffbeb" : T.accentS,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {action.status !== "offen" && <Icon d={icons.check} size={12} color={T.accent} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink, fontFamily: T.sans }}>
                          {action.text}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: action.status === "offen" ? "#d97706" : T.accent,
                            background: action.status === "offen" ? "#fffbeb" : T.accentS,
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontFamily: T.sans,
                            fontWeight: 600,
                          }}
                        >
                          {action.status}
                        </span>
                        <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>
                          Frist: {action.due}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elena contact card */}
            <div
              style={{
                background: T.accentS,
                borderRadius: T.r,
                padding: "16px 20px",
                border: `1px solid ${T.accent}22`,
                display: "flex",
                alignItems: "center",
                gap: 14,
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
                  Fragen zu dieser Meldung?
                </div>
                <div style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans }}>
                  Elena Hartmann steht Ihnen jederzeit zur Verfügung.
                </div>
              </div>
              <button
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
                }}
              >
                <Icon d={icons.mail} size={14} color="#fff" />
                Elena kontaktieren
              </button>
            </div>
          </div>

          {/* Sidebar: related docs */}
          {selected.relatedDocs.length > 0 && (
            <div style={{ width: 240, flexShrink: 0 }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.ink3,
                  fontFamily: T.sans,
                  margin: "0 0 12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Betroffene Dokumente
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.relatedDocs.map((doc, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      borderRadius: T.r,
                      padding: "12px 14px",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Icon d={icons.doc} size={14} color={T.ink4} />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: doc.type === "DOCX" ? "#3b82f6" : "#dc2626",
                          background: doc.type === "DOCX" ? "#eff6ff" : "#fef2f2",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontFamily: T.sans,
                        }}
                      >
                        {doc.type}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 2 }}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                      {doc.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* -- List view --------------------------------------------------- */
  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Regulatorische Meldungen" />

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
        Ihre Meldungen
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Von Elena Hartmann aufbereitete regulatorische Updates mit Einschätzung der Relevanz für {orgShort}.
      </p>

      {/* Summary stats bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#fef2f2",
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", fontFamily: T.sans }}>
            {criticalCount}
          </span>
          <span style={{ fontSize: 12, color: "#dc2626", fontFamily: T.sans, fontWeight: 500 }}>Kritisch</span>
        </div>
        <div
          style={{
            background: "#fffbeb",
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#d97706", fontFamily: T.sans }}>
            {highCount}
          </span>
          <span style={{ fontSize: 12, color: "#d97706", fontFamily: T.sans, fontWeight: 500 }}>Hoch</span>
        </div>
        <div
          style={{
            background: T.accentS,
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: T.accent, fontFamily: T.sans }}>
            {newCount}
          </span>
          <span style={{ fontSize: 12, color: T.accent, fontFamily: T.sans, fontWeight: 500 }}>Neu</span>
        </div>
      </div>

      {/* Alert cards */}
      {alerts.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
          Keine Meldungen vorhanden.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map((alert) => {
            const sev = SEV[alert.severity] ?? SEV.info;
            const imp = IMPACT[alert.impact] ?? IMPACT.medium;

            return (
              <div
                key={alert.id}
                onClick={() => setSelected(alert)}
                style={{
                  background: "#fff",
                  borderRadius: T.rLg,
                  padding: "20px 24px",
                  border: `1px solid ${T.border}`,
                  borderLeft: `4px solid ${sev.border}`,
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
                {/* Top row: badges + date */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
                      letterSpacing: "0.3px",
                    }}
                  >
                    {sev.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: imp.color,
                      background: imp.bg,
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontFamily: T.sans,
                    }}
                  >
                    Auswirkung: {imp.label}
                  </span>
                  {alert.isNew && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        background: T.accent,
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontFamily: T.sans,
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      Neu
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginLeft: "auto" }}>
                    {alert.date}
                  </span>
                </div>

                {/* Title */}
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: T.ink,
                    fontFamily: T.sans,
                    marginBottom: 6,
                    lineHeight: 1.4,
                  }}
                >
                  {alert.title}
                </div>

                {/* Category + actions count */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>
                    {alert.category}
                  </span>
                  {alert.actions.length > 0 && (
                    <>
                      <span style={{ fontSize: 12, color: T.ink4 }}>|</span>
                      <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>
                        {alert.actions.length} Massnahme{alert.actions.length !== 1 ? "n" : ""}
                      </span>
                    </>
                  )}
                </div>

                {/* Elena preview */}
                {alert.elenaComment && (
                  <div
                    style={{
                      background: T.s1,
                      borderRadius: 8,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: T.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        fontFamily: T.sans,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      EH
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 2 }}>
                        Elena Hartmann
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: T.ink3,
                          fontFamily: T.sans,
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {alert.elenaComment}
                      </div>
                    </div>
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
