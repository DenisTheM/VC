import { useState } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";
import { FORM_A_FIELDS, FORM_A_SECTIONS, type FormField } from "@shared/data/formAFields";
import { FORM_K_FIELDS, FORM_K_SECTIONS } from "@shared/data/formKFields";

type FormType = "form_a" | "form_k";

interface KycOnboardingPageProps {
  org: ClientOrg | null;
}

const STEPS = ["Formular wählen", "Daten erfassen", "Überprüfung", "Speichern"];

export function KycOnboardingPage({ org }: KycOnboardingPageProps) {
  const [step, setStep] = useState(0);
  const [formType, setFormType] = useState<FormType | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: FormField[] = formType === "form_a"
    ? FORM_A_FIELDS
    : formType === "form_k"
      ? FORM_K_FIELDS
      : [];

  const sections: readonly string[] = formType === "form_a"
    ? FORM_A_SECTIONS
    : formType === "form_k"
      ? FORM_K_SECTIONS
      : [];

  const setValue = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!org || !formType) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from("kyc_cases").insert({
        organization_id: org.id,
        case_type: formType,
        status: "draft",
        form_data: formData,
      });
      if (insertErr) throw insertErr;
      setSaved(true);
    } catch (err) {
      console.error("KYC save failed:", err);
      setError("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return formType !== null;
    if (step === 1) return true;
    if (step === 2) return true;
    return false;
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ padding: "40px 48px", maxWidth: 800 }}>
      <SectionLabel text="KYC Onboarding" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        KYC Onboarding
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 28px" }}>
        Formular A (natürliche Personen) oder Formular K (juristische Personen) erfassen.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          {STEPS.map((label, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: i <= step ? 700 : 400,
                color: i <= step ? T.accent : T.ink4,
                fontFamily: T.sans,
              }}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <div style={{ height: 4, borderRadius: 2, background: T.s2 }}>
          <div style={{ height: 4, borderRadius: 2, background: T.accent, width: `${progressPct}%`, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Step 1: Choose form type */}
      {step === 0 && (
        <div style={{ display: "flex", gap: 16 }}>
          {(["form_a", "form_k"] as FormType[]).map((ft) => {
            const isActive = formType === ft;
            const label = ft === "form_a" ? "Formular A" : "Formular K";
            const desc = ft === "form_a" ? "Natürliche Personen — Identifikation des Vertragspartners" : "Juristische Personen — Feststellung des Kontrollinhabers";
            return (
              <div
                key={ft}
                onClick={() => setFormType(ft)}
                style={{
                  flex: 1,
                  padding: "24px 20px",
                  borderRadius: T.rLg,
                  border: `2px solid ${isActive ? T.accent : T.border}`,
                  background: isActive ? T.accentS : "#fff",
                  cursor: "pointer",
                  boxShadow: isActive ? T.shMd : T.shSm,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? T.accent : T.s2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d={ft === "form_a" ? icons.users : icons.building} size={18} color={isActive ? "#fff" : T.ink3} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{label}</span>
                </div>
                <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 2: Fill form fields */}
      {step === 1 && (
        <div>
          {sections.map((section) => {
            const sectionFields = fields.filter((f) => f.section === section);
            if (sectionFields.length === 0) return null;
            return (
              <div key={section} style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 14px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                  {section}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {sectionFields.map((field) => (
                    <div key={field.id}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>
                        {field.label} {field.required && <span style={{ color: T.red }}>*</span>}
                      </label>
                      {field.type === "text" && (
                        <input
                          type="text"
                          value={(formData[field.id] as string) ?? ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder ?? ""}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none" }}
                        />
                      )}
                      {field.type === "date" && (
                        <input
                          type="date"
                          value={(formData[field.id] as string) ?? ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", outline: "none" }}
                        />
                      )}
                      {field.type === "select" && (
                        <select
                          value={(formData[field.id] as string) ?? ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box" }}
                        >
                          <option value="">Bitte wählen...</option>
                          {(field.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === "textarea" && (
                        <textarea
                          value={(formData[field.id] as string) ?? ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder ?? ""}
                          rows={3}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none", resize: "vertical" }}
                        />
                      )}
                      {field.type === "toggle" && (
                        <div
                          onClick={() => setValue(field.id, !formData[field.id])}
                          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                        >
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: formData[field.id] ? T.accent : T.s2, transition: "background 0.2s", position: "relative" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: formData[field.id] ? 18 : 2, transition: "left 0.2s", boxShadow: T.shSm }} />
                          </div>
                          <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>{formData[field.id] ? "Ja" : "Nein"}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 3: Review summary */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 16px" }}>
            Zusammenfassung
          </h3>
          <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, background: T.accentS, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase" }}>
                {formType === "form_a" ? "Formular A" : "Formular K"}
              </span>
            </div>
            {sections.map((section) => {
              const sectionFields = fields.filter((f) => f.section === section);
              const filledFields = sectionFields.filter((f) => formData[f.id] !== undefined && formData[f.id] !== "");
              if (filledFields.length === 0) return null;
              return (
                <div key={section} style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, fontFamily: T.sans, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.3px" }}>{section}</div>
                  {filledFields.map((f) => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: T.sans, padding: "4px 0" }}>
                      <span style={{ color: T.ink3 }}>{f.label}</span>
                      <span style={{ color: T.ink, fontWeight: 500 }}>{String(formData[f.id])}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Save confirmation */}
      {step === 3 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          {saved ? (
            <>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.accentS, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Icon d={icons.check} size={28} color={T.accent} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 8px" }}>KYC-Fall gespeichert</h2>
              <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans }}>Der Fall wurde als Entwurf gespeichert und kann jederzeit weiterbearbeitet werden.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, marginBottom: 20 }}>
                Klicken Sie auf &laquo;Speichern&raquo;, um den KYC-Fall als Entwurf zu speichern.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 32px",
                  borderRadius: 10,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: T.sans,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Wird gespeichert..." : "Speichern"}
              </button>
              {error && <p style={{ fontSize: 13, color: T.red, fontFamily: T.sans, marginTop: 12 }}>{error}</p>}
            </>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      {!saved && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: "#fff",
              color: step === 0 ? T.ink4 : T.ink2,
              fontSize: 13,
              fontWeight: 600,
              cursor: step === 0 ? "default" : "pointer",
              fontFamily: T.sans,
            }}
          >
            <Icon d={icons.back} size={14} color={step === 0 ? T.ink4 : T.ink2} />
            Zurück
          </button>
          {step < 3 && (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={!canProceed()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: canProceed() ? T.accent : T.s2,
                color: canProceed() ? "#fff" : T.ink4,
                fontSize: 13,
                fontWeight: 700,
                cursor: canProceed() ? "pointer" : "default",
                fontFamily: T.sans,
              }}
            >
              Weiter
              <Icon d={icons.arrow} size={14} color={canProceed() ? "#fff" : T.ink4} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
