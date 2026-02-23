import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { createOrganization, updateOrganization, deleteOrganization, loadDocCountsByOrg, searchZefix, loadOrgMembers, updateOrgMemberRole, removeOrgMember, inviteMember, type Organization, type ZefixResult, type OrgMember, type OrgRole } from "../lib/api";
import { useAutosave, readAutosave } from "@shared/hooks/useAutosave";

const INDUSTRIES = [
  "Fintech",
  "Crypto / DLT",
  "Vermögensverwaltung",
  "Zahlungsverkehr",
  "Leasing / Finanzierung",
  "Effektenhandel",
  "Versicherung",
  "Andere",
];

const SROS = ["VQF", "PolyReg", "SO-FIT", "ARIF", "OAR-G", "Keine / In Bearbeitung"];

interface OrganizationsPageProps {
  organizations: Organization[];
  onSelectOrg: (orgId: string, zefixData?: ZefixResult) => void;
  onOrgCreated: (org: Organization, zefixData?: ZefixResult) => void;
  onOrgDeleted: (orgId: string) => void;
  initialShowForm?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  fontSize: 14,
  fontFamily: T.sans,
  color: T.ink,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

export function OrganizationsPage({ organizations, onSelectOrg, onOrgCreated, onOrgDeleted, initialShowForm = false }: OrganizationsPageProps) {
  const [showForm, setShowForm] = useState(initialShowForm);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [membersOrgId, setMembersOrgId] = useState<string | null>(null);

  // Zefix search state
  const [zefixQuery, setZefixQuery] = useState("");
  const [zefixResults, setZefixResults] = useState<ZefixResult[]>([]);
  const [zefixHint, setZefixHint] = useState<string | null>(null);
  const [zefixSearching, setZefixSearching] = useState(false);
  const [selectedZefix, setSelectedZefix] = useState<ZefixResult | null>(null);

  useEffect(() => {
    loadDocCountsByOrg().then(setDocCounts).catch(console.error);
  }, []);
  const orgDefaults = { name: "", short_name: "", industry: "", sro: "", contact_name: "", contact_role: "", contact_email: "" };
  const [newOrg, setNewOrg] = useState(() => readAutosave<typeof orgDefaults>("vc:docgen:create-org") ?? orgDefaults);
  const orgAutosave = useAutosave({ key: "vc:docgen:create-org", data: newOrg, enabled: showForm });

  const handleZefixSearch = async () => {
    if (zefixQuery.trim().length < 2) return;
    setZefixSearching(true);
    setZefixResults([]);
    setZefixHint(null);
    try {
      const res = await searchZefix(zefixQuery.trim());
      setZefixResults(res.results);
      setZefixHint(res.hint);
    } catch {
      setZefixHint("Zefix-Abfrage fehlgeschlagen.");
    } finally {
      setZefixSearching(false);
    }
  };

  const handleSelectZefix = (result: ZefixResult) => {
    setSelectedZefix(result);
    setNewOrg((p) => ({
      ...p,
      name: result.name,
      short_name: result.name.replace(/\s+(AG|GmbH|SA|Sàrl|Ltd|Inc)\.?$/i, "").trim(),
    }));
    setZefixResults([]);
  };

  const handleCreate = async () => {
    if (!newOrg.name.trim()) return;
    setCreating(true);
    try {
      const created = await createOrganization({
        name: newOrg.name.trim(),
        short_name: newOrg.short_name.trim() || undefined,
        industry: newOrg.industry || undefined,
        sro: newOrg.sro || undefined,
        contact_name: newOrg.contact_name.trim() || undefined,
        contact_role: newOrg.contact_role.trim() || undefined,
        contact_email: newOrg.contact_email.trim() || undefined,
      });
      // Auto-invite CO as approver if contact_email is provided
      const email = newOrg.contact_email.trim();
      if (email && email.includes("@")) {
        try {
          await inviteMember(created.id, email, newOrg.contact_name.trim() || email.split("@")[0], "approver");
        } catch {
          // Ignore invite errors (e.g. already invited) — org is created
        }
      }
      onOrgCreated(created, selectedZefix || undefined);
      orgAutosave.clear();
      setNewOrg({ name: "", short_name: "", industry: "", sro: "", contact_name: "", contact_role: "", contact_email: "" });
      setSelectedZefix(null);
      setZefixQuery("");
      setZefixResults([]);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create organization:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!window.confirm(`Kunden "${org.name}" wirklich löschen? Alle zugehörigen Daten (Profil, Dokumente, Mitglieder) werden unwiderruflich entfernt.`)) return;
    setDeleting(org.id);
    try {
      await deleteOrganization(org.id);
      if (membersOrgId === org.id) setMembersOrgId(null);
      onOrgDeleted(org.id);
    } catch (err) {
      console.error("Failed to delete organization:", err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <SectionLabel text="Kundenverwaltung" />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: 0 }}>
          Kunden
        </h1>
        <span style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans }}>
          {organizations.length} {organizations.length === 1 ? "Kunde" : "Kunden"}
        </span>
      </div>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 20px" }}>
        Alle Kundenorganisationen verwalten und Firmenprofile bearbeiten.
      </p>

      {/* New client button */}
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 20px",
          borderRadius: 8,
          border: "none",
          background: T.accent,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: T.sans,
          marginBottom: 20,
        }}
      >
        <Icon d={icons.plus} size={15} color="#fff" />
        Neuer Kunde
      </button>

      {/* Inline create form */}
      {showForm && (
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 26px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              fontFamily: T.sans,
              marginBottom: 18,
              paddingBottom: 10,
              borderBottom: `1px solid ${T.borderL}`,
            }}
          >
            Neuen Kunden anlegen
          </div>

          {/* Zefix search */}
          <div style={{ marginBottom: 18, padding: "14px 16px", background: T.s1, borderRadius: 10, border: `1px solid ${T.borderL}` }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 8 }}>
              <Icon d={icons.search} size={13} color={T.ink3} />{" "}
              Im Handelsregister suchen
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={zefixQuery}
                onChange={(e) => setZefixQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleZefixSearch()}
                placeholder="Firmenname eingeben..."
                style={{ ...inputStyle, flex: 1, background: "#fff" }}
              />
              <button
                onClick={handleZefixSearch}
                disabled={zefixSearching || zefixQuery.trim().length < 2}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: zefixSearching || zefixQuery.trim().length < 2 ? "not-allowed" : "pointer",
                  fontFamily: T.sans,
                  opacity: zefixSearching || zefixQuery.trim().length < 2 ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {zefixSearching ? "Suche..." : "Suchen"}
              </button>
            </div>

            {/* Zefix hint */}
            {zefixHint && (
              <div style={{ fontSize: 12, color: T.amber, fontFamily: T.sans, marginTop: 8 }}>
                {zefixHint}
              </div>
            )}

            {/* Zefix results */}
            {zefixResults.length > 0 && (
              <div style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", overflow: "hidden" }}>
                {zefixResults.map((r, i) => (
                  <div
                    key={r.uid || i}
                    onClick={() => handleSelectZefix(r)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      cursor: "pointer",
                      borderTop: i > 0 ? `1px solid ${T.borderL}` : undefined,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.accentS; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>
                        {r.uid}{r.legalForm ? ` · ${r.legalForm}` : ""}{r.legalSeat ? ` · ${r.legalSeat}` : ""}
                      </div>
                    </div>
                    <Icon d={icons.plus} size={14} color={T.accent} />
                  </div>
                ))}
              </div>
            )}

            {/* Selected indicator */}
            {selectedZefix && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 12px", borderRadius: 8, background: T.accentS, border: `1px solid ${T.accent}30` }}>
                <Icon d={icons.check} size={14} color={T.accent} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: T.accent, fontFamily: T.sans }}>
                  {selectedZefix.name} ({selectedZefix.uid}) ausgewählt — Profildaten werden automatisch übernommen
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Firmenname *
              </label>
              <input
                type="text"
                value={newOrg.name}
                onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))}
                placeholder="z.B. Align Technology AG"
                style={inputStyle}
              />
            </div>
            {/* Short name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Kurzname
              </label>
              <input
                type="text"
                value={newOrg.short_name}
                onChange={(e) => setNewOrg((p) => ({ ...p, short_name: e.target.value }))}
                placeholder="z.B. Align Technology"
                style={inputStyle}
              />
            </div>
            {/* Industry */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Branche
              </label>
              <select
                value={newOrg.industry}
                onChange={(e) => setNewOrg((p) => ({ ...p, industry: e.target.value }))}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">Bitte wählen...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            {/* SRO */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                SRO
              </label>
              <select
                value={newOrg.sro}
                onChange={(e) => setNewOrg((p) => ({ ...p, sro: e.target.value }))}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">Bitte wählen...</option>
                {SROS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Contact name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Kontaktperson
              </label>
              <input
                type="text"
                value={newOrg.contact_name}
                onChange={(e) => setNewOrg((p) => ({ ...p, contact_name: e.target.value }))}
                placeholder="z.B. Daniel Müller"
                style={inputStyle}
              />
            </div>
            {/* Contact role */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Rolle
              </label>
              <input
                type="text"
                value={newOrg.contact_role}
                onChange={(e) => setNewOrg((p) => ({ ...p, contact_role: e.target.value }))}
                placeholder="z.B. Head of Operations"
                style={inputStyle}
              />
            </div>
            {/* Contact email (CO) */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Compliance Officer E-Mail
              </label>
              <input
                type="email"
                value={newOrg.contact_email}
                onChange={(e) => setNewOrg((p) => ({ ...p, contact_email: e.target.value }))}
                placeholder="z.B. co@firma.ch — wird automatisch als Freigeber eingeladen"
                style={inputStyle}
              />
              <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 4 }}>
                Wird automatisch als Approver eingeladen und erhält Freigabe-E-Mails für generierte Dokumente.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={handleCreate}
              disabled={creating || !newOrg.name.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: creating || !newOrg.name.trim() ? "not-allowed" : "pointer",
                fontFamily: T.sans,
                opacity: creating || !newOrg.name.trim() ? 0.6 : 1,
              }}
            >
              {creating ? "Erstellen..." : "Kunde anlegen"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink3,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Organizations grid */}
      {organizations.length === 0 && !showForm ? (
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "48px 32px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: T.accentS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon d={icons.building} size={24} color={T.accent} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 6 }}>
            Noch keine Kunden
          </div>
          <p style={{ fontSize: 13.5, color: T.ink3, fontFamily: T.sans, margin: 0 }}>
            Legen Sie Ihren ersten Kunden an, um dessen Firmenprofil zu verwalten.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {organizations.map((org) => (
            <div
              key={org.id}
              onClick={() => onSelectOrg(org.id)}
              style={{
                background: "#fff",
                borderRadius: T.rLg,
                padding: "20px 22px",
                border: `1px solid ${T.border}`,
                boxShadow: T.shSm,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.accent;
                e.currentTarget.style.boxShadow = T.shMd;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.boxShadow = T.shSm;
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: T.accentS,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon d={icons.building} size={18} color={T.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                    {org.name}
                  </div>
                  {org.short_name && (
                    <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{org.short_name}</div>
                  )}
                </div>
                <Icon d={icons.arrow} size={14} color={T.ink4} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {org.industry && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "3px 10px",
                      borderRadius: 10,
                      background: T.s2,
                      color: T.ink3,
                      fontFamily: T.sans,
                    }}
                  >
                    {org.industry}
                  </span>
                )}
                {org.sro && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "3px 10px",
                      borderRadius: 10,
                      background: T.accentS,
                      color: T.accent,
                      fontFamily: T.sans,
                    }}
                  >
                    {org.sro}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                {org.contact_name && (
                  <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                    {org.contact_name}
                    {org.contact_role ? ` (${org.contact_role})` : ""}
                  </span>
                )}
                <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, marginLeft: "auto" }}>
                  <Icon d={icons.doc} size={12} color={T.ink4} /> {docCounts[org.id] || 0} Dok.
                </span>
              </div>
              {org.contact_email && (
                <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 4 }}>
                  CO: {org.contact_email}
                </div>
              )}
              {/* Actions row */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMembersOrgId(membersOrgId === org.id ? null : org.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: membersOrgId === org.id ? T.accentS : T.s1,
                    border: `1px solid ${membersOrgId === org.id ? T.accent + "33" : T.border}`,
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: membersOrgId === org.id ? T.accent : T.ink3,
                    fontFamily: T.sans,
                    cursor: "pointer",
                  }}
                >
                  <Icon d={icons.users} size={12} color={membersOrgId === org.id ? T.accent : T.ink4} />
                  Mitglieder
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(org);
                  }}
                  disabled={deleting === org.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: T.s1,
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: T.ink4,
                    fontFamily: T.sans,
                    cursor: deleting === org.id ? "wait" : "pointer",
                    opacity: deleting === org.id ? 0.5 : 1,
                  }}
                  title="Kunden löschen"
                >
                  <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={12} color={T.ink4} />
                  {deleting === org.id ? "Löschen..." : "Löschen"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members panel */}
      {membersOrgId && (
        <OrgMembersPanel
          orgId={membersOrgId}
          orgName={organizations.find((o) => o.id === membersOrgId)?.name ?? ""}
          onClose={() => setMembersOrgId(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OrgMembersPanel — manage members of an organization               */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<OrgRole, { label: string; color: string; bg: string }> = {
  viewer: { label: "Betrachter", color: T.ink3, bg: T.s2 },
  editor: { label: "Bearbeiter", color: "#2563eb", bg: "#eff6ff" },
  approver: { label: "Freigeber", color: T.accent, bg: T.accentS },
};

function OrgMembersPanel({
  orgId,
  orgName,
  onClose,
}: {
  orgId: string;
  orgName: string;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Invite form state
  const inviteAutosaveKey = `vc:docgen:invite:${orgId}`;
  const inviteSaved = readAutosave<{ email: string; name: string; role: OrgRole }>(inviteAutosaveKey);
  const [inviteEmail, setInviteEmail] = useState(inviteSaved?.email ?? "");
  const [inviteName, setInviteName] = useState(inviteSaved?.name ?? "");
  const [inviteRole, setInviteRole] = useState<OrgRole>(inviteSaved?.role ?? "editor");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const inviteAutosave = useAutosave({ key: inviteAutosaveKey, data: { email: inviteEmail, name: inviteName, role: inviteRole } });

  const load = () => {
    setLoading(true);
    loadOrgMembers(orgId)
      .then(setMembers)
      .catch((err) => console.error("Failed to load members:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orgId]);

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    setUpdating(memberId);
    try {
      await updateOrgMemberRole(memberId, newRole);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      console.error("Failed to update role:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (member: OrgMember) => {
    if (!window.confirm(`Mitglied "${member.full_name || member.user_id}" wirklich entfernen?`)) return;
    setUpdating(member.id);
    try {
      await removeOrgMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const result = await inviteMember(orgId, inviteEmail.trim(), inviteName.trim(), inviteRole);
      setInviteResult({ ok: result.success, msg: result.message });
      if (result.success) {
        inviteAutosave.clear();
        setInviteEmail("");
        setInviteName("");
        setInviteRole("editor");
        load(); // Reload members list
      }
    } catch (err) {
      setInviteResult({ ok: false, msg: String(err) });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 20,
        background: "#fff",
        borderRadius: T.rLg,
        border: `1px solid ${T.border}`,
        boxShadow: T.shSm,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 22px",
          borderBottom: `1px solid ${T.borderL}`,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
            Mitglieder — {orgName}
          </div>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
            {members.length} {members.length === 1 ? "Mitglied" : "Mitglieder"}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <Icon d="M6 18L18 6M6 6l12 12" size={16} color={T.ink4} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 22px" }}>
        {loading ? (
          <div style={{ fontSize: 13, color: T.ink4, fontFamily: T.sans, padding: "12px 0" }}>
            Wird geladen...
          </div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 13, color: T.ink4, fontFamily: T.sans, padding: "12px 0" }}>
            Keine Mitglieder zugewiesen.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((member) => {
              const rl = ROLE_LABELS[member.role] ?? ROLE_LABELS.viewer;
              return (
                <div
                  key={member.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: T.s1,
                    borderRadius: 8,
                    border: `1px solid ${T.borderL}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: rl.bg,
                      border: `1px solid ${rl.color}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: rl.color,
                      fontFamily: T.sans,
                      flexShrink: 0,
                    }}
                  >
                    {(member.full_name || "?").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                      {member.full_name || "Unbekannter Benutzer"}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                      {member.user_id.slice(0, 8)}...
                    </div>
                  </div>

                  {/* Role selector */}
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                    disabled={updating === member.id}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                      fontSize: 12,
                      fontFamily: T.sans,
                      fontWeight: 500,
                      color: rl.color,
                      background: "#fff",
                      cursor: updating === member.id ? "wait" : "pointer",
                      opacity: updating === member.id ? 0.6 : 1,
                    }}
                  >
                    <option value="viewer">Betrachter</option>
                    <option value="editor">Bearbeiter</option>
                    <option value="approver">Freigeber</option>
                  </select>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={updating === member.id}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: updating === member.id ? "wait" : "pointer",
                      padding: 4,
                      display: "flex",
                      opacity: updating === member.id ? 0.4 : 0.6,
                    }}
                    title="Mitglied entfernen"
                  >
                    <Icon d="M6 18L18 6M6 6l12 12" size={14} color="#dc2626" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Invite form ─────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 18,
            padding: "16px 18px",
            background: T.s1,
            borderRadius: 10,
            border: `1px solid ${T.borderL}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.ink,
              fontFamily: T.sans,
              marginBottom: 12,
            }}
          >
            <Icon d={icons.plus} size={13} color={T.accent} /> Neues Mitglied einladen
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                E-Mail *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@firma.ch"
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                Name *
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Vor- und Nachname"
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
            <div style={{ flex: "0 0 auto" }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                Rolle
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px", width: "auto", appearance: "auto" }}
              >
                <option value="viewer">Betrachter</option>
                <option value="editor">Bearbeiter</option>
                <option value="approver">Freigeber</option>
              </select>
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 7,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: inviting || !inviteEmail.trim() || !inviteName.trim() ? "not-allowed" : "pointer",
                fontFamily: T.sans,
                opacity: inviting || !inviteEmail.trim() || !inviteName.trim() ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {inviting ? "Wird eingeladen..." : "Einladen"}
            </button>
          </div>

          {/* Result banner */}
          {inviteResult && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 500,
                fontFamily: T.sans,
                background: inviteResult.ok ? "#f0fdf4" : T.redS,
                color: inviteResult.ok ? "#16654e" : T.red,
                border: `1px solid ${inviteResult.ok ? "#16654e20" : T.red + "20"}`,
              }}
            >
              {inviteResult.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
