import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { createOrganization, loadDocCountsByOrg, searchZefix, type Organization, type ZefixResult } from "../lib/api";

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

  // Zefix search state
  const [zefixQuery, setZefixQuery] = useState("");
  const [zefixResults, setZefixResults] = useState<ZefixResult[]>([]);
  const [zefixHint, setZefixHint] = useState<string | null>(null);
  const [zefixSearching, setZefixSearching] = useState(false);
  const [selectedZefix, setSelectedZefix] = useState<ZefixResult | null>(null);

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
      });
      onOrgCreated(created, selectedZefix || undefined);
      setNewOrg({ name: "", short_name: "", industry: "", sro: "", contact_name: "", contact_role: "" });
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
