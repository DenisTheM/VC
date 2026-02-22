import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { SEVERITY_CFG, STATUS_CFG } from "../data/regAlerts";
import { JURIS } from "../data/jurisdictions";
import { loadAlerts, type DbAlert } from "../lib/api";

interface AlertsPageProps {
  profile: Record<string, unknown>;
}

export function AlertsPage({ profile: _profile }: AlertsPageProps) {
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<DbAlert | null>(null);
  const [filterJuris, setFilterJuris] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts()
      .then(setAlerts)
      .catch((err) => console.error("Failed to load alerts:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterJuris
    ? alerts.filter((a) => a.jurisdiction === filterJuris)
    : alerts;

  const severityCounts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Alerts werden geladen...
      </div>
    );
  }

  /* ——— Detail view ——— */
  if (selectedAlert) {
    const sev = SEVERITY_CFG[selectedAlert.severity];
    const stat = STATUS_CFG[selectedAlert.status];

    return (
      <div>
        <SectionLabel text="Regulatory Alert" />
        <button
          onClick={() => setSelectedAlert(null)}
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
              {selectedAlert.title}
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
                {JURIS[selectedAlert.jurisdiction]?.flag} {selectedAlert.source} &middot; {selectedAlert.date}
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
                {selectedAlert.summary}
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
                Rechtsgrundlage: {selectedAlert.legal_basis} &middot; Frist: {selectedAlert.deadline}
              </div>
            </div>

            {/* Elena commentary (dark card) */}
            {selectedAlert.elena_comment && (
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
                  {selectedAlert.elena_comment}
                </p>
              </div>
            )}

            {/* Action items */}
            {selectedAlert.action_items.length > 0 && (
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
                  Massnahmen ({selectedAlert.action_items.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedAlert.action_items.map((item) => {
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
                            Frist: {item.due ?? "—"} &middot;{" "}
                            <span style={{ color: prioColor, fontWeight: 600 }}>
                              {item.priority === "high" ? "Hohe" : item.priority === "medium" ? "Mittlere" : "Niedrige"} Priorität
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
                Betroffene Kunden ({selectedAlert.affected_clients.length})
              </div>
              {selectedAlert.affected_clients.length === 0 ? (
                <p style={{ fontSize: 12.5, color: T.ink4, fontFamily: T.sans, margin: 0 }}>
                  Keine Kunden direkt betroffen.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedAlert.affected_clients.map((c) => {
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
            {selectedAlert.elena_comment && (
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
                  {selectedAlert.elena_comment.length > 140
                    ? selectedAlert.elena_comment.slice(0, 140) + "..."
                    : selectedAlert.elena_comment}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ——— List view ——— */
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
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Aktuelle regulatorische Entwicklungen mit Elena-Analyse.
      </p>

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

      {/* Alert cards */}
      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
          Keine Alerts gefunden.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((alert) => {
            const sev = SEVERITY_CFG[alert.severity];
            const stat = STATUS_CFG[alert.status];

            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = T.shMd;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = T.shSm;
                }}
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
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink3,
                          fontFamily: T.sans,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {alert.affected_clients.length} Kunden
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: T.ink4,
                        fontFamily: T.sans,
                      }}
                    >
                      {alert.action_items.length} Massnahmen
                    </span>
                    <Icon d={icons.arrow} size={14} color={T.ink4} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
