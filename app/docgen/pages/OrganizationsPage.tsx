import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { createOrganization, updateOrganization, deleteOrganization, loadDocCountsByOrg, loadAllCompanyProfiles, searchZefix, loadOrgMembers, updateOrgMemberRole, removeOrgMember, inviteMember, sendClientMessage, type Organization, type ZefixResult, type OrgMember, type OrgRole } from "../lib/api";
import { useAutosave, readAutosave } from "@shared/hooks/useAutosave";
import { PROFILE_FIELDS } from "@shared/data/profileFields";
import { calcProfileCompletion, completionColor } from "@shared/lib/profileCompletion";
import { MESSAGE_TEMPLATES, fillTemplate } from "../data/messageTemplates";

const INDUSTRIES = [
  "Fintech",
  "Crypto / DLT",
  "Vermögensverwaltung",
  "Zahlungsverkehr",
  "Leasing / Finanzierung",
  "Effektenhandel",
  "Investmentgesellschaft",
  "Venture Capital / PE",
  "Versicherung",
  "Andere",
];

const SROS = ["VQF", "PolyReg", "SO-FIT", "ARIF", "OAR-G", "SRO SAV/SNV", "SRO Treuhand Suisse", "SRO Leasingverband", "SRO SVV", "Keine / In Bearbeitung"];

const COUNTRIES = [
  { value: "CH", label: "\u{1F1E8}\u{1F1ED} Schweiz" },
  { value: "DE", label: "\u{1F1E9}\u{1F1EA} Deutschland" },
  { value: "LI", label: "\u{1F1F1}\u{1F1EE} Liechtenstein" },
  { value: "AT", label: "\u{1F1E6}\u{1F1F9} Österreich" },
  { value: "EU", label: "\u{1F1EA}\u{1F1FA} EU (Sonstige)" },
];

const ROLE_DESCRIPTIONS: Record<string, string> = {
  viewer: "Kann Dokumente und Alerts einsehen",
  editor: "Kann Dokumente bearbeiten und Kundendaten pflegen",
  approver: "Kann Dokumente freigeben und erhält Freigabe-E-Mails",
};

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
  const [messageOrgId, setMessageOrgId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterSro, setFilterSro] = useState("");

  // Zefix search state
  const [zefixQuery, setZefixQuery] = useState("");
  const [zefixResults, setZefixResults] = useState<ZefixResult[]>([]);
  const [zefixHint, setZefixHint] = useState<string | null>(null);
  const [zefixSearching, setZefixSearching] = useState(false);
  const [selectedZefix, setSelectedZefix] = useState<ZefixResult | null>(null);

  useEffect(() => {
    loadDocCountsByOrg().then(setDocCounts).catch(console.error);
    loadAllCompanyProfiles().then(setProfileData).catch(console.error);
  }, []);
  const orgDefaults = { name: "", short_name: "", industry: "", sro: "", country: "CH", contact_name: "", contact_role: "", contact_email: "" };
  const [newOrg, setNewOrg] = useState(() => readAutosave<typeof orgDefaults>("vc:docgen:create-org") ?? orgDefaults);
  const orgAutosave = useAutosave({ key: "vc:docgen:create-org", data: newOrg, enabled: showForm });

  // Auto-scroll to inline panel when opened
  useEffect(() => {
    const activeId = membersOrgId || messageOrgId;
    if (activeId) {
      setTimeout(() => {
        document.getElementById(`panel-${activeId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [membersOrgId, messageOrgId]);

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
    setInviteWarning(null);
    try {
      const created = await createOrganization({
        name: newOrg.name.trim(),
        short_name: newOrg.short_name.trim() || undefined,
        industry: newOrg.industry || undefined,
        sro: newOrg.sro || undefined,
        country: newOrg.country || "CH",
        contact_name: newOrg.contact_name.trim() || undefined,
        contact_role: newOrg.contact_role.trim() || undefined,
        contact_email: newOrg.contact_email.trim() || undefined,
      });
      // Auto-invite CO as approver if contact_email is provided
      const email = newOrg.contact_email.trim();
      if (email && email.includes("@")) {
        try {
          await inviteMember(created.id, email, newOrg.contact_name.trim() || email.split("@")[0], "approver");
        } catch (inviteErr) {
          setInviteWarning(`Kunde erstellt, aber CO-Einladung fehlgeschlagen: ${String(inviteErr)}`);
        }
      }
      onOrgCreated(created, selectedZefix || undefined);
      orgAutosave.clear();
      setNewOrg({ name: "", short_name: "", industry: "", sro: "", country: "CH", contact_name: "", contact_role: "", contact_email: "" });
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
      if (messageOrgId === org.id) setMessageOrgId(null);
      onOrgDeleted(org.id);
    } catch (err) {
      console.error("Failed to delete organization:", err);
    } finally {
      setDeleting(null);
    }
  };

  // Filtered organizations
  const filteredOrgs = organizations.filter((org) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = [org.name, org.short_name, org.contact_name, org.contact_email].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filterCountry && org.country !== filterCountry) return false;
    if (filterSro && org.sro !== filterSro) return false;
    return true;
  });

  // Build grid items: cards in pairs, with inline panel after the pair containing the active org
  const gridItems: React.ReactNode[] = [];
  for (let i = 0; i < filteredOrgs.length; i += 2) {
    const pair = filteredOrgs.slice(i, i + 2);
    // Render each card in the pair
    pair.forEach((org) => {
      gridItems.push(
        <OrgCard
          key={org.id}
          org={org}
          docCount={docCounts[org.id] || 0}
          profilePct={calcProfileCompletion(profileData.get(org.id) ?? null, PROFILE_FIELDS)}
          membersActive={membersOrgId === org.id}
          messageActive={messageOrgId === org.id}
          deleting={deleting === org.id}
          onSelect={() => onSelectOrg(org.id)}
          onToggleMembers={() => {
            setMembersOrgId(membersOrgId === org.id ? null : org.id);
            if (messageOrgId === org.id) setMessageOrgId(null);
          }}
          onToggleMessage={() => {
            setMessageOrgId(messageOrgId === org.id ? null : org.id);
            if (membersOrgId === org.id) setMembersOrgId(null);
          }}
          onDelete={() => handleDelete(org)}
        />
      );
    });
    // Insert inline panel if one of this pair's orgs is active
    const activeOrg = pair.find((o) => o.id === membersOrgId || o.id === messageOrgId);
    if (activeOrg) {
      gridItems.push(
        <div key={`panel-${activeOrg.id}`} id={`panel-${activeOrg.id}`} style={{ gridColumn: "1 / -1" }}>
          {membersOrgId === activeOrg.id && (
            <OrgMembersPanel
              org={activeOrg}
              onClose={() => setMembersOrgId(null)}
              onOrgUpdated={() => setDocCounts((prev) => ({ ...prev }))} // force re-render
            />
          )}
          {messageOrgId === activeOrg.id && (
            <SendMessagePanel
              orgId={activeOrg.id}
              orgName={activeOrg.name}
              orgContactName={activeOrg.contact_name}
              orgContactSalutation={activeOrg.contact_salutation}
              onClose={() => setMessageOrgId(null)}
            />
          )}
        </div>
      );
    }
  }

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

      {/* Invite warning banner */}
      {inviteWarning && (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 500,
            fontFamily: T.sans,
            background: "#fffbeb",
            color: "#d97706",
            border: "1px solid #d9770622",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{inviteWarning}</span>
          <button onClick={() => setInviteWarning(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
            <Icon d="M6 18L18 6M6 6l12 12" size={14} color="#d97706" />
          </button>
        </div>
      )}

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
                placeholder="z.B. Muster Finanz AG"
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
                placeholder="z.B. Muster Finanz"
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
            {/* Country */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5, fontFamily: T.sans }}>
                Land
              </label>
              <select
                value={newOrg.country}
                onChange={(e) => setNewOrg((p) => ({ ...p, country: e.target.value }))}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
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

      {/* Search & Filter bar */}
      {organizations.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Icon d={icons.search} size={14} color={T.ink4} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kunden suchen..."
              style={{
                ...inputStyle,
                paddingLeft: 12,
                fontSize: 13,
                padding: "8px 12px",
              }}
            />
          </div>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            style={{ ...inputStyle, width: "auto", fontSize: 13, padding: "8px 12px", appearance: "auto", minWidth: 120 }}
          >
            <option value="">Alle Länder</option>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={filterSro}
            onChange={(e) => setFilterSro(e.target.value)}
            style={{ ...inputStyle, width: "auto", fontSize: 13, padding: "8px 12px", appearance: "auto", minWidth: 120 }}
          >
            <option value="">Alle SROs</option>
            {SROS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(searchQuery || filterCountry || filterSro) && (
            <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, whiteSpace: "nowrap" }}>
              {filteredOrgs.length} von {organizations.length} Kunden
            </span>
          )}
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
      ) : filteredOrgs.length === 0 ? (
        <div style={{ padding: "24px 0", fontSize: 13.5, color: T.ink4, fontFamily: T.sans, textAlign: "center" }}>
          Keine Kunden gefunden.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {gridItems}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OrgCard — individual organization card                            */
/* ------------------------------------------------------------------ */

function OrgCard({
  org,
  docCount,
  profilePct,
  membersActive,
  messageActive,
  deleting,
  onSelect,
  onToggleMembers,
  onToggleMessage,
  onDelete,
}: {
  org: Organization;
  docCount: number;
  profilePct: number;
  membersActive: boolean;
  messageActive: boolean;
  deleting: boolean;
  onSelect: () => void;
  onToggleMembers: () => void;
  onToggleMessage: () => void;
  onDelete: () => void;
}) {
  const c = completionColor(profilePct);
  return (
    <div
      onClick={onSelect}
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
      {/* Header with name + delete icon */}
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
        {/* Delete icon (subtle) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
          style={{
            background: "none",
            border: "none",
            cursor: deleting ? "wait" : "pointer",
            padding: 4,
            display: "flex",
            opacity: deleting ? 0.4 : 0.35,
            transition: "opacity 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.35"; }}
          title="Kunden löschen"
        >
          <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={14} color="#dc2626" />
        </button>
        <Icon d={icons.arrow} size={14} color={T.ink4} />
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {org.country && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 10, background: "#f0f9ff", color: "#0369a1", fontFamily: T.sans }}>
            {COUNTRIES.find((cc) => cc.value === org.country)?.label ?? org.country}
          </span>
        )}
        {org.industry && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 10, background: T.s2, color: T.ink3, fontFamily: T.sans }}>
            {org.industry}
          </span>
        )}
        {org.sro && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 10, background: T.accentS, color: T.accent, fontFamily: T.sans }}>
            {org.sro}
          </span>
        )}
      </div>

      {/* Contact + stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        {org.contact_name && (
          <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
            {org.contact_name}
            {org.contact_role ? ` (${org.contact_role})` : ""}
          </span>
        )}
        <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: c.color, background: c.bg, padding: "1px 6px", borderRadius: 4 }}>
            {profilePct}%
          </span>
          <span><Icon d={icons.doc} size={12} color={T.ink4} /> {docCount} Dok.</span>
        </span>
      </div>
      {!org.contact_name && org.contact_email && (
        <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 4 }}>
          CO: {org.contact_email}
        </div>
      )}

      {/* Actions row: Members + Message only */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMembers();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: membersActive ? T.accentS : T.s1,
            border: `1px solid ${membersActive ? T.accent + "33" : T.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: 11.5,
            fontWeight: 500,
            color: membersActive ? T.accent : T.ink3,
            fontFamily: T.sans,
            cursor: "pointer",
          }}
        >
          <Icon d={icons.users} size={12} color={membersActive ? T.accent : T.ink4} />
          Mitglieder
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMessage();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: messageActive ? "#eff6ff" : T.s1,
            border: `1px solid ${messageActive ? "#3b82f622" : T.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: 11.5,
            fontWeight: 500,
            color: messageActive ? "#2563eb" : T.ink3,
            fontFamily: T.sans,
            cursor: "pointer",
          }}
        >
          <Icon d={icons.mail} size={12} color={messageActive ? "#2563eb" : T.ink4} />
          Nachricht
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OrgMembersPanel — manage members + CO details of an organization  */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<OrgRole, { label: string; color: string; bg: string }> = {
  viewer: { label: "Betrachter", color: T.ink3, bg: T.s2 },
  editor: { label: "Bearbeiter", color: "#2563eb", bg: "#eff6ff" },
  approver: { label: "Freigeber", color: T.accent, bg: T.accentS },
};

function OrgMembersPanel({
  org,
  onClose,
  onOrgUpdated,
}: {
  org: Organization;
  onClose: () => void;
  onOrgUpdated: () => void;
}) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // CO edit state
  const [coName, setCoName] = useState(org.contact_name ?? "");
  const [coRole, setCoRole] = useState(org.contact_role ?? "");
  const [coEmail, setCoEmail] = useState(org.contact_email ?? "");
  const [coPhone, setCoPhone] = useState(org.contact_phone ?? "");
  const [coSalutation, setCoSalutation] = useState(org.contact_salutation ?? "");
  const [coSaving, setCoSaving] = useState(false);
  const [coSaved, setCoSaved] = useState(false);

  // Digest toggle
  const [digestOptOut, setDigestOptOut] = useState(org.digest_opt_out);

  // Invite form state
  const inviteAutosaveKey = `vc:docgen:invite:${org.id}`;
  const inviteSaved = readAutosave<{ email: string; name: string; role: OrgRole }>(inviteAutosaveKey);
  const [inviteEmail, setInviteEmail] = useState(inviteSaved?.email ?? "");
  const [inviteName, setInviteName] = useState(inviteSaved?.name ?? "");
  const [inviteRole, setInviteRole] = useState<OrgRole>(inviteSaved?.role ?? "editor");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const inviteAutosave = useAutosave({ key: inviteAutosaveKey, data: { email: inviteEmail, name: inviteName, role: inviteRole } });

  const load = () => {
    setLoading(true);
    loadOrgMembers(org.id)
      .then(setMembers)
      .catch((err) => console.error("Failed to load members:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [org.id]);

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
      const result = await inviteMember(org.id, inviteEmail.trim(), inviteName.trim(), inviteRole);
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

  const handleSaveCo = async () => {
    setCoSaving(true);
    setCoSaved(false);
    try {
      await updateOrganization(org.id, {
        contact_name: coName.trim() || null,
        contact_role: coRole.trim() || null,
        contact_email: coEmail.trim() || null,
        contact_phone: coPhone.trim() || null,
        contact_salutation: coSalutation || null,
      });
      // Update org in-place for immediate UI feedback
      org.contact_name = coName.trim() || null;
      org.contact_role = coRole.trim() || null;
      org.contact_email = coEmail.trim() || null;
      org.contact_phone = coPhone.trim() || null;
      org.contact_salutation = coSalutation || null;
      setCoSaved(true);
      onOrgUpdated();
      setTimeout(() => setCoSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save CO:", err);
    } finally {
      setCoSaving(false);
    }
  };

  const handleDigestToggle = async (checked: boolean) => {
    const newVal = !checked;
    setDigestOptOut(newVal);
    try {
      await updateOrganization(org.id, { digest_opt_out: newVal });
      (org as unknown as Record<string, unknown>).digest_opt_out = newVal;
      onOrgUpdated();
    } catch (err) {
      console.error("Failed to update digest setting:", err);
      setDigestOptOut(!newVal); // revert
    }
  };

  return (
    <div
      style={{
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
            Mitglieder & CO — {org.name}
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
        {/* ── CO Edit Section ─────────────────────────────────────── */}
        <div
          style={{
            marginBottom: 18,
            padding: "16px 18px",
            background: T.s1,
            borderRadius: 10,
            border: `1px solid ${T.borderL}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 12 }}>
            Compliance Officer
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                Name
              </label>
              <input
                type="text"
                value={coName}
                onChange={(e) => setCoName(e.target.value)}
                placeholder="Vor- und Nachname"
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                Rolle
              </label>
              <input
                type="text"
                value={coRole}
                onChange={(e) => setCoRole(e.target.value)}
                placeholder="z.B. Head of Operations"
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                E-Mail
              </label>
              <input
                type="email"
                value={coEmail}
                onChange={(e) => setCoEmail(e.target.value)}
                placeholder="co@firma.ch"
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                Telefon
              </label>
              <input
                type="tel"
                value={coPhone}
                onChange={(e) => setCoPhone(e.target.value)}
                placeholder="+41 55 123 45 67"
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
                Anrede
              </label>
              <select
                value={coSalutation}
                onChange={(e) => setCoSalutation(e.target.value)}
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px", appearance: "auto" }}
              >
                <option value="">Keine</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={handleSaveCo}
                disabled={coSaving}
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
                  cursor: coSaving ? "not-allowed" : "pointer",
                  fontFamily: T.sans,
                  opacity: coSaving ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {coSaving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
          {coSaved && (
            <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: T.sans, background: "#f0fdf4", color: "#16654e", border: "1px solid #16654e20" }}>
              Gespeichert
            </div>
          )}

          {/* Digest toggle (moved from card) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderL}` }}>
            <label style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!digestOptOut}
                onChange={(e) => handleDigestToggle(e.target.checked)}
                style={{ accentColor: T.accent }}
              />
              Wöchentlicher Digest aktiv
            </label>
          </div>
        </div>

        {/* ── Members list ─────────────────────────────────────────── */}
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
                    {member.email ? (
                      <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                        {member.email}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                        {member.user_id.slice(0, 8)}...
                      </div>
                    )}
                  </div>

                  {/* Role selector + description */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
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
                    <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans }}>
                      {ROLE_DESCRIPTIONS[member.role]}
                    </span>
                  </div>

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
            <div style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans, paddingBottom: 8 }}>
              {ROLE_DESCRIPTIONS[inviteRole]}
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
                marginLeft: "auto",
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

/* ------------------------------------------------------------------ */
/*  SendMessagePanel — send a message to all members of an org        */
/* ------------------------------------------------------------------ */

function SendMessagePanel({
  orgId,
  orgName,
  orgContactName,
  orgContactSalutation,
  onClose,
}: {
  orgId: string;
  orgName: string;
  orgContactName?: string | null;
  orgContactSalutation?: string | null;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendClientMessage(orgId, subject.trim(), body.trim());
      if (res.success) {
        setResult({ ok: true, msg: `Nachricht gesendet (${res.sent} E-Mail${res.sent !== 1 ? "s" : ""}).` });
        setSubject("");
        setBody("");
      } else {
        setResult({ ok: false, msg: res.message || "Fehler beim Senden." });
      }
    } catch (err) {
      setResult({ ok: false, msg: String(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
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
            Nachricht senden — {orgName}
          </div>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
            Wird an alle Mitglieder per E-Mail und In-App Benachrichtigung gesendet.
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
        >
          <Icon d="M6 18L18 6M6 6l12 12" size={16} color={T.ink4} />
        </button>
      </div>

      {/* Template Gallery */}
      <div style={{ padding: "12px 22px", borderBottom: `1px solid ${T.borderL}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.ink4, fontFamily: T.sans, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Vorlagen
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MESSAGE_TEMPLATES.map((tpl) => {
            const catColors: Record<string, { bg: string; color: string }> = {
              "Erinnerung": { bg: "#fffbeb", color: "#d97706" },
              "Information": { bg: "#eff6ff", color: "#3b82f6" },
              "Warnung": { bg: "#fef2f2", color: "#dc2626" },
              "Onboarding": { bg: T.accentS, color: T.accent },
            };
            const cat = catColors[tpl.category] ?? { bg: T.s2, color: T.ink3 };
            return (
              <button
                key={tpl.id}
                onClick={() => {
                  const filled = fillTemplate(tpl, { name: orgName, contact_name: orgContactName, contact_salutation: orgContactSalutation });
                  setSubject(filled.subject);
                  setBody(filled.body);
                  setResult(null);
                }}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${cat.color}22`, background: cat.bg,
                  fontSize: 11.5, fontWeight: 600, color: cat.color,
                  cursor: "pointer", fontFamily: T.sans,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {tpl.name}
                <span style={{ fontSize: 9, opacity: 0.7 }}>{tpl.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: "16px 22px" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
            Betreff *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="z.B. Neue regulatorische Anforderungen"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>
            Nachricht *
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ihre Nachricht an den Kunden..."
            rows={5}
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: 100,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: T.primary,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: sending || !subject.trim() || !body.trim() ? "not-allowed" : "pointer",
              fontFamily: T.sans,
              opacity: sending || !subject.trim() || !body.trim() ? 0.6 : 1,
            }}
          >
            <Icon d={icons.mail} size={14} color="#fff" />
            {sending ? "Wird gesendet..." : "Nachricht senden"}
          </button>
          <button
            onClick={onClose}
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

        {/* Result */}
        {result && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: T.sans,
              background: result.ok ? "#f0fdf4" : T.redS,
              color: result.ok ? "#16654e" : T.red,
              border: `1px solid ${result.ok ? "#16654e20" : T.red + "20"}`,
            }}
          >
            {result.msg}
          </div>
        )}
      </div>
    </div>
  );
}
