import { useState } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";
import { SAR_FIELDS, SAR_SECTIONS, SAR_WIZARD_STEPS } from "@shared/data/sarFields";
import { type FormField } from "@shared/data/formAFields";
import { generateGoamlXml, validateSarData } from "@shared/lib/goamlExport";

interface MrosWizardPageProps {
  org: ClientOrg | null;
}

export function MrosWizardPage({ org }: MrosWizardPageProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [xmlPreview, setXmlPreview] = useState<string>("");

  const fields = SAR_FIELDS;
  const sections = SAR_SECTIONS;
  const wizardSteps = SAR_WIZARD_STEPS;
  const totalSteps = wizardSteps.length;

  const setValue = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Map sections to wizard steps (steps 0-3 are form sections, step 4 is XML preview)
  const getSectionsForStep = (stepIndex: number): string[] => {
    if (stepIndex >= totalSteps - 1) return [];
    const sectionsPerStep = Math.ceil(sections.length / (totalSteps - 1));
    const start = stepIndex * sectionsPerStep;
    return sections.slice(start, start + sectionsPerStep);
  };

  const handleGenerateXml = () => {
    const result = validateSarData(formData as Record<string, string | boolean | undefined>);
    setValidationErrors(result.missing);
    const entity = { name: org?.name ?? "Unbekannt", sro: org?.sro ?? undefined };
    const xml = generateGoamlXml(formData as Record<string, string | boolean | undefined>, entity);
    setXmlPreview(xml);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlPreview], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verdachtsmeldung_${new Date().toISOString().split("T")[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from("sar_reports").insert({
        organization_id: org.id,
        status: "draft",
        report_data: formData,
        goaml_xml: xmlPreview || null,
      });
      if (insertErr) throw insertErr;
      setSaved(true);
    } catch (err) {
      console.error("SAR save failed:", err);
      setError("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  };

  const progressPct = ((step + 1) / totalSteps) * 100;
  const isLastStep = step === totalSteps - 1;

  // Generate XML when entering last step
  const goToStep = (newStep: number) => {
    if (newStep === totalSteps - 1) {
      handleGenerateXml();
    }
    setStep(newStep);
  };

  const renderField = (field: FormField) => (
    <div key={field.id} style={{ marginBottom: 14 }}>
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
          rows={4}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none", resize: "vertical" }}
        />
      )}
      {field.type === "toggle" && (
        <div onClick={() => setValue(field.id, !formData[field.id])} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div style={{ width: 36, height: 20, borderRadius: 10, background: formData[field.id] ? T.accent : T.s2, transition: "background 0.2s", position: "relative" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: formData[field.id] ? 18 : 2, transition: "left 0.2s", boxShadow: T.shSm }} />
          </div>
          <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>{formData[field.id] ? "Ja" : "Nein"}</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: "40px 48px", maxWidth: 800 }}>
      <SectionLabel text="Verdachtsmeldung (MROS)" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        Verdachtsmeldung (MROS)
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 28px" }}>
        Erfassen Sie eine Verdachtsmeldung gemäss GwG Art. 9. goAML-XML-Export wird automatisch generiert.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          {wizardSteps.map((ws, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: i <= step ? 700 : 400, color: i <= step ? T.accent : T.ink4, fontFamily: T.sans }}>
              {i + 1}. {ws.label}
            </span>
          ))}
        </div>
        <div style={{ height: 4, borderRadius: 2, background: T.s2 }}>
          <div style={{ height: 4, borderRadius: 2, background: T.accent, width: `${progressPct}%`, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Steps 1-4: Form fields grouped by section */}
      {!isLastStep && (
        <div>
          {getSectionsForStep(step).map((section) => {
            const sectionFields = fields.filter((f) => f.section === section);
            if (sectionFields.length === 0) return null;
            return (
              <div key={section} style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 14px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                  {section}
                </h3>
                {sectionFields.map(renderField)}
              </div>
            );
          })}
        </div>
      )}

      {/* Step 5: XML preview + download + validation */}
      {isLastStep && (
        <div>
          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: T.r, background: T.redS, border: `1px solid ${T.red}22` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.red, fontFamily: T.sans, marginBottom: 8 }}>
                Validierungsfehler ({validationErrors.length})
              </div>
              {validationErrors.map((err, i) => (
                <div key={i} style={{ fontSize: 12, color: T.red, fontFamily: T.sans, padding: "2px 0" }}>
                  - {err}
                </div>
              ))}
            </div>
          )}

          {validationErrors.length === 0 && (
            <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: T.r, background: T.accentS, border: `1px solid ${T.accent}22` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, fontFamily: T.sans, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d={icons.check} size={16} color={T.accent} />
                Validierung bestanden — XML bereit zum Export.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={handleDownloadXml}
              disabled={!xmlPreview}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: T.primaryDeep, color: "#fff", fontSize: 13,
                fontWeight: 700, cursor: "pointer", fontFamily: T.sans,
              }}
            >
              <Icon d={icons.download} size={14} color="#fff" />
              XML herunterladen
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: saved ? T.accentS : T.accent, color: saved ? T.accent : "#fff",
                fontSize: 13, fontWeight: 700, cursor: saving || saved ? "default" : "pointer",
                fontFamily: T.sans, opacity: saving ? 0.6 : 1,
              }}
            >
              <Icon d={saved ? icons.check : icons.shield} size={14} color={saved ? T.accent : "#fff"} />
              {saving ? "Wird gespeichert..." : saved ? "Gespeichert" : "Bericht speichern"}
            </button>
          </div>

          {error && <p style={{ fontSize: 13, color: T.red, fontFamily: T.sans, marginBottom: 16 }}>{error}</p>}

          {/* XML preview */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 10px" }}>goAML XML-Vorschau</h3>
            <pre style={{
              maxHeight: 400, overflow: "auto", padding: "18px 20px",
              background: T.s1, border: `1px solid ${T.border}`, borderRadius: T.r,
              fontSize: 12, fontFamily: "monospace", color: T.ink2, lineHeight: 1.5,
              whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>
              {xmlPreview || "Kein XML generiert."}
            </pre>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
        <button
          onClick={() => goToStep(Math.max(0, step - 1))}
          disabled={step === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 10, border: `1px solid ${T.border}`,
            background: "#fff", color: step === 0 ? T.ink4 : T.ink2,
            fontSize: 13, fontWeight: 600, cursor: step === 0 ? "default" : "pointer", fontFamily: T.sans,
          }}
        >
          <Icon d={icons.back} size={14} color={step === 0 ? T.ink4 : T.ink2} />
          Zurück
        </button>
        {!isLastStep && (
          <button
            onClick={() => goToStep(step + 1)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: T.sans,
            }}
          >
            Weiter
            <Icon d={icons.arrow} size={14} color="#fff" />
          </button>
        )}
      </div>
    </div>
  );
}
