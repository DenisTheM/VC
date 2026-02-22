import { useState, useEffect, useCallback } from "react";
import { T } from "@shared/styles/tokens";
import { icons } from "@shared/components/Icon";
import { Sidebar } from "@shared/components/Sidebar";
import { AuthGuard } from "@shared/components/AuthGuard";
import { useAuthContext } from "@shared/components/AuthContext";
import { signOut } from "@shared/lib/auth";
import { PROFILE_FIELDS } from "./data/profileFields";
import { loadOrganizations, loadCompanyProfile, saveCompanyProfile, type Organization } from "./lib/api";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { GenerateWizard } from "./pages/GenerateWizard";
import { DocumentsPage } from "./pages/DocumentsPage";
import { AlertsPage } from "./pages/AlertsPage";

function DocGenInner() {
  const { user, profile: authProfile } = useAuthContext();
  const displayName = authProfile.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const [page, setPage] = useState("dashboard");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [profile, setProfile] = useState<Record<string, unknown>>(() => {
    const p: Record<string, unknown> = {};
    PROFILE_FIELDS.forEach((f) => {
      if (f.default !== undefined) p[f.id] = f.default;
    });
    return p;
  });

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations().then((orgs) => {
      setOrganizations(orgs);
      if (orgs.length > 0) {
        const org = orgs[0];
        setOrgId(org.id);
        loadCompanyProfile(org.id).then((cp) => {
          if (cp?.data && typeof cp.data === "object") {
            setProfile((prev) => ({ ...prev, ...(cp.data as Record<string, unknown>) }));
          }
          setProfileLoaded(true);
        });
      } else {
        setProfileLoaded(true);
      }
    });
  }, []);

  // Save company profile to Supabase
  const handleSaveProfile = useCallback(async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await saveCompanyProfile(orgId, profile, user.id);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  }, [orgId, profile, user.id]);

  // Switch to a different organization's profile
  const handleSelectOrg = useCallback(async (selectedOrgId: string) => {
    setOrgId(selectedOrgId);
    // Reset profile to defaults, then load selected org's data
    const defaults: Record<string, unknown> = {};
    PROFILE_FIELDS.forEach((f) => {
      if (f.default !== undefined) defaults[f.id] = f.default;
      else defaults[f.id] = f.type === "multi" ? [] : f.type === "toggle" ? false : "";
    });
    setProfile(defaults);

    const cp = await loadCompanyProfile(selectedOrgId);
    if (cp?.data && typeof cp.data === "object") {
      setProfile((prev) => ({ ...prev, ...(cp.data as Record<string, unknown>) }));
    }
    setPage("profile");
  }, []);

  // Add newly created org to local list
  const handleOrgCreated = useCallback((org: Organization) => {
    setOrganizations((prev) => [...prev, org].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const profOk = PROFILE_FIELDS.filter((f) => f.required !== false).every((f) => {
    const v = profile[f.id];
    return v !== undefined && v !== "" && v !== null && !(Array.isArray(v) && v.length === 0);
  });

  const sidebarItems = [
    { id: "dashboard", icon: icons.home, label: "Dashboard" },
    { id: "organizations", icon: icons.folder, label: "Kunden" },
    { id: "profile", icon: icons.building, label: "Firmenprofil anlegen", dot: !profOk },
    { id: "generate", icon: icons.plus, label: "Neues Dokument" },
    { id: "documents", icon: icons.doc, label: "Dokumente" },
    { id: "alerts", icon: icons.alert, label: "Reg. Alerts", badge: 2 },
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
        onClick={() => signOut().then(() => (window.location.href = "/app/login"))}
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
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: T.sans, background: T.s1 }}>
      <Sidebar
        items={sidebarItems}
        active={page}
        onNav={setPage}
        title="Virtue"
        subtitle="Document Generator"
        footer={footer}
      />
      <main style={{ flex: 1, padding: "36px 44px", maxWidth: 960, overflowY: "auto" }}>
        {page === "dashboard" && <DashboardPage onNav={setPage} profile={profile} profOk={profOk} />}
        {page === "organizations" && (
          <OrganizationsPage
            organizations={organizations}
            onSelectOrg={handleSelectOrg}
            onOrgCreated={handleOrgCreated}
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
          />
        )}
        {page === "generate" && (
          <GenerateWizard
            profile={profile}
            onNav={setPage}
            orgId={orgId}
            orgName={organizations.find((o) => o.id === orgId)?.name}
          />
        )}
        {page === "documents" && <DocumentsPage />}
        {page === "alerts" && <AlertsPage profile={profile} />}
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
