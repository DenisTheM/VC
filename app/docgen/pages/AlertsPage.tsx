import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { SEVERITY_CFG, STATUS_CFG } from "../data/regAlerts";
import { JURIS } from "../data/jurisdictions";
import {
  loadAlerts,
  loadDraftAlerts,
  loadDismissedAlerts,
  saveDraftAlert,
  publishAlert,
  dismissAlert,
  restoreAlert,
  loadOrganizations,
  type DbAlert,
  type DbAffectedClient,
  type Organization,
} from "../lib/api";

type Tab = "active" | "drafts" | "dismissed";

interface AlertsPageProps {
  profile: Record<string, unknown>;
}

export function AlertsPage({ profile: _profile }: AlertsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [draftAlerts, setDraftAlerts] = useState<DbAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<DbAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<DbAlert | null>(null);
  const [filterJuris, setFilterJuris] = useState<string | null>(null);
  const [draftDetail, setDraftDetail] = useState<DbAlert | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const reload = async () => {
    setLoading(true);
    try {
      const [active, drafts, dismissed, orgs] = await Promise.all([
        loadAlerts(),
        loadDraftAlerts(),
        loadDismissedAlerts(),
        loadOrganizations(),
      ]);
      setAlerts(active);
      setDraftAlerts(drafts);
      setDismissedAlerts(dismissed);
      setOrganizations(orgs);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Alerts werden geladen...
      </div>
    );
  }

  /* ——— Draft Detail View ——— */
  if (draftDetail) {
    return (
      <DraftDetailView
        alert={draftDetail}
        organizations={organizations}
        onBack={() => { setDraftDetail(null); reload(); }}
        onPublished={() => { setDraftDetail(null); setActiveTab("active"); reload(); }}
      />
    );
  }

  /* ——— Active Alert Detail View ——— */
  if (selectedAlert) {
    return <AlertDetailView alert={selectedAlert} onBack={() => setSelectedAlert(null)} />;
  }

  const filtered = filterJuris
    ? alerts.filter((a) => a.jurisdiction === filterJuris)
    : alerts;

  const severityCounts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  /* ——— Tab Bar + List Views ——— */
  return (
    <div>
      <SectionLabel text="Regulatory Intelligence" />
      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 28,
          fontWeight: 700,
          color: T.ink,
          margin: "0 0 2px",
        }}
      >
        Regulatorische Alerts
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 20px" }}>
        Aktuelle regulatorische Entwicklungen mit Elena-Analyse.
      </p>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `2px solid ${T.border}` }}>
        {([
          { key: "active" as Tab, label: "Aktive Alerts", count: alerts.length },
          { key: "drafts" as Tab, label: "Entwuerfe", count: draftAlerts.length },
          { key: "dismissed" as Tab, label: "Verworfen", count: dismissedAlerts.length },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: activeTab === key ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: -2,
              background: "none",
              color: activeTab === key ? T.accent : T.ink3,
              fontSize: 13.5,
              fontWeight: activeTab === key ? 600 : 400,
              cursor: "pointer",
              fontFamily: T.sans,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {label}
            {count > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "1px 7px",
                  borderRadius: 10,
                  background: activeTab === key ? T.accentS : T.s2,
                  color: activeTab === key ? T.accent : T.ink4,
                }}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active Tab */}
      {activeTab === "active" && (
        <>
          {/* Severity stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {(Object.entries(SEVERITY_CFG) as [keyof typeof SEVERITY_CFG, (typeof SEVERITY_CFG)[keyof typeof SEVERITY_CFG]][]).map(
              ([key, cfg]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: T.r,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: cfg.color, fontFamily: T.sans }}>
                    {severityCounts[key]}
                  </span>
                  <span style={{ fontSize: 12, color: cfg.color, fontFamily: T.sans, opacity: 0.8 }}>
                    {cfg.label}
                  </span>
                </div>
              ),
            )}
          </div>

          {/* Jurisdiction filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            <button
              onClick={() => setFilterJuris(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 16,
                border: `1px solid ${!filterJuris ? T.accent : T.border}`,
                background: !filterJuris ? T.accentS : "#fff",
                color: !filterJuris ? T.accent : T.ink3,
                fontSize: 12.5,
                fontWeight: !filterJuris ? 600 : 400,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              Alle
            </button>
            {Object.entries(JURIS).map(([key, j]) => (
              <button
                key={key}
                onClick={() => setFilterJuris(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 16,
                  border: `1px solid ${filterJuris === key ? T.accent : T.border}`,
                  background: filterJuris === key ? T.accentS : "#fff",
                  color: filterJuris === key ? T.accent : T.ink3,
                  fontSize: 12.5,
                  fontWeight: filterJuris === key ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: T.sans,
                }}
              >
                {j.flag} {j.name}
              </button>
            ))}
          </div>

          <AlertCardList alerts={filtered} onSelect={setSelectedAlert} />
        </>
      )}

      {/* Drafts Tab */}
      {activeTab === "drafts" && (
        <>
          {draftAlerts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
              Keine Entwuerfe vorhanden. Neue Alerts werden automatisch aus den konfigurierten Quellen erstellt.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draftAlerts.map((alert) => {
                const sev = SEVERITY_CFG[alert.ai_severity as keyof typeof SEVERITY_CFG] ?? SEVERITY_CFG.info;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setDraftDetail(alert)}
                    style={{
                      background: "#fff",
                      borderRadius: T.rLg,
                      padding: "18px 22px",
                      border: `1px solid ${T.border}`,
                      borderLeft: `4px solid ${T.ink4}`,
                      boxShadow: T.shSm,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shMd; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shSm; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: T.s2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {sev.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 4 }}>
                          {alert.title}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 8,
                              background: STATUS_CFG.draft.bg,
                              color: STATUS_CFG.draft.color,
                              fontFamily: T.sans,
                            }}
                          >
                            {STATUS_CFG.draft.label}
                          </span>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 8,
                              background: sev.bg,
                              color: sev.color,
                              border: `1px solid ${sev.border}`,
                              fontFamily: T.sans,
                            }}
                          >
                            AI: {sev.label}
                          </span>
                          {alert.ai_category && (
                            <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                              {alert.ai_category}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                            {alert.source} &middot; {alert.date}
                          </span>
                        </div>
                        <p style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, lineHeight: 1.5, margin: 0 }}>
                          {alert.auto_summary && alert.auto_summary.length > 140
                            ? alert.auto_summary.slice(0, 140) + "..."
                            : alert.auto_summary}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <span style={{ fontSize: 11, color: T.ink3, fontFamily: T.sans }}>
                          {alert.affected_clients.length} Kunden
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 12px",
                            borderRadius: 8,
                            background: T.accentS,
                            color: T.accent,
                            fontFamily: T.sans,
                            cursor: "pointer",
                          }}
                        >
                          Pruefen
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Dismissed Tab */}
      {activeTab === "dismissed" && (
        <>
          {dismissedAlerts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
              Keine verworfenen Alerts.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dismissedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: "#fff",
                    borderRadius: T.r,
                    padding: "14px 18px",
                    border: `1px solid ${T.borderL}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: 0.7,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink3, fontFamily: T.sans }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                      {alert.source} &middot; {alert.date}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await restoreAlert(alert.id);
                        await reload();
                      } catch (err) {
                        console.error("Failed to restore alert:", err);
                      }
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: "#fff",
                      color: T.ink2,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: T.sans,
                    }}
                  >
                    Wiederherstellen
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Shared alert card list for the active tab */
function AlertCardList({
  alerts,
  onSelect,
}: {
  alerts: DbAlert[];
  onSelect: (a: DbAlert) => void;
}) {
  if (alerts.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Keine Alerts gefunden.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {alerts.map((alert) => {
        const sev = SEVERITY_CFG[alert.severity];
        const stat = STATUS_CFG[alert.status] ?? STATUS_CFG.new;

        return (
          <div
            key={alert.id}
            onClick={() => onSelect(alert)}
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "20px 24px",
              border: `1px solid ${T.border}`,
              borderLeft: `4px solid ${sev.border}`,
              boxShadow: T.shSm,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shMd; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shSm; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: sev.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {sev.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                    {alert.title}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 8,
                      background: sev.bg,
                      color: sev.color,
                      border: `1px solid ${sev.border}`,
                      fontFamily: T.sans,
                    }}
                  >
                    {sev.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 8,
                      background: stat.bg,
                      color: stat.color,
                      fontFamily: T.sans,
                    }}
                  >
                    {stat.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>
                    {JURIS[alert.jurisdiction]?.flag} {alert.source} &middot; {alert.date}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, lineHeight: 1.5, margin: "0 0 10px" }}>
                  {alert.summary && alert.summary.length > 160
                    ? alert.summary.slice(0, 160) + "..."
                    : alert.summary}
                </p>

                {/* Elena mini-preview */}
                {alert.elena_comment && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: T.r,
                      background: T.primary + "08",
                      border: `1px solid ${T.primary}16`,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: T.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <Icon d={icons.sparkle} size={10} color="#fff" />
                    </div>
                    <p style={{ fontSize: 12, color: T.ink2, fontFamily: T.sans, lineHeight: 1.45, margin: 0 }}>
                      {alert.elena_comment.length > 120
                        ? alert.elena_comment.slice(0, 120) + "..."
                        : alert.elena_comment}
                    </p>
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {alert.affected_clients.length > 0 && (
                  <span style={{ fontSize: 11, color: T.ink3, fontFamily: T.sans, whiteSpace: "nowrap" }}>
                    {alert.affected_clients.length} Kunden
                  </span>
                )}
                <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                  {alert.action_items.length} Massnahmen
                </span>
                <Icon d={icons.arrow} size={14} color={T.ink4} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Alert Detail View (for active/published alerts — read-only)
// =============================================================================

function AlertDetailView({ alert, onBack }: { alert: DbAlert; onBack: () => void }) {
  const sev = SEVERITY_CFG[alert.severity];
  const stat = STATUS_CFG[alert.status] ?? STATUS_CFG.new;

  return (
    <div>
      <SectionLabel text="Regulatory Alert" />
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
        Alle Alerts
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: sev.bg,
            border: `1px solid ${sev.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {sev.icon}
        </div>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: T.serif,
              fontSize: 24,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 4px",
            }}
          >
            {alert.title}
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 10,
                background: sev.bg,
                color: sev.color,
                border: `1px solid ${sev.border}`,
                fontFamily: T.sans,
              }}
            >
              {sev.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 10,
                background: stat.bg,
                color: stat.color,
                fontFamily: T.sans,
              }}
            >
              {stat.label}
            </span>
            <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>
              {JURIS[alert.jurisdiction]?.flag} {alert.source} &middot; {alert.date}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <div
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "22px 24px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 10 }}>
              Zusammenfassung
            </div>
            <p style={{ fontSize: 13.5, color: T.ink2, fontFamily: T.sans, lineHeight: 1.6, margin: 0 }}>
              {alert.summary}
            </p>
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: T.r,
                background: T.s1,
                fontSize: 12,
                color: T.ink3,
                fontFamily: T.sans,
              }}
            >
              Rechtsgrundlage: {alert.legal_basis} &middot; Frist: {alert.deadline}
            </div>
          </div>

          {/* Elena commentary (dark card) */}
          {alert.elena_comment && (
            <div
              style={{
                background: T.primaryDeep,
                borderRadius: T.rLg,
                padding: "22px 24px",
                boxShadow: T.shMd,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: T.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon d={icons.sparkle} size={14} color="#fff" />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: T.sans }}>
                    Elena
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: T.sans, marginLeft: 6 }}>
                    Compliance-Analyse
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: T.sans,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {alert.elena_comment}
              </p>
            </div>
          )}

          {/* Action items */}
          {alert.action_items.length > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: T.rLg,
                padding: "22px 24px",
                border: `1px solid ${T.border}`,
                boxShadow: T.shSm,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 14 }}>
                Massnahmen ({alert.action_items.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alert.action_items.map((item) => {
                  const prioColor =
                    item.priority === "high" ? T.red : item.priority === "medium" ? T.amber : T.accent;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: T.r,
                        border: `1px solid ${T.borderL}`,
                        background: T.s1,
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${prioColor}`,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, fontFamily: T.sans }}>
                          {item.text}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 3 }}>
                          Frist: {item.due ?? "\u2014"} &middot;{" "}
                          <span style={{ color: prioColor, fontWeight: 600 }}>
                            {item.priority === "high" ? "Hohe" : item.priority === "medium" ? "Mittlere" : "Niedrige"} Prioritaet
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: affected clients */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "20px 22px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 12 }}>
              Betroffene Kunden ({alert.affected_clients.length})
            </div>
            {alert.affected_clients.length === 0 ? (
              <p style={{ fontSize: 12.5, color: T.ink4, fontFamily: T.sans, margin: 0 }}>
                Keine Kunden direkt betroffen.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alert.affected_clients.map((c) => {
                  const riskColor = c.risk === "high" ? T.red : c.risk === "medium" ? T.amber : T.accent;
                  const clientName = c.organizations?.name ?? "Unbekannt";
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: T.r,
                        border: `1px solid ${T.borderL}`,
                        background: T.s1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                          {clientName}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 8,
                            background: riskColor + "18",
                            color: riskColor,
                            fontFamily: T.sans,
                          }}
                        >
                          {c.risk === "high" ? "Hoch" : c.risk === "medium" ? "Mittel" : "Niedrig"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.ink3, fontFamily: T.sans, lineHeight: 1.4 }}>
                        {c.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Elena mini-preview */}
          {alert.elena_comment && (
            <div
              style={{
                background: T.primaryDeep,
                borderRadius: T.rLg,
                padding: "18px 20px",
                boxShadow: T.shSm,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: T.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon d={icons.sparkle} size={12} color="#fff" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: T.sans }}>
                  Elena empfiehlt
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: T.sans,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {alert.elena_comment.length > 140
                  ? alert.elena_comment.slice(0, 140) + "..."
                  : alert.elena_comment}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Draft Detail View — Claude-prepared review + editing UI
// =============================================================================

interface DraftDetailViewProps {
  alert: DbAlert;
  organizations: Organization[];
  onBack: () => void;
  onPublished: () => void;
}

function DraftDetailView({ alert, organizations, onBack, onPublished }: DraftDetailViewProps) {
  const [severity, setSeverity] = useState(alert.ai_severity || alert.severity || "medium");
  const [category, setCategory] = useState(alert.ai_category || alert.category || "");
  const [legalBasis, setLegalBasis] = useState(alert.ai_legal_basis || alert.legal_basis || "");
  const [deadline, setDeadline] = useState(alert.deadline || "");
  const [summary, setSummary] = useState(alert.auto_summary || alert.summary || "");
  const [elenaComment, setElenaComment] = useState(alert.ai_comment || alert.elena_comment || "");
  const [jurisdiction, setJurisdiction] = useState(alert.jurisdiction || "CH");

  const [affectedClients, setAffectedClients] = useState<
    { id?: string; organization_id: string; risk: string; reason: string; elena_comment: string; org_name: string }[]
  >(
    alert.affected_clients.map((c) => ({
      id: c.id,
      organization_id: c.organization_id,
      risk: c.ai_risk || c.risk || "medium",
      reason: c.ai_reason || c.reason || "",
      elena_comment: c.ai_elena_comment || c.elena_comment || "",
      org_name: c.organizations?.name ?? "Unbekannt",
    })),
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  const usedOrgIds = new Set(affectedClients.map((c) => c.organization_id));
  const availableOrgs = organizations.filter((o) => !usedOrgIds.has(o.id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraftAlert(
        alert.id,
        { severity, category, legal_basis: legalBasis, deadline, elena_comment: elenaComment, summary, jurisdiction },
        affectedClients.map((c) => ({
          id: c.id,
          organization_id: c.organization_id,
          risk: c.risk,
          reason: c.reason,
          elena_comment: c.elena_comment,
        })),
      );
      onBack();
    } catch (err) {
      console.error("Save draft failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishAlert(
        alert.id,
        { severity, category, legal_basis: legalBasis, deadline, elena_comment: elenaComment, summary },
        affectedClients.map((c) => ({
          organization_id: c.organization_id,
          risk: c.risk,
          reason: c.reason,
          elena_comment: c.elena_comment,
        })),
      );
      onPublished();
    } catch (err) {
      console.error("Publish alert failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissAlert(alert.id);
      onBack();
    } catch (err) {
      console.error("Dismiss alert failed:", err);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    fontSize: 13,
    fontFamily: T.sans,
    color: T.ink,
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: T.ink2,
    fontFamily: T.sans,
    marginBottom: 4,
    display: "block",
  };

  return (
    <div>
      <SectionLabel text="Entwurf pruefen" />
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
        Alle Entwuerfe
      </button>

      {/* Title + source link */}
      <h1 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.ink, margin: "0 0 4px" }}>
        {alert.title}
      </h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>
          {alert.source} &middot; {alert.date}
        </span>
        {alert.source_url && (
          <a
            href={alert.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: T.accent,
              fontFamily: T.sans,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon d={icons.ext} size={12} color={T.accent} />
            Original
          </a>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        {/* Left column: Alert analysis */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "22px 24px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 16 }}>
              Alert-Analyse
              <span style={{ fontSize: 11, fontWeight: 400, color: T.ink4, marginLeft: 8 }}>
                von Claude AI vorbereitet
              </span>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Zusammenfassung</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Severity + Category row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={inputStyle}
                >
                  <option value="critical">Kritisch</option>
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Kategorie</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={inputStyle}
                  placeholder="z.B. GwG / AMLA"
                />
              </div>
            </div>

            {/* Jurisdiction + Legal Basis */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Jurisdiktion</label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  style={inputStyle}
                >
                  <option value="CH">CH</option>
                  <option value="EU">EU</option>
                  <option value="DE">DE</option>
                  <option value="US">US</option>
                  <option value="INT">INT</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Rechtsgrundlage</label>
                <input
                  type="text"
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Deadline */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Frist / Deadline</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={inputStyle}
                placeholder="z.B. Q3 2026 oder Sofort anwendbar"
              />
            </div>

            {/* Elena comment */}
            <div>
              <label style={labelStyle}>Elena-Kommentar (Admin)</label>
              <textarea
                value={elenaComment}
                onChange={(e) => setElenaComment(e.target.value)}
                rows={5}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        {/* Right column: Client impact */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "20px 22px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                Kundenauswirkung ({affectedClients.length})
              </div>
              {availableOrgs.length > 0 && (
                <button
                  onClick={() => setShowAddClient(!showAddClient)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: `1px solid ${T.accent}`,
                    background: T.accentS,
                    color: T.accent,
                    cursor: "pointer",
                    fontFamily: T.sans,
                  }}
                >
                  + Kunde hinzufuegen
                </button>
              )}
            </div>

            {/* Add client dropdown */}
            {showAddClient && availableOrgs.length > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.s1,
                }}
              >
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.sans, marginBottom: 6 }}>
                  Organisation auswaehlen:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {availableOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setAffectedClients([
                          ...affectedClients,
                          {
                            organization_id: org.id,
                            risk: "medium",
                            reason: "",
                            elena_comment: "",
                            org_name: org.name,
                          },
                        ]);
                        setShowAddClient(false);
                      }}
                      style={{
                        textAlign: "left",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `1px solid ${T.borderL}`,
                        background: "#fff",
                        color: T.ink,
                        fontSize: 12.5,
                        cursor: "pointer",
                        fontFamily: T.sans,
                      }}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Client list */}
            {affectedClients.length === 0 ? (
              <p style={{ fontSize: 12.5, color: T.ink4, fontFamily: T.sans, margin: 0 }}>
                Keine Kunden als betroffen identifiziert.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {affectedClients.map((client, idx) => (
                  <div
                    key={client.organization_id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: T.r,
                      border: `1px solid ${T.borderL}`,
                      background: T.s1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                        {client.org_name}
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          value={client.risk}
                          onChange={(e) => {
                            const updated = [...affectedClients];
                            updated[idx] = { ...updated[idx], risk: e.target.value };
                            setAffectedClients(updated);
                          }}
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            border: `1px solid ${T.border}`,
                            fontSize: 11,
                            fontFamily: T.sans,
                            background: "#fff",
                          }}
                        >
                          <option value="high">Hoch</option>
                          <option value="medium">Mittel</option>
                          <option value="low">Niedrig</option>
                        </select>
                        <button
                          onClick={() => {
                            setAffectedClients(affectedClients.filter((_, i) => i !== idx));
                          }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: `1px solid ${T.borderL}`,
                            background: "#fff",
                            color: T.red,
                            fontSize: 14,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            padding: 0,
                          }}
                          title="Entfernen"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Begruendung</label>
                      <textarea
                        value={client.reason}
                        onChange={(e) => {
                          const updated = [...affectedClients];
                          updated[idx] = { ...updated[idx], reason: e.target.value };
                          setAffectedClients(updated);
                        }}
                        rows={2}
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Kundenspez. Hinweis</label>
                      <textarea
                        value={client.elena_comment}
                        onChange={(e) => {
                          const updated = [...affectedClients];
                          updated[idx] = { ...updated[idx], elena_comment: e.target.value };
                          setAffectedClients(updated);
                        }}
                        rows={2}
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          marginTop: 24,
          padding: "16px 0",
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: "#fff",
            color: T.ink3,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: T.sans,
          }}
        >
          Verwerfen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: "#fff",
            color: T.ink,
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            fontFamily: T.sans,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: T.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: publishing ? "default" : "pointer",
            fontFamily: T.sans,
            opacity: publishing ? 0.6 : 1,
          }}
        >
          {publishing ? "Wird veroeffentlicht..." : "Freigeben & Veroeffentlichen"}
        </button>
      </div>
    </div>
  );
}
