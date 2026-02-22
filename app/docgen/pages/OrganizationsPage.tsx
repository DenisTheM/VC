import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { createOrganization, loadDocCountsByOrg, type Organization } from "../lib/api";

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
  onSelectOrg: (orgId: string) => void;
  onOrgCreated: (org: Organization) => void;
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

export function OrganizationsPage({ organizations, onSelectOrg, onOrgCreated }: OrganizationsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDocCountsByOrg().then(setDocCounts).catch(console.error);
  }, []);
  const [newOrg, setNewOrg] = useState({
    name: "",
    short_name: "",
    industry: "",
    sro: "",
    contact_name: "",
    contact_role: "",
  });

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
      });
      onOrgCreated(created);
      setNewOrg({ name: "", short_name: "", industry: "", sro: "", contact_name: "", contact_role: "" });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create organization:", err);
    } finally {
      setCreating(false);
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
