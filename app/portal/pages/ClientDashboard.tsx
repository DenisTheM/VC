import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { useAuthContext } from "@shared/components/AuthContext";
import { SEV } from "../data/clientData";
import { loadClientAlerts, loadPortalStats, loadClientProfile, type ClientOrg, type PortalAlert } from "../lib/api";
import { loadCustomerStats, type CustomerStats } from "../lib/customerApi";
import { PROFILE_FIELDS } from "@shared/data/profileFields";
import { calcProfileCompletion, completionColor } from "@shared/lib/profileCompletion";
import { TrustBadge } from "@shared/components/TrustBadge";
import { t } from "@shared/lib/i18n";
import { coFirstName } from "../lib/contactHelper";

interface ClientDashboardProps {
  onNav: (id: string) => void;
  onAlertNav: (alertId: string) => void;
  org: ClientOrg | null;
}

export function ClientDashboard({ onNav, onAlertNav, org }: ClientDashboardProps) {
  const { profile: authProfile } = useAuthContext();
  const firstName = authProfile.full_name?.split(" ")[0] || "User";
  const orgShort = org?.short_name || org?.name || "Ihr Unternehmen";

  const [alerts, setAlerts] = useState<PortalAlert[]>([]);
  const [stats, setStats] = useState({ totalAlerts: 0, newAlerts: 0, totalDocs: 0, currentDocs: 0 });
  const [custStats, setCustStats] = useState<CustomerStats>({ total: 0, active: 0, reviewDue: 0, docsDraft: 0, docsReview: 0, docsApproved: 0 });
  const [profilePct, setProfilePct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      loadClientAlerts(org.id),
      loadPortalStats(org.id),
      loadCustomerStats(org.id),
      loadClientProfile(org.id),
    ])
      .then(([alertsData, statsData, custStatsData, profileData]) => {
        setAlerts(alertsData);
        setStats(statsData);
        setCustStats(custStatsData);
        setProfilePct(calcProfileCompletion(profileData, PROFILE_FIELDS));
      })
      .catch((err) => console.error("Dashboard load error:", err))
      .finally(() => setLoading(false));
  }, [org]);

  const criticalAlert = alerts.find((a) => a.severity === "critical");
  const openActions = alerts.reduce((sum, a) => sum + a.actions.filter((ac) => ac.status === "offen").length, 0);
  const latestAlerts = alerts.slice(0, 3);

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      {/* Section label */}
      <SectionLabel text="Kundenportal" />

      {/* Greeting */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: T.ink,
          fontFamily: T.sans,
          margin: "0 0 4px",
          letterSpacing: "-0.5px",
        }}
      >
        {t("dashboard.greeting", { name: firstName })}
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 32px" }}>
        {t("dashboard.welcome", { org: orgShort })}
      </p>
      <div style={{ marginBottom: 24 }}>
        <TrustBadge />
      </div>

      {/* Critical alert banner */}
      {criticalAlert && (
        <div
          onClick={() => onAlertNav(criticalAlert.id)}
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            borderRadius: T.rLg,
            padding: "20px 24px",
            marginBottom: 28,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
            transition: "transform 0.15s",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)")}
          onMouseOut={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon d={icons.alert} size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: T.sans, marginBottom: 2 }}>
              Kritisches Update: {criticalAlert.title.split(":")[0]}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", fontFamily: T.sans }}>
              Direkte Auswirkung auf {orgShort} — Handlungsbedarf bis {criticalAlert.deadline}
            </div>
          </div>
          <Icon d={icons.arrow} size={18} color="rgba(255,255,255,0.7)" />
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 36 }}>
        {/* Neue Updates */}
        <div
          onClick={() => onNav("alerts")}
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            cursor: "pointer",
            transition: "box-shadow 0.15s, transform 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: T.accentS,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon d={icons.alert} size={16} color={T.accent} />
            </div>
            <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>{t("dashboard.new_updates")}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: T.ink, fontFamily: T.sans, letterSpacing: "-1px" }}>
            {stats.newAlerts}
          </div>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
            {t("dashboard.regulatory_alerts")}
          </div>
        </div>

        {/* Offene Massnahmen */}
        <div
          onClick={() => onNav("alerts")}
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            cursor: "pointer",
            transition: "box-shadow 0.15s, transform 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#fffbeb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon d={icons.clock} size={16} color="#d97706" />
            </div>
            <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>{t("dashboard.open_actions")}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: T.ink, fontFamily: T.sans, letterSpacing: "-1px" }}>
            {openActions}
          </div>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
            aus {alerts.filter((a) => a.actions.length > 0).length} Meldungen
          </div>
        </div>

        {/* Compliance Status */}
        <div
          onClick={() => onNav("docs")}
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            cursor: "pointer",
            transition: "box-shadow 0.15s, transform 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: T.accentS,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon d={icons.shield} size={16} color={T.accent} />
            </div>
            <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>{t("dashboard.compliance_status")}</span>
          </div>
          {profilePct != null ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 700, color: completionColor(profilePct).color, fontFamily: T.sans, letterSpacing: "-1px" }}>
                {profilePct}%
              </div>
              <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                {t("dashboard.profile_completeness")}
              </div>
              <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: T.s2 }}>
                <div style={{ height: 4, borderRadius: 2, background: completionColor(profilePct).color, width: `${profilePct}%`, transition: "width 0.3s" }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, fontWeight: 700, color: T.accent, fontFamily: T.sans, letterSpacing: "-1px" }}>
                Aktiv
              </div>
              <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                Betreuung durch Virtue Compliance
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer stat cards */}
      {custStats.total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 36 }}>
          {/* Kunden */}
          <div
            onClick={() => onNav("customers")}
            style={{
              background: "#fff", borderRadius: T.rLg, padding: "22px 24px",
              border: `1px solid ${T.border}`, boxShadow: T.shSm, cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={icons.users} size={16} color="#3b82f6" />
              </div>
              <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>Kunden</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: T.ink, fontFamily: T.sans, letterSpacing: "-1px" }}>
              {custStats.active}
            </div>
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
              aktiv von {custStats.total} gesamt
            </div>
          </div>

          {/* Überprüfung fällig */}
          <div
            onClick={() => onNav("customers")}
            style={{
              background: "#fff", borderRadius: T.rLg, padding: "22px 24px",
              border: `1px solid ${T.border}`, boxShadow: T.shSm, cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={icons.clock} size={16} color="#d97706" />
              </div>
              <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>Überprüfung fällig</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: custStats.reviewDue > 0 ? "#d97706" : T.ink, fontFamily: T.sans, letterSpacing: "-1px" }}>
              {custStats.reviewDue}
            </div>
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
              in den nächsten 30 Tagen
            </div>
          </div>

          {/* Kundendokumente */}
          <div
            onClick={() => onNav("customers")}
            style={{
              background: "#fff", borderRadius: T.rLg, padding: "22px 24px",
              border: `1px solid ${T.border}`, boxShadow: T.shSm, cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentS, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={icons.doc} size={16} color={T.accent} />
              </div>
              <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>Kundendokumente</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: T.accent, fontFamily: T.sans, letterSpacing: "-1px" }}>
              {custStats.docsApproved}
            </div>
            <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
              freigegeben &middot; {custStats.docsDraft} Entwürfe &middot; {custStats.docsReview} zur Prüfung
            </div>
          </div>
        </div>
      )}

      {/* Latest alerts preview */}
      {latestAlerts.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: 0 }}>
              {t("dashboard.latest_alerts")}
            </h2>
            <button
              onClick={() => onNav("alerts")}
              style={{
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: T.sans,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {t("dashboard.show_all")} <Icon d={icons.arrow} size={14} color={T.accent} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {latestAlerts.map((alert) => {
              const sev = SEV[alert.severity] ?? SEV.info;
              return (
                <div
                  key={alert.id}
                  onClick={() => onAlertNav(alert.id)}
                  style={{
                    background: "#fff",
                    borderRadius: T.r,
                    padding: "16px 20px",
                    border: `1px solid ${T.border}`,
                    boxShadow: T.shSm,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseOver={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd)}
                  onMouseOut={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm)}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: sev.border,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
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
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: T.ink,
                        fontFamily: T.sans,
                        marginBottom: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {alert.title}
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
                      {coFirstName(org)}: {alert.elenaComment.slice(0, 140)}...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
