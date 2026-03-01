import { useState, useEffect, lazy, Suspense } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { AuthGuard } from "@shared/components/AuthGuard";
import { useAuthContext } from "@shared/components/AuthContext";
import { usePageNav } from "@shared/hooks/usePageNav";
import { useBreakpoint } from "@shared/hooks/useBreakpoint";
import { signOut } from "@shared/lib/auth";
import { NotificationBell } from "@shared/components/NotificationBell";
import { LanguageSwitcher } from "@shared/components/LanguageSwitcher";
import { t } from "@shared/lib/i18n";
import { loadUserOrganization, type ClientOrg } from "./lib/api";
import { coName, coInitials, coEmail, coPhone, coRole } from "./lib/contactHelper";

const ClientDashboard = lazy(() => import("./pages/ClientDashboard").then((m) => ({ default: m.ClientDashboard })));
const ClientAlerts = lazy(() => import("./pages/ClientAlerts").then((m) => ({ default: m.ClientAlerts })));
const ClientDocs = lazy(() => import("./pages/ClientDocs").then((m) => ({ default: m.ClientDocs })));
const ClientCustomers = lazy(() => import("./pages/ClientCustomers").then((m) => ({ default: m.ClientCustomers })));
const ClientHelp = lazy(() => import("./pages/ClientHelp").then((m) => ({ default: m.ClientHelp })));
const ClientMessages = lazy(() => import("./pages/ClientMessages").then((m) => ({ default: m.ClientMessages })));
const ClientAuditReadiness = lazy(() => import("./pages/ClientAuditReadiness").then((m) => ({ default: m.ClientAuditReadiness })));
const DocumentApproval = lazy(() => import("./pages/DocumentApproval").then((m) => ({ default: m.DocumentApproval })));
const KycOnboardingPage = lazy(() => import("./pages/KycOnboardingPage").then((m) => ({ default: m.KycOnboardingPage })));
const MrosWizardPage = lazy(() => import("./pages/MrosWizardPage").then((m) => ({ default: m.MrosWizardPage })));
const ComplianceChecklistPage = lazy(() => import("./pages/ComplianceChecklistPage").then((m) => ({ default: m.ComplianceChecklistPage })));
const PkycDashboardPage = lazy(() => import("./pages/PkycDashboardPage").then((m) => ({ default: m.PkycDashboardPage })));
const UboDeclarationPage = lazy(() => import("./pages/UboDeclarationPage").then((m) => ({ default: m.UboDeclarationPage })));
const ElearningPage = lazy(() => import("./pages/ElearningPage").then((m) => ({ default: m.ElearningPage })));
const ComplianceHubPage = lazy(() => import("./pages/ComplianceHubPage").then((m) => ({ default: m.ComplianceHubPage })));

/* ------------------------------------------------------------------ */
/*  Client Sidebar                                                    */
/* ------------------------------------------------------------------ */

interface NavSection {
  title: string;
  items: { id: string; icon: string; label: string }[];
}

function getNavSections(): NavSection[] {
  return [
    {
      title: t("portal.nav.group.overview"),
      items: [
        { id: "dashboard", icon: icons.home, label: t("portal.nav.dashboard") },
        { id: "alerts", icon: icons.alert, label: t("portal.nav.alerts") },
        { id: "messages", icon: icons.mail, label: t("portal.nav.messages") },
      ],
    },
    {
      title: t("portal.nav.group.customer_review"),
      items: [
        { id: "customers", icon: icons.users, label: t("portal.nav.customers") },
        { id: "pkyc", icon: icons.eye, label: t("portal.nav.pkyc") },
        { id: "mros", icon: icons.flag, label: t("portal.nav.mros") },
      ],
    },
    {
      title: t("portal.nav.group.compliance"),
      items: [
        { id: "docs", icon: icons.doc, label: t("portal.nav.docs") },
        { id: "compliance_hub", icon: icons.list, label: t("portal.nav.compliance_hub") },
      ],
    },
    {
      title: t("portal.nav.group.education"),
      items: [
        { id: "training", icon: icons.academic, label: t("portal.nav.training") },
        { id: "help", icon: icons.phone, label: t("portal.nav.help") },
      ],
    },
  ];
}

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
            padding: "6px 10px 8px",
          }}
        >
          <NotificationBell onNavigate={onNotificationNav} />
        </div>
        {getNavSections().map((section, idx) => (
          <div key={section.title} style={{ marginTop: idx > 0 ? 16 : 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                padding: "6px 10px 8px",
                fontFamily: T.sans,
              }}
            >
              {section.title}
            </div>
            {section.items.map((it) => {
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
          </div>
        ))}
      </nav>

      {/* Compliance Officer contact card */}
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
              {coInitials(org)}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", fontFamily: T.sans }}>
                {coName(org)}
              </div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: T.sans }}>
                {coRole(org)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { window.location.href = "mailto:" + coEmail(org); }}
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
            {coPhone(org) && (
              <button
                onClick={() => { window.location.href = "tel:" + coPhone(org); }}
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
            )}
          </div>
        </div>
      </div>

      {/* Language switcher */}
      <div style={{ padding: "0 12px 8px" }}>
        <LanguageSwitcher />
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();
  const compact = isMobile || isTablet;

  useEffect(() => {
    loadUserOrganization(user.id)
      .then(setOrg)
      .catch((err) => console.error("Failed to load organization:", err));
  }, [user.id]);

  const handleNav = (id: string) => {
    if (id !== "alerts") setPendingAlertId(null);
    if (id !== "docs") setPendingDocName(null);
    setPage(id);
    if (compact) setMobileMenuOpen(false);
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
      {/* Mobile top bar */}
      {compact && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 52,
            background: T.primaryDeep,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            zIndex: 1001,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              display: "flex",
            }}
          >
            <Icon d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} size={20} color="rgba(255,255,255,0.8)" />
          </button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: T.sans }}>
            Virtue <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>Compliance</span>
          </div>
          <NotificationBell onNavigate={(link) => { handleNav(link.split("/").pop() || "dashboard"); }} />
        </div>
      )}

      {/* Backdrop */}
      {compact && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1002,
          }}
        />
      )}

      {/* Sidebar — desktop: fixed, mobile: overlay drawer */}
      <div
        style={{
          ...(compact ? {
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 248,
            zIndex: 1003,
            transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          } : {
            width: 248,
            flexShrink: 0,
          }),
        }}
      >
        <ClientSidebar
          active={page}
          onNav={handleNav}
          org={org}
          onNotificationNav={(link) => { handleNav(link.split("/").pop() || "dashboard"); }}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto", paddingTop: compact ? 52 : 0 }}>
        <Suspense fallback={<div style={{ padding: compact ? 20 : 40, color: T.ink3, fontFamily: T.sans }}>Laden...</div>}>
          {page === "dashboard" && <ClientDashboard onNav={handleNav} onAlertNav={handleAlertNav} org={org} />}
          {page === "alerts" && <ClientAlerts org={org} initialAlertId={pendingAlertId} onAlertConsumed={() => setPendingAlertId(null)} onDocNav={handleDocNav} />}
          {page === "docs" && <ClientDocs org={org} initialDocName={pendingDocName} onDocConsumed={() => setPendingDocName(null)} onAlertNav={handleAlertNav} />}
          {page === "approvals" && <DocumentApproval org={org} />}
          {page === "customers" && <ClientCustomers org={org} onNav={handleNav} />}
          {page === "kyc" && <KycOnboardingPage org={org} />}
          {page === "mros" && <MrosWizardPage org={org} />}
          {page === "compliance_hub" && <ComplianceHubPage org={org} />}
          {page === "checklist" && <ComplianceChecklistPage org={org} />}
          {page === "pkyc" && <PkycDashboardPage org={org} />}
          {page === "ubo" && <UboDeclarationPage org={org} />}
          {page === "training" && <ElearningPage org={org} />}
          {page === "readiness" && <ClientAuditReadiness org={org} />}
          {page === "messages" && <ClientMessages org={org} />}
          {page === "help" && <ClientHelp org={org} />}
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
