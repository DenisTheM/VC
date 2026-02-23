import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { SEV, IMPACT, ACTION_STATUS } from "../data/clientData";
import { loadClientAlerts, updateClientActionStatus, loadActionComments, addActionComment, deleteActionComment, type ClientOrg, type PortalAlert, type ActionComment } from "../lib/api";

interface ClientAlertsProps {
  org: ClientOrg | null;
  initialAlertId?: string | null;
  onAlertConsumed?: () => void;
  onDocNav?: (docName: string) => void;
}

type SeverityFilter = "all" | PortalAlert["severity"];

const SEVERITY_FILTERS: { key: SeverityFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "critical", label: "Kritisch" },
  { key: "high", label: "Hoch" },
  { key: "medium", label: "Mittel" },
  { key: "info", label: "Info" },
];

export function ClientAlerts({ org, initialAlertId, onAlertConsumed, onDocNav }: ClientAlertsProps) {
  const [alerts, setAlerts] = useState<PortalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<PortalAlert | null>(null);
  const [activeSeverity, setActiveSeverity] = useState<SeverityFilter>("all");
  const [showNewOnly, setShowNewOnly] = useState(false);

  const orgShort = org?.short_name || org?.name || "Ihr Unternehmen";

  const load = () => {
    if (!org) return;
    setLoading(true);
    setError(false);
    loadClientAlerts(org.id)
      .then(setAlerts)
      .catch((err) => {
        console.error("Failed to load client alerts:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [org]);

  // Deep-link: auto-select alert when navigated from dashboard
  useEffect(() => {
    if (initialAlertId && alerts.length > 0 && !selected) {
      const match = alerts.find((a) => a.id === initialAlertId);
      if (match) {
        setSelected(match);
        onAlertConsumed?.();
      }
    }
  }, [initialAlertId, alerts]);

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

  if (error) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", fontFamily: T.sans }}>
        <div style={{ fontSize: 14, color: T.ink3, marginBottom: 12 }}>Meldungen konnten nicht geladen werden.</div>
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
  if (selected) {
    return (
      <AlertDetail
        alert={selected}
        org={org}
        orgShort={orgShort}
        onBack={() => setSelected(null)}
        onDocNav={onDocNav}
        canEdit={org?.userRole === "editor" || org?.userRole === "approver"}
        onActionsUpdated={(updatedActions) => {
          // Update both selected and alerts list
          const updated = { ...selected, actions: updatedActions };
          setSelected(updated);
          setAlerts((prev) => prev.map((a) => (a.id === selected.id ? updated : a)));
        }}
      />
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

      {/* Summary stats bar — clickable quick-filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div
          onClick={() => setActiveSeverity(activeSeverity === "critical" ? "all" : "critical")}
          style={{
            background: "#fef2f2",
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            border: `1.5px solid ${activeSeverity === "critical" ? "#dc2626" : "transparent"}`,
            boxShadow: activeSeverity === "critical" ? "0 0 0 2px #dc262622" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", fontFamily: T.sans }}>
            {criticalCount}
          </span>
          <span style={{ fontSize: 12, color: "#dc2626", fontFamily: T.sans, fontWeight: 500 }}>Kritisch</span>
        </div>
        <div
          onClick={() => setActiveSeverity(activeSeverity === "high" ? "all" : "high")}
          style={{
            background: "#fffbeb",
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            border: `1.5px solid ${activeSeverity === "high" ? "#d97706" : "transparent"}`,
            boxShadow: activeSeverity === "high" ? "0 0 0 2px #d9770622" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#d97706", fontFamily: T.sans }}>
            {highCount}
          </span>
          <span style={{ fontSize: 12, color: "#d97706", fontFamily: T.sans, fontWeight: 500 }}>Hoch</span>
        </div>
        <div
          onClick={() => setShowNewOnly(!showNewOnly)}
          style={{
            background: T.accentS,
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            border: `1.5px solid ${showNewOnly ? T.accent : "transparent"}`,
            boxShadow: showNewOnly ? `0 0 0 2px ${T.accent}22` : "none",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: T.accent, fontFamily: T.sans }}>
            {newCount}
          </span>
          <span style={{ fontSize: 12, color: T.accent, fontFamily: T.sans, fontWeight: 500 }}>Neu</span>
        </div>
      </div>

      {/* Severity filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 52 }}>
          Stufe
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {SEVERITY_FILTERS.map((f) => {
            const isActive = activeSeverity === f.key;
            const count = f.key === "all" ? alerts.length : alerts.filter((a) => a.severity === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setActiveSeverity(isActive && f.key !== "all" ? "all" : f.key)}
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
                  whiteSpace: "nowrap" as const,
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
                      textAlign: "center" as const,
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

      {/* Active filter summary */}
      {(() => {
        const filteredAlerts = alerts.filter((a) => {
          const matchSev = activeSeverity === "all" || a.severity === activeSeverity;
          const matchNew = !showNewOnly || a.isNew;
          return matchSev && matchNew;
        });

        if (filteredAlerts.length === 0 && alerts.length > 0) {
          return (
            <div style={{ padding: "40px 0", textAlign: "center", fontFamily: T.sans }}>
              <div style={{ fontSize: 14, color: T.ink3, marginBottom: 8 }}>Keine Meldungen für diesen Filter.</div>
              <button
                onClick={() => { setActiveSeverity("all"); setShowNewOnly(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.accent, fontWeight: 600, fontFamily: T.sans }}
              >
                Filter zurücksetzen
              </button>
            </div>
          );
        }

        if (alerts.length === 0) {
          return (
            <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
              Keine Meldungen vorhanden.
            </div>
          );
        }

        return (
          <>
            {(activeSeverity !== "all" || showNewOnly) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                  {filteredAlerts.length} {filteredAlerts.length === 1 ? "Meldung" : "Meldungen"} gefunden
                </span>
                <button
                  onClick={() => { setActiveSeverity("all"); setShowNewOnly(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.accent, fontWeight: 600, fontFamily: T.sans, padding: 0 }}
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredAlerts.map((alert) => {
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
          </>
        );
      })()}
    </div>
  );
}

// =============================================================================
// Alert Detail View — extracted for local action state management
// =============================================================================

function AlertDetail({
  alert,
  org,
  orgShort,
  onBack,
  onDocNav,
  onActionsUpdated,
  canEdit,
}: {
  alert: PortalAlert;
  org: ClientOrg | null;
  orgShort: string;
  onBack: () => void;
  onDocNav?: (docName: string) => void;
  onActionsUpdated: (actions: PortalAlert["actions"]) => void;
  canEdit: boolean;
}) {
  const sev = SEV[alert.severity] ?? SEV.info;
  const imp = IMPACT[alert.impact] ?? IMPACT.medium;
  const [localActions, setLocalActions] = useState(alert.actions);

  const handleToggle = async (action: PortalAlert["actions"][number]) => {
    if (!canEdit) return;
    const cycle: Record<string, string> = {
      offen: "in_arbeit",
      in_arbeit: "erledigt",
      erledigt: "offen",
    };
    const newStatus = cycle[action.status] ?? "in_arbeit";
    // Optimistic update
    const updated = localActions.map((a) => (a.id === action.id ? { ...a, status: newStatus } : a));
    setLocalActions(updated);
    onActionsUpdated(updated);
    try {
      await updateClientActionStatus(action.id, newStatus as "offen" | "in_arbeit" | "erledigt");
    } catch (err) {
      console.error("Failed to update action status:", err);
      // Revert on error
      setLocalActions(localActions);
      onActionsUpdated(localActions);
    }
  };

  const doneCount = localActions.filter((a) => a.status === "erledigt").length;
  const inProgressCount = localActions.filter((a) => a.status === "in_arbeit").length;
  const totalCount = localActions.length;
  const donePct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const inProgressPct = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;

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
        <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{alert.date}</span>
        <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>|</span>
        <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{alert.source}</span>
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
        {alert.title}
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, lineHeight: 1.6, margin: "0 0 28px" }}>
        {alert.summary}
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
              {alert.impactText}
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
                {alert.legalBasis}
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
                {alert.deadline}
              </div>
            </div>
          </div>

          {/* Elena commentary (dark card) */}
          {alert.elenaComment && (
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
                {org?.contact_salutation && org?.contact_name && (
                  <strong style={{ color: "#fff" }}>
                    {org.contact_salutation === "Frau" ? "Liebe" : "Lieber"}{" "}
                    {org.contact_name.split(" ")[0]},{" "}
                  </strong>
                )}
                {alert.elenaComment}
              </p>
            </div>
          )}

          {/* Action items — interactive */}
          {localActions.length > 0 && (
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
                Massnahmen ({localActions.length})
              </h3>

              {/* Progress bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                    Fortschritt
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, fontFamily: T.sans }}>
                    {doneCount}/{totalCount} erledigt{inProgressCount > 0 ? ` · ${inProgressCount} in Arbeit` : ""}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: T.s2,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: T.accent,
                      width: `${donePct}%`,
                      transition: "width 0.3s ease",
                    }}
                  />
                  <div
                    style={{
                      height: "100%",
                      background: "#93c5fd",
                      width: `${inProgressPct}%`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {localActions.map((action) => {
                  const st = ACTION_STATUS[action.status as keyof typeof ACTION_STATUS] ?? ACTION_STATUS.offen;
                  return (
                    <ActionItem
                      key={action.id}
                      action={action}
                      st={st}
                      canEdit={canEdit}
                      onToggle={() => handleToggle(action)}
                    />
                  );
                })}
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
              onClick={() => { window.location.href = "mailto:es@virtue-compliance.ch?subject=" + encodeURIComponent("Frage zu: " + alert.title); }}
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
        {alert.relatedDocs.length > 0 && (
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
              {alert.relatedDocs.map((doc, i) => (
                <div
                  key={i}
                  onClick={() => onDocNav?.(doc.name)}
                  style={{
                    background: "#fff",
                    borderRadius: T.r,
                    padding: "12px 14px",
                    border: `1px solid ${T.border}`,
                    cursor: onDocNav ? "pointer" : "default",
                    transition: "box-shadow 0.15s, transform 0.15s",
                  }}
                  onMouseOver={(e) => { if (onDocNav) { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; } }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
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

// =============================================================================
// ActionItem — single action with collapsible comment thread
// =============================================================================

function ActionItem({
  action,
  st,
  canEdit,
  onToggle,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: { id: string; text: string; due: string; status: string };
  st: { color: string; bg: string; border: string; label: string; icon: string | null; strikethrough?: boolean };
  canEdit: boolean;
  onToggle: () => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      loadActionComments(action.id)
        .then((data) => { setComments(data); setCommentCount(data.length); })
        .catch((err) => console.error("Failed to load comments:", err))
        .finally(() => setLoadingComments(false));
    }
  };

  const handleSubmit = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addActionComment(action.id, commentText.trim());
      setCommentText("");
      const data = await loadActionComments(action.id);
      setComments(data);
      setCommentCount(data.length);
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteActionComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((c) => c !== null ? Math.max(0, c - 1) : null);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: T.r,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}
    >
      {/* Action row */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div
          onClick={onToggle}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `2px solid ${st.border}`,
            background: st.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: canEdit ? "pointer" : "default",
            opacity: canEdit ? 1 : 0.6,
            transition: "all 0.15s",
          }}
        >
          {st.icon === "check" && <Icon d={icons.check} size={12} color={st.color} />}
          {st.icon === "clock" && <Icon d={icons.clock} size={12} color={st.color} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: st.strikethrough ? T.ink4 : T.ink,
              fontFamily: T.sans,
              textDecoration: st.strikethrough ? "line-through" : "none",
            }}
          >
            {action.text}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              color: st.color,
              background: st.bg,
              padding: "2px 8px",
              borderRadius: 6,
              fontFamily: T.sans,
              fontWeight: 600,
            }}
          >
            {st.label}
          </span>
          <DueIndicator due={action.due} />
        </div>
      </div>

      {/* Comment toggle */}
      <button
        onClick={toggleComments}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderTop: `1px solid ${T.borderL}`,
          background: commentsOpen ? T.s1 : "transparent",
          border: "none",
          borderTopStyle: "solid",
          borderTopWidth: 1,
          borderTopColor: T.borderL,
          cursor: "pointer",
          fontSize: 11.5,
          fontWeight: 500,
          color: T.ink4,
          fontFamily: T.sans,
        }}
      >
        <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" size={13} color={T.ink4} />
        Kommentare{commentCount !== null ? ` (${commentCount})` : ""}
        <Icon d={commentsOpen ? "M19 15l-7-7-7 7" : "M9 5l7 7-7 7"} size={10} color={T.ink4} />
      </button>

      {/* Comment thread */}
      {commentsOpen && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.borderL}`, background: T.s1 }}>
          {loadingComments ? (
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>Wird geladen...</div>
          ) : comments.length === 0 && !canEdit ? (
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>Keine Kommentare.</div>
          ) : (
            <>
              {comments.map((c) => (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.ink2, fontFamily: T.sans }}>
                      {c.user_name}
                    </span>
                    <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans }}>
                      {new Date(c.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          marginLeft: "auto",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 10,
                          color: T.ink4,
                          fontFamily: T.sans,
                        }}
                      >
                        <Icon d="M6 18L18 6M6 6l12 12" size={10} color={T.ink4} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.ink2, fontFamily: T.sans, lineHeight: 1.5 }}>
                    {c.text}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Input */}
          {canEdit && (
            <div style={{ display: "flex", gap: 8, marginTop: comments.length > 0 ? 8 : 0 }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Kommentar schreiben..."
                rows={2}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  fontSize: 12.5,
                  fontFamily: T.sans,
                  color: T.ink,
                  resize: "vertical",
                  outline: "none",
                  background: "#fff",
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              />
              <button
                onClick={handleSubmit}
                disabled={!commentText.trim() || submitting}
                style={{
                  alignSelf: "flex-end",
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  cursor: !commentText.trim() || submitting ? "not-allowed" : "pointer",
                  opacity: !commentText.trim() || submitting ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {submitting ? "..." : "Senden"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Due Date Indicator — color-coded deadline display
// =============================================================================

function DueIndicator({ due }: { due: string }) {
  if (!due) return <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>Keine Frist</span>;

  // Try to parse ISO or de-CH formatted dates
  const parsed = Date.parse(due);
  if (isNaN(parsed)) {
    return <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>Frist: {due}</span>;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(parsed);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

  let color: string = T.ink4; // default grey (no date)
  if (diffDays < 0) color = "#dc2626"; // red — overdue
  else if (diffDays <= 7) color = "#d97706"; // yellow — ≤7 days
  else color = "#16654e"; // green — >7 days

  return (
    <span style={{ fontSize: 11.5, color, fontFamily: T.sans, fontWeight: diffDays < 0 ? 600 : 400 }}>
      Frist: {due}
    </span>
  );
}
