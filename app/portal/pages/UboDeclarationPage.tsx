import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

type LetaStatus = "not_checked" | "matched" | "discrepancy" | "pending_report" | "reported";

interface UboPerson {
  name: string;
  birthDate: string | null;
  nationality: string | null;
  share_percent: number | null;
  control_type: string | null;
}

interface UboDeclarationRow {
  id: string;
  customer_id: string | null;
  organization_id: string;
  ubo_data: UboPerson[];
  leta_status: LetaStatus;
  discrepancy_details: string | null;
  report_deadline: string | null;
  created_at: string;
  updated_at: string;
}

const LETA_STATUS_CONFIG: Record<LetaStatus, { label: string; bg: string; color: string }> = {
  not_checked: { label: "Nicht geprüft", bg: T.s2, color: T.ink3 },
  matched: { label: "Übereinstimmung", bg: T.accentS, color: T.accent },
  discrepancy: { label: "Abweichung", bg: "#fef2f2", color: "#dc2626" },
  pending_report: { label: "Meldung ausstehend", bg: "#fffbeb", color: "#d97706" },
  reported: { label: "Gemeldet", bg: "#eff6ff", color: "#3b82f6" },
};

const CONTROL_TYPES = [
  "Direkte Beteiligung",
  "Indirekte Beteiligung",
  "Stimmrecht",
  "Vertragliche Kontrolle",
  "Andere Kontrollmittel",
];

interface UboDeclarationPageProps {
  org: ClientOrg | null;
}

interface SimpleCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  customer_type: string;
}

export function UboDeclarationPage({ org }: UboDeclarationPageProps) {
  const [declarations, setDeclarations] = useState<UboDeclarationRow[]>([]);
  const [customers, setCustomers] = useState<SimpleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDeclId, setEditingDeclId] = useState<string | null>(null);
  const [editingUboIndex, setEditingUboIndex] = useState<number>(-1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formNationality, setFormNationality] = useState("");
  const [formSharePercent, setFormSharePercent] = useState("");
  const [formControlType, setFormControlType] = useState("");

  useEffect(() => {
    if (!org) return;
    loadDeclarations();
    loadCustomerList();
  }, [org]);

  const loadCustomerList = async () => {
    if (!org) return;
    const { data } = await supabase
      .from("client_customers")
      .select("id, first_name, last_name, company_name, customer_type")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .order("last_name");
    setCustomers((data ?? []) as SimpleCustomer[]);
  };

  const loadDeclarations = async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("ubo_declarations")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setDeclarations((data ?? []) as UboDeclarationRow[]);
    } catch (err) {
      console.error("UBO load error:", err);
      setError("UBO-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormCustomerId("");
    setFormName("");
    setFormBirthDate("");
    setFormNationality("");
    setFormSharePercent("");
    setFormControlType("");
    setEditingDeclId(null);
    setEditingUboIndex(-1);
    setShowForm(false);
  };

  const openEditUbo = (decl: UboDeclarationRow, uboIndex: number) => {
    const ubo = decl.ubo_data[uboIndex];
    if (!ubo) return;
    setFormName(ubo.name);
    setFormBirthDate(ubo.birthDate ?? "");
    setFormNationality(ubo.nationality ?? "");
    setFormSharePercent(ubo.share_percent?.toString() ?? "");
    setFormControlType(ubo.control_type ?? "");
    setEditingDeclId(decl.id);
    setEditingUboIndex(uboIndex);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!org || !formName.trim()) return;
    setSaving(true);
    setError(null);

    const newUbo: UboPerson = {
      name: formName.trim(),
      birthDate: formBirthDate || null,
      nationality: formNationality || null,
      share_percent: formSharePercent ? parseFloat(formSharePercent) : null,
      control_type: formControlType || null,
    };

    try {
      if (editingDeclId && editingUboIndex >= 0) {
        // Update existing UBO person in existing declaration
        const decl = declarations.find((d) => d.id === editingDeclId);
        if (!decl) throw new Error("Declaration not found");
        const updatedUboData = [...decl.ubo_data];
        updatedUboData[editingUboIndex] = newUbo;

        const { error: updateErr } = await supabase
          .from("ubo_declarations")
          .update({ ubo_data: updatedUboData, updated_at: new Date().toISOString() })
          .eq("id", editingDeclId);
        if (updateErr) throw updateErr;
      } else if (declarations.length > 0) {
        // Add UBO person to the first existing declaration
        const decl = declarations[0];
        const updatedUboData = [...decl.ubo_data, newUbo];

        const { error: updateErr } = await supabase
          .from("ubo_declarations")
          .update({ ubo_data: updatedUboData, updated_at: new Date().toISOString() })
          .eq("id", decl.id);
        if (updateErr) throw updateErr;
      } else {
        // Create new declaration with first UBO person — customer_id is required
        if (!formCustomerId) {
          setError("Bitte wählen Sie einen Kunden aus.");
          setSaving(false);
          return;
        }
        const { error: insertErr } = await supabase.from("ubo_declarations").insert({
          customer_id: formCustomerId,
          organization_id: org.id,
          ubo_data: [newUbo],
          leta_status: "not_checked",
        });
        if (insertErr) throw insertErr;
      }
      resetForm();
      await loadDeclarations();
    } catch (err) {
      console.error("UBO save failed:", err);
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUbo = async (declId: string, uboIndex: number) => {
    if (!confirm("Möchten Sie diesen UBO-Eintrag wirklich löschen?")) return;
    try {
      const decl = declarations.find((d) => d.id === declId);
      if (!decl) return;
      const updatedUboData = decl.ubo_data.filter((_, i) => i !== uboIndex);

      if (updatedUboData.length === 0) {
        // Delete entire declaration if no UBOs left
        const { error: delErr } = await supabase.from("ubo_declarations").delete().eq("id", declId);
        if (delErr) throw delErr;
      } else {
        const { error: updateErr } = await supabase
          .from("ubo_declarations")
          .update({ ubo_data: updatedUboData, updated_at: new Date().toISOString() })
          .eq("id", declId);
        if (updateErr) throw updateErr;
      }
      await loadDeclarations();
    } catch (err) {
      console.error("UBO delete failed:", err);
      setError("Löschen fehlgeschlagen.");
    }
  };

  const getDeadlineDaysLeft = (deadline: string | null): number | null => {
    if (!deadline) return null;
    const dl = new Date(deadline);
    return Math.ceil((dl.getTime() - Date.now()) / 86400000);
  };

  // Flatten all UBO persons across all declarations for display
  const allUbos: { decl: UboDeclarationRow; ubo: UboPerson; index: number }[] = [];
  declarations.forEach((decl) => {
    (decl.ubo_data ?? []).forEach((ubo, i) => {
      allUbos.push({ decl, ubo, index: i });
    });
  });

  const totalShares = allUbos.reduce((sum, { ubo }) => sum + (ubo.share_percent ?? 0), 0);
  const discrepancyCount = declarations.filter((d) => d.leta_status === "discrepancy").length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        UBO-Daten werden geladen...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900 }}>
      <SectionLabel text="UBO / LETA Register" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        UBO / LETA Register
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 28px" }}>
        Wirtschaftlich Berechtigte deklarieren und LETA-Register-Status überwachen.
      </p>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #dc262622", color: "#dc2626", fontSize: 13, fontFamily: T.sans, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Summary card */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>UBO deklariert</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{allUbos.length}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Gesamtanteil</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalShares > 100 ? T.red : T.ink, fontFamily: T.sans }}>{totalShares}%</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Abweichungen</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: discrepancyCount > 0 ? T.red : T.accent, fontFamily: T.sans }}>
            {discrepancyCount}
          </div>
        </div>
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: T.sans, marginBottom: 20,
          }}
        >
          <Icon d={icons.plus} size={14} color="#fff" />
          UBO hinzufügen
        </button>
      )}

      {/* UBO Form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shMd, padding: "24px", marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 16px" }}>
            {editingDeclId ? "UBO bearbeiten" : "Neuen UBO erfassen"}
          </h3>
          {/* Customer selector (only for new declarations) */}
          {!editingDeclId && declarations.length === 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Kunde <span style={{ color: T.red }}>*</span></label>
              <select value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box" }}>
                <option value="">Kunde wählen...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_type === "natural_person"
                      ? [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unbekannt"
                      : c.company_name || "Unbekannt"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Name <span style={{ color: T.red }}>*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Vor- und Nachname"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Geburtsdatum</label>
              <input type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Nationalität</label>
              <input type="text" value={formNationality} onChange={(e) => setFormNationality(e.target.value)} placeholder="z.B. Schweiz"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Anteil (%)</label>
              <input type="number" min="0" max="100" value={formSharePercent} onChange={(e) => setFormSharePercent(e.target.value)} placeholder="25"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Kontrollart</label>
              <select value={formControlType} onChange={(e) => setFormControlType(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box" }}>
                <option value="">Bitte wählen...</option>
                {CONTROL_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving || !formName.trim()}
              style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: formName.trim() ? T.accent : T.s2, color: formName.trim() ? "#fff" : T.ink4, fontSize: 13, fontWeight: 700, cursor: formName.trim() && !saving ? "pointer" : "default", fontFamily: T.sans, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Wird gespeichert..." : editingDeclId ? "Aktualisieren" : "Speichern"}
            </button>
            <button onClick={resetForm}
              style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* UBO list */}
      {allUbos.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.users} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Noch keine UBO deklariert.</div>
        </div>
      ) : (
        declarations.map((decl) => {
          const status = LETA_STATUS_CONFIG[decl.leta_status] ?? LETA_STATUS_CONFIG.not_checked;
          const daysLeft = getDeadlineDaysLeft(decl.report_deadline);

          return (
            <div key={decl.id} style={{ marginBottom: 16 }}>
              {/* Declaration header with LETA status */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase" }}>
                  {status.label}
                </span>
                {decl.leta_status === "discrepancy" && daysLeft !== null && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, fontFamily: T.sans,
                    color: daysLeft <= 7 ? "#dc2626" : "#d97706",
                  }}>
                    {daysLeft <= 0
                      ? "Meldefrist abgelaufen!"
                      : `${daysLeft} Tage bis Meldefrist`}
                  </span>
                )}
              </div>

              {/* UBO persons in this declaration */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(decl.ubo_data ?? []).map((ubo, i) => (
                  <div key={i} style={{
                    background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`,
                    boxShadow: T.shSm, padding: "16px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon d={icons.users} size={20} color={T.ink3} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.sans, marginBottom: 4 }}>
                          {ubo.name}
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                          {ubo.nationality && <span>Nationalität: {ubo.nationality}</span>}
                          {ubo.share_percent != null && <span>Anteil: {ubo.share_percent}%</span>}
                          {ubo.control_type && <span>{ubo.control_type}</span>}
                          {ubo.birthDate && <span>Geb.: {ubo.birthDate}</span>}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEditUbo(decl, i)}
                          style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", color: T.ink3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                          Bearbeiten
                        </button>
                        <button onClick={() => handleDeleteUbo(decl.id, i)}
                          style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.red}22`, background: T.redS, color: T.red, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discrepancy warning */}
              {decl.leta_status === "discrepancy" && decl.discrepancy_details && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  background: (daysLeft ?? 30) <= 7 ? "#fef2f2" : "#fffbeb",
                  border: `1px solid ${(daysLeft ?? 30) <= 7 ? "#dc262622" : "#d9770622"}`,
                  fontSize: 12, fontFamily: T.sans, color: (daysLeft ?? 30) <= 7 ? "#dc2626" : "#d97706",
                }}>
                  {decl.discrepancy_details}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
