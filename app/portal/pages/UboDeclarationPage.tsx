import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

type LetaStatus = "not_checked" | "matched" | "discrepancy" | "pending_report" | "reported";

interface UboDeclaration {
  id: string;
  name: string;
  birth_date: string | null;
  nationality: string | null;
  share_percent: number | null;
  control_type: string | null;
  leta_status: LetaStatus;
  discrepancy_detected_at: string | null;
  created_at: string;
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

export function UboDeclarationPage({ org }: UboDeclarationPageProps) {
  const [declarations, setDeclarations] = useState<UboDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formNationality, setFormNationality] = useState("");
  const [formSharePercent, setFormSharePercent] = useState("");
  const [formControlType, setFormControlType] = useState("");

  useEffect(() => {
    if (!org) return;
    loadDeclarations();
  }, [org]);

  const loadDeclarations = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ubo_declarations")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeclarations((data ?? []) as UboDeclaration[]);
    } catch (err) {
      console.error("UBO load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormBirthDate("");
    setFormNationality("");
    setFormSharePercent("");
    setFormControlType("");
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (ubo: UboDeclaration) => {
    setFormName(ubo.name);
    setFormBirthDate(ubo.birth_date ?? "");
    setFormNationality(ubo.nationality ?? "");
    setFormSharePercent(ubo.share_percent?.toString() ?? "");
    setFormControlType(ubo.control_type ?? "");
    setEditId(ubo.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!org || !formName.trim()) return;
    setSaving(true);
    try {
      const row = {
        organization_id: org.id,
        name: formName.trim(),
        birth_date: formBirthDate || null,
        nationality: formNationality || null,
        share_percent: formSharePercent ? parseFloat(formSharePercent) : null,
        control_type: formControlType || null,
      };

      if (editId) {
        const { error } = await supabase.from("ubo_declarations").update(row).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ubo_declarations").insert({ ...row, leta_status: "not_checked" });
        if (error) throw error;
      }
      resetForm();
      await loadDeclarations();
    } catch (err) {
      console.error("UBO save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen UBO-Eintrag wirklich löschen?")) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("ubo_declarations").delete().eq("id", id);
      if (error) throw error;
      setDeclarations((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("UBO delete failed:", err);
    } finally {
      setDeleting(null);
    }
  };

  const getDiscrepancyDaysLeft = (detectedAt: string | null): number | null => {
    if (!detectedAt) return null;
    const deadline = new Date(detectedAt);
    deadline.setDate(deadline.getDate() + 30);
    return Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  };

  const totalShares = declarations.reduce((sum, d) => sum + (d.share_percent ?? 0), 0);

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

      {/* Summary card */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>UBO deklariert</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{declarations.length}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Gesamtanteil</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalShares > 100 ? T.red : T.ink, fontFamily: T.sans }}>{totalShares}%</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Abweichungen</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: declarations.some((d) => d.leta_status === "discrepancy") ? T.red : T.accent, fontFamily: T.sans }}>
            {declarations.filter((d) => d.leta_status === "discrepancy").length}
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
            {editId ? "UBO bearbeiten" : "Neuen UBO erfassen"}
          </h3>
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
              {saving ? "Wird gespeichert..." : editId ? "Aktualisieren" : "Speichern"}
            </button>
            <button onClick={resetForm}
              style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* UBO list */}
      {declarations.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.users} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Noch keine UBO deklariert.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {declarations.map((ubo) => {
            const status = LETA_STATUS_CONFIG[ubo.leta_status] ?? LETA_STATUS_CONFIG.not_checked;
            const daysLeft = getDiscrepancyDaysLeft(ubo.discrepancy_detected_at);
            const isDeleting = deleting === ubo.id;

            return (
              <div key={ubo.id} style={{
                background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`,
                boxShadow: T.shSm, padding: "16px 20px", opacity: isDeleting ? 0.5 : 1, transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon d={icons.users} size={20} color={T.ink3} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{ubo.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: status.color, background: status.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                      {ubo.nationality && <span>Nationalität: {ubo.nationality}</span>}
                      {ubo.share_percent != null && <span>Anteil: {ubo.share_percent}%</span>}
                      {ubo.control_type && <span>{ubo.control_type}</span>}
                    </div>

                    {/* Discrepancy warning with countdown */}
                    {ubo.leta_status === "discrepancy" && daysLeft !== null && (
                      <div style={{
                        marginTop: 8, padding: "8px 12px", borderRadius: 8,
                        background: daysLeft <= 7 ? "#fef2f2" : "#fffbeb",
                        border: `1px solid ${daysLeft <= 7 ? "#dc262622" : "#d9770622"}`,
                        fontSize: 12, fontFamily: T.sans, color: daysLeft <= 7 ? "#dc2626" : "#d97706",
                        fontWeight: 600,
                      }}>
                        {daysLeft <= 0
                          ? "Meldefrist abgelaufen — sofortige Meldung erforderlich!"
                          : `Meldefrist: ${daysLeft} Tage verbleibend (30-Tage-Frist)`}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(ubo)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", color: T.ink3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                      Bearbeiten
                    </button>
                    <button onClick={() => handleDelete(ubo.id)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.red}22`, background: T.redS, color: T.red, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
