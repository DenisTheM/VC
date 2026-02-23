import { useState, useEffect, lazy, Suspense } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { AuthGuard } from "@shared/components/AuthGuard";
import { useAuthContext } from "@shared/components/AuthContext";
import { usePageNav } from "@shared/hooks/usePageNav";
import { signOut } from "@shared/lib/auth";
import { NotificationBell } from "@shared/components/NotificationBell";
import { loadUserOrganization, type ClientOrg } from "./lib/api";

const ClientDashboard = lazy(() => import("./pages/ClientDashboard").then((m) => ({ default: m.ClientDashboard })));
const ClientAlerts = lazy(() => import("./pages/ClientAlerts").then((m) => ({ default: m.ClientAlerts })));
const ClientDocs = lazy(() => import("./pages/ClientDocs").then((m) => ({ default: m.ClientDocs })));

/* ------------------------------------------------------------------ */
/*  Client Sidebar                                                    */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: "dashboard", icon: icons.home, label: "Dashboard" },
  { id: "alerts", icon: icons.alert, label: "Meldungen" },
  { id: "docs", icon: icons.doc, label: "Dokumente" },
] as const;

function ClientSidebar({
  active,
  onNav,
  org,
  onNotificationNav,
}: {
  active: string;
  onNav: (id: string) => void;
  org: ClientOrg | null;
  onNotificationNav: (link: string) => void;
}) {
  const { profile: authProfile } = useAuthContext();
  const displayName = authProfile.full_name || "Benutzer";
  const orgShort = org?.short_name || org?.name || "Organisation";

  return (
    <div
      style={{
        width: 248,
        minHeight: "100vh",
        background: T.primaryDeep,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo / Brand */}
      <div style={{ padding: "24px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
                fontFamily: T.sans,
                letterSpacing: "-0.2px",
              }}
            >
              Virtue{" "}
              <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>Compliance</span>
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: T.sans }}>
              Kundenportal
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px 12px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: T.sans,
            }}
          >
            Navigation
          </span>
          <NotificationBell onNavigate={onNotificationNav} />
        </div>
        {NAV_ITEMS.map((it) => {
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onNav(it.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                marginBottom: 2,
                fontFamily: T.sans,
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <Icon d={it.icon} size={18} color={isActive ? T.glow : "rgba(255,255,255,0.35)"} />
              {it.label}
            </button>
          );
        })}
      </nav>

      {/* Elena contact card */}
      <div style={{ padding: "0 12px 16px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: "14px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                fontFamily: T.sans,
              }}
            >
              EH
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", fontFamily: T.sans }}>
                Elena Hartmann
              </div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: T.sans }}>
                Ihre Beraterin
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { window.location.href = "mailto:es@virtue-compliance.ch"; }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: 6,
                padding: "7px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,0.6)",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.mail} size={13} color="rgba(255,255,255,0.45)" />
              E-Mail
            </button>
            <button
              onClick={() => { window.location.href = "tel:+41799433644"; }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: 6,
                padding: "7px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,0.6)",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.phone} size={13} color="rgba(255,255,255,0.45)" />
              Anrufen
            </button>
          </div>
        </div>
      </div>

      {/* Client info footer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              fontFamily: T.sans,
            }}
          >
            {(org?.short_name || org?.name || "??").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                fontFamily: T.sans,
              }}
            >
              {orgShort}
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: T.sans }}>
              {displayName}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut().catch(() => {}).finally(() => (window.location.href = "/app/login"))}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px 0",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255,255,255,0.45)",
            fontFamily: T.sans,
          }}
        >
          <Icon d={icons.logout} size={14} color="rgba(255,255,255,0.35)" />
          Abmelden
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Portal App                                                        */
/* ------------------------------------------------------------------ */

function PortalContent() {
  const { user } = useAuthContext();
  const [page, setPage] = usePageNav("dashboard");
  const [org, setOrg] = useState<ClientOrg | null>(null);
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const [pendingDocName, setPendingDocName] = useState<string | null>(null);

  useEffect(() => {
    loadUserOrganization(user.id)
      .then(setOrg)
      .catch((err) => console.error("Failed to load organization:", err));
  }, [user.id]);

  const handleNav = (id: string) => {
    if (id !== "alerts") setPendingAlertId(null);
    if (id !== "docs") setPendingDocName(null);
    setPage(id);
  };

  const handleAlertNav = (alertId: string) => {
    setPendingAlertId(alertId);
    setPage("alerts");
  };

  const handleDocNav = (docName: string) => {
    setPendingDocName(docName);
    setPage("docs");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.s1, fontFamily: T.sans }}>
      <ClientSidebar
        active={page}
        onNav={handleNav}
        org={org}
        onNotificationNav={(link) => {
          // Parse link like "/portal/alerts" → navigate to "alerts"
          const segment = link.split("/").pop() || "dashboard";
          handleNav(segment);
        }}
      />
      <div style={{ flex: 1, overflow: "auto" }}>
        <Suspense fallback={<div style={{ padding: 40, color: T.ink3, fontFamily: T.sans }}>Laden...</div>}>
          {page === "dashboard" && <ClientDashboard onNav={handleNav} onAlertNav={handleAlertNav} org={org} />}
          {page === "alerts" && <ClientAlerts org={org} initialAlertId={pendingAlertId} onAlertConsumed={() => setPendingAlertId(null)} onDocNav={handleDocNav} />}
          {page === "docs" && <ClientDocs org={org} initialDocName={pendingDocName} onDocConsumed={() => setPendingDocName(null)} onAlertNav={handleAlertNav} />}
        </Suspense>
      </div>
    </div>
  );
}

export function PortalApp() {
  return (
    <AuthGuard requiredRole="client">
      <PortalContent />
    </AuthGuard>
  );
}
