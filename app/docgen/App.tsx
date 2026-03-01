import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { Sidebar, type SidebarSection } from "@shared/components/Sidebar";
import { AuthGuard } from "@shared/components/AuthGuard";
import { useAuthContext } from "@shared/components/AuthContext";
import { usePageNav } from "@shared/hooks/usePageNav";
import { useBreakpoint } from "@shared/hooks/useBreakpoint";
import { signOut } from "@shared/lib/auth";
import { LanguageSwitcher } from "@shared/components/LanguageSwitcher";
import { t } from "@shared/lib/i18n";
import { PROFILE_FIELDS } from "./data/profileFields";
import { loadOrganizations, loadCompanyProfile, saveCompanyProfile, loadDashboardStats, type Organization, type ZefixResult } from "./lib/api";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const OrganizationsPage = lazy(() => import("./pages/OrganizationsPage").then((m) => ({ default: m.OrganizationsPage })));
const GenerateWizard = lazy(() => import("./pages/GenerateWizard").then((m) => ({ default: m.GenerateWizard })));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then((m) => ({ default: m.AlertsPage })));
const AuditReadinessPage = lazy(() => import("./pages/AuditReadinessPage").then((m) => ({ default: m.AuditReadinessPage })));
const RiskScoringPage = lazy(() => import("./pages/RiskScoringPage").then((m) => ({ default: m.RiskScoringPage })));
const ScreeningPage = lazy(() => import("./pages/ScreeningPage").then((m) => ({ default: m.ScreeningPage })));
const KycCasesPage = lazy(() => import("./pages/KycCasesPage").then((m) => ({ default: m.KycCasesPage })));
const SarOverviewPage = lazy(() => import("./pages/SarOverviewPage").then((m) => ({ default: m.SarOverviewPage })));
const SroPackagesPage = lazy(() => import("./pages/SroPackagesPage").then((m) => ({ default: m.SroPackagesPage })));
const PkycOverviewPage = lazy(() => import("./pages/PkycOverviewPage").then((m) => ({ default: m.PkycOverviewPage })));
const LetaOverviewPage = lazy(() => import("./pages/LetaOverviewPage").then((m) => ({ default: m.LetaOverviewPage })));
const TrainingOverviewPage = lazy(() => import("./pages/TrainingOverviewPage").then((m) => ({ default: m.TrainingOverviewPage })));

function DocGenInner() {
  const { user, profile: authProfile } = useAuthContext();
  const displayName = authProfile.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const [page, setPage] = usePageNav("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();
  const compact = isMobile || isTablet;
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null);
  const [dashStats, setDashStats] = useState({ documentCount: 0, alertCount: 0, draftAlertCount: 0, expiringDocCount: 0 });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [profile, setProfile] = useState<Record<string, unknown>>(() => {
    const p: Record<string, unknown> = {};
    PROFILE_FIELDS.forEach((f) => {
      p[f.id] = f.type === "multi" ? [] : f.type === "toggle" ? false : "";
    });
    return p;
  });

  // Load organizations + dashboard stats in parallel on mount
  useEffect(() => {
    Promise.all([loadOrganizations(), loadDashboardStats()])
      .then(([orgs, stats]) => {
        setOrganizations(orgs);
        setDashStats(stats);
      })
      .catch((err) => console.error("Failed to load initial data:", err))
      .finally(() => setProfileLoaded(true));
  }, []);

  // Save company profile to Supabase
  const handleSaveProfile = useCallback(async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const ts = await saveCompanyProfile(orgId, profile, user.id);
      setUpdatedAt(ts);
    } catch (err) {
      console.error("Failed to save profile:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [orgId, profile, user.id]);

  // Switch to a different organization's profile
  const handleSelectOrg = useCallback(async (selectedOrgId: string) => {
    setOrgId(selectedOrgId);
    // Reset profile to empty, then load selected org's data
    const defaults: Record<string, unknown> = {};
    PROFILE_FIELDS.forEach((f) => {
      defaults[f.id] = f.type === "multi" ? [] : f.type === "toggle" ? false : "";
    });
    setProfile(defaults);

    const cp = await loadCompanyProfile(selectedOrgId);
    if (cp?.data && typeof cp.data === "object") {
      setProfile((prev) => ({ ...prev, ...(cp.data as Record<string, unknown>) }));
      setUpdatedAt(cp.updated_at ?? null);
    } else {
      setUpdatedAt(null);
    }
    setPage("profile");
  }, []);

  // Map Zefix legal form abbreviation to our select options
  const mapLegalForm = (zefixForm: string): string => {
    const lower = zefixForm.toLowerCase();
    if (lower.includes("ag") || lower.includes("aktiengesellschaft")) return "AG";
    if (lower.includes("gmbh") || lower.includes("gesellschaft mit beschränkter")) return "GmbH";
    if (lower.includes("genossenschaft")) return "Genossenschaft";
    if (lower.includes("stiftung")) return "Stiftung";
    if (lower.includes("verein")) return "Verein";
    if (lower.includes("einzelfirma") || lower.includes("einzelunternehm")) return "Einzelfirma";
    return "";
  };

  // Add newly created org to local list + auto-open with Zefix data
  const handleOrgCreated = useCallback(async (org: Organization, zefixData?: ZefixResult) => {
    setOrganizations((prev) => [...prev, org].sort((a, b) => a.name.localeCompare(b.name)));

    // Auto-open the new org's profile with Zefix data pre-filled
    setOrgId(org.id);
    const defaults: Record<string, unknown> = {};
    PROFILE_FIELDS.forEach((f) => {
      defaults[f.id] = f.type === "multi" ? [] : f.type === "toggle" ? false : "";
    });

    if (zefixData) {
      if (zefixData.name) defaults.company_name = zefixData.name;
      if (zefixData.uid) defaults.uid = zefixData.uid;
      if (zefixData.legalForm) {
        const mapped = mapLegalForm(zefixData.legalForm);
        if (mapped) defaults.legal_form = mapped;
      }
      if (zefixData.address) defaults.address = zefixData.address;
      if (zefixData.purpose) defaults.business_detail = zefixData.purpose;

      if (zefixData.foundingYear) defaults.founding_year = zefixData.foundingYear;

      // Map Zefix persons to GL / VR fields
      if (zefixData.persons && zefixData.persons.length > 0) {
        const gl = zefixData.persons.filter((p) => /geschäftsführ|direktion|direktor/i.test(p.role)).map((p) => p.name);
        const vr = zefixData.persons.filter((p) => /verwaltungsrat|vr|präsident/i.test(p.role)).map((p) => p.name);
        if (gl.length > 0) defaults.geschaeftsleitung = gl.join(", ");
        if (vr.length > 0) defaults.verwaltungsrat = vr.join(", ");
      }
    }

    setProfile(defaults);

    // Also load any existing profile data (shouldn't exist for a new org, but just in case)
    const cp = await loadCompanyProfile(org.id);
    if (cp?.data && typeof cp.data === "object") {
      setProfile((prev) => ({ ...prev, ...(cp.data as Record<string, unknown>) }));
      setUpdatedAt(cp.updated_at ?? null);
    } else {
      setUpdatedAt(null);
    }
    setPage("profile");
  }, []);

  // Remove deleted org from local state
  const handleOrgDeleted = useCallback((deletedOrgId: string) => {
    setOrganizations((prev) => prev.filter((o) => o.id !== deletedOrgId));
    if (orgId === deletedOrgId) {
      setOrgId(null);
      setUpdatedAt(null);
      setPage("organizations");
    }
  }, [orgId]);

  const profOk = PROFILE_FIELDS.filter((f) => f.required !== false).every((f) => {
    const v = profile[f.id];
    return v !== undefined && v !== "" && v !== null && !(Array.isArray(v) && v.length === 0);
  });

  const handleNav = useCallback((id: string) => {
    if (id === "new-profile") {
      setPage("new-profile");
      setMobileMenuOpen(false);
      return;
    }
    if (id === "generate") setSelectedDocKey(null); // reset when navigating via sidebar
    setPage(id);
    setMobileMenuOpen(false);
  }, [compact]);

  const handleGenerateDoc = useCallback((docKey: string) => {
    setSelectedDocKey(docKey);
    setPage("generate");
  }, []);

  const sidebarSections: SidebarSection[] = [
    {
      title: t("docgen.nav.group.overview"),
      items: [
        { id: "dashboard", icon: icons.home, label: t("docgen.nav.dashboard") },
        { id: "alerts", icon: icons.alert, label: t("docgen.nav.alerts"), badge: dashStats.draftAlertCount || undefined },
      ],
    },
    {
      title: t("docgen.nav.group.clients_docs"),
      items: [
        { id: "organizations", icon: icons.folder, label: t("docgen.nav.organizations") },
        { id: "documents", icon: icons.doc, label: t("docgen.nav.documents") },
        { id: "kyc_cases", icon: icons.clipboard, label: t("docgen.nav.kyc_cases") },
      ],
    },
    {
      title: t("docgen.nav.group.risk_monitoring"),
      items: [
        { id: "risk_scoring", icon: icons.chart, label: t("docgen.nav.risk_scoring") },
        { id: "screening", icon: icons.search, label: t("docgen.nav.screening") },
        { id: "pkyc", icon: icons.eye, label: t("docgen.nav.pkyc") },
        { id: "leta", icon: icons.building, label: t("docgen.nav.leta") },
        { id: "sar", icon: icons.flag, label: t("docgen.nav.sar") },
      ],
    },
    {
      title: t("docgen.nav.group.compliance_training"),
      items: [
        { id: "sro_packages", icon: icons.list, label: t("docgen.nav.sro_packages") },
        { id: "readiness", icon: icons.shield, label: t("docgen.nav.readiness") },
        { id: "training", icon: icons.academic, label: t("docgen.nav.training") },
      ],
    },
  ];

  const footer = (
    <div style={{ padding: "16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            fontFamily: T.sans,
          }}
        >
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", fontFamily: T.sans }}>
            {displayName}
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: T.sans }}>Professional Plan</div>
        </div>
      </div>
      <button
        onClick={() => signOut().catch(() => {}).finally(() => (window.location.href = "/app/login"))}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          marginTop: 4,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "transparent",
          color: "rgba(255,255,255,0.4)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: T.sans,
        }}
      >
        Abmelden
      </button>
      <div style={{ marginTop: 8 }}>
        <LanguageSwitcher />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: T.sans, background: T.s1 }}>
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
            Virtue <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>DocGen</span>
          </div>
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
            zIndex: 1003,
            transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          } : {}),
        }}
      >
        <Sidebar
          sections={sidebarSections}
          active={page}
          onNav={handleNav}
          title="Virtue"
          subtitle="Document Generator"
          footer={footer}
        />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: compact ? "20px 16px" : "36px 44px", paddingTop: compact ? 68 : undefined, maxWidth: 960, overflowY: "auto" }}>
        <Suspense fallback={<div style={{ padding: compact ? 20 : 40, color: T.ink3, fontFamily: T.sans }}>Laden...</div>}>
          {page === "dashboard" && <DashboardPage onNav={setPage} onGenerateDoc={handleGenerateDoc} profile={profile} profOk={profOk} stats={dashStats} />}
          {(page === "organizations" || page === "new-profile") && (
            <OrganizationsPage
              organizations={organizations}
              onSelectOrg={handleSelectOrg}
              onOrgCreated={handleOrgCreated}
              onOrgDeleted={handleOrgDeleted}
              initialShowForm={page === "new-profile"}
            />
          )}
          {page === "profile" && (
            <ProfilePage
              profile={profile}
              setProfile={setProfile}
              onSave={handleSaveProfile}
              saving={saving}
              orgId={orgId}
              orgName={organizations.find((o) => o.id === orgId)?.name}
              onBack={() => setPage("organizations")}
              onGenerate={() => setPage("generate")}
              updatedAt={updatedAt}
            />
          )}
          {page === "generate" && (
            <GenerateWizard
              profile={profile}
              onNav={setPage}
              orgId={orgId}
              orgName={organizations.find((o) => o.id === orgId)?.name}
              initialDocKey={selectedDocKey}
            />
          )}
          {page === "documents" && <DocumentsPage onGenerateDoc={() => setPage("generate")} />}
          {page === "alerts" && <AlertsPage profile={profile} organizations={organizations} />}
          {page === "readiness" && <AuditReadinessPage organizations={organizations} />}
          {page === "risk_scoring" && <RiskScoringPage organizations={organizations} />}
          {page === "screening" && <ScreeningPage organizations={organizations} />}
          {page === "kyc_cases" && <KycCasesPage organizations={organizations} />}
          {page === "sar" && <SarOverviewPage organizations={organizations} />}
          {page === "sro_packages" && <SroPackagesPage organizations={organizations} />}
          {page === "pkyc" && <PkycOverviewPage organizations={organizations} />}
          {page === "leta" && <LetaOverviewPage organizations={organizations} />}
          {page === "training" && <TrainingOverviewPage organizations={organizations} />}
        </Suspense>
      </main>
    </div>
  );
}

export function DocGenApp() {
  return (
    <AuthGuard requiredRole="admin">
      <DocGenInner />
    </AuthGuard>
  );
}
