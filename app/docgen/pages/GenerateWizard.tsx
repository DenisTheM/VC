import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { Field } from "@shared/components/Field";
import { DOC_TYPES } from "../data/docTypes";
import type { DocType } from "../data/docTypes";
import { JURIS } from "../data/jurisdictions";
import { supabase } from "@shared/lib/supabase";
import { useAutosave, readAutosave } from "@shared/hooks/useAutosave";
import { MarkdownContent } from "@shared/components/MarkdownContent";
import { PROFILE_FIELDS } from "@shared/data/profileFields";
import { calcProfileCompletion } from "@shared/lib/profileCompletion";

interface GenerateWizardProps {
  profile: Record<string, unknown>;
  onNav: (id: string) => void;
  orgId?: string | null;
  orgName?: string;
  initialDocKey?: string | null;
}

export function GenerateWizard({ profile, onNav, orgId, orgName, initialDocKey }: GenerateWizardProps) {
  const autosaveKey = `vc:docgen:wizard:${orgId ?? "none"}`;
  const saved = !initialDocKey ? readAutosave<{ step: number; docKey: string | null; jurisdiction: string | null; answers: Record<string, unknown> }>(autosaveKey) : null;
  const [step, setStep] = useState(saved?.step ?? (initialDocKey ? 1 : 0));
  const [docKey, setDocKey] = useState<string | null>(saved?.docKey ?? initialDocKey ?? null);
  const [jurisdiction, setJurisdiction] = useState<string | null>(saved?.jurisdiction ?? null);
  const [answers, setAnswers] = useState<Record<string, unknown>>(saved?.answers ?? {});
  const [chapters, setChapters] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingStart, setGeneratingStart] = useState<number | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autosave = useAutosave({ key: autosaveKey, data: { step, docKey, jurisdiction, answers }, enabled: step < 3 });
  const doc: DocType | null = docKey ? DOC_TYPES[docKey] : null;

  // Initialize chapters from doc type when entering step 2
  useEffect(() => {
    if (doc && step === 2 && chapters.length === 0) {
      setChapters([...doc.chapters]);
    }
  }, [doc, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show slow-generation hint after 60 seconds
  useEffect(() => {
    if (!generating || !generatingStart) return;
    const timer = setTimeout(() => setSlowHint(true), 60_000);
    return () => clearTimeout(timer);
  }, [generating, generatingStart]);

  const STEP_LABELS = ["Dokumenttyp", "Jurisdiktion", "Fragen & Kapitel", "Generierung"];

  const StepIndicator = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
      {STEP_LABELS.map((label, i) => {
        const isActive = step === i;
        const isDone = step > i;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEP_LABELS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: isDone ? T.accent : isActive ? T.accent : T.s2,
                  color: isDone || isActive ? "#fff" : T.ink4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: T.sans,
                  flexShrink: 0,
                }}
              >
                {isDone ? "\u2713" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? T.ink : isDone ? T.accent : T.ink4,
                  fontFamily: T.sans,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: isDone ? T.accent : T.s2,
                  margin: "0 8px",
                  borderRadius: 1,
                  minWidth: 16,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  /* Guard: no org selected */
  if (!orgId) {
    return (
      <div>
        <SectionLabel text="Ebene B" />
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
          Dokument generieren
        </h1>
        <div style={{
          background: "#fff", borderRadius: T.rLg, padding: "32px 28px", border: `1px solid ${T.border}`,
          boxShadow: T.shSm, marginTop: 24, textAlign: "center",
        }}>
          <Icon d={icons.building} size={36} color={T.ink4} />
          <p style={{ fontSize: 15, color: T.ink2, fontFamily: T.sans, margin: "16px 0 20px" }}>
            Bitte wählen Sie zuerst einen Kunden aus, bevor Sie ein Dokument generieren.
          </p>
          <button
            onClick={() => onNav("organizations")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: T.accent, color: "#fff", fontSize: 14,
              fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
            }}
          >
            <Icon d={icons.folder} size={16} color="#fff" />
            Zur Kundenübersicht
          </button>
        </div>
      </div>
    );
  }

  /* Step 0: Choose document type */
  if (step === 0) {
    return (
      <div>
        <StepIndicator />
        <SectionLabel text="Ebene B" />
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 28,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 2px",
          }}
        >
          Dokument generieren{orgName ? ` für ${orgName}` : ""}
        </h1>
        <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
          Wählen Sie den Dokumenttyp{orgName ? ` für ${orgName}` : ""}.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {Object.entries(DOC_TYPES).map(([key, d]) => (
            <button
              key={key}
              onClick={() => {
                setDocKey(key);
                setStep(1);
              }}
              style={{
                background: "#fff",
                borderRadius: T.rLg,
                padding: "22px 20px",
                border: `1px solid ${T.border}`,
                boxShadow: T.shSm,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                fontFamily: T.sans,
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
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: T.accentS,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Icon d={d.icon} size={20} color={T.accent} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                {d.name}
              </div>
              <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.4, marginBottom: 10 }}>
                {d.desc}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: T.ink4 }}>
                  <Icon d={icons.clock} size={12} color={T.ink4} /> {d.time}
                </span>
                <span style={{ fontSize: 11, color: T.ink4 }}>
                  {d.complexity}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {d.jurisdictions.map((j) => (
                  <span
                    key={j}
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: T.s2,
                      color: T.ink3,
                      fontFamily: T.sans,
                    }}
                  >
                    {JURIS[j]?.flag} {JURIS[j]?.name}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* Step 1: Choose jurisdiction + profile summary */
  if (step === 1 && doc) {
    const availableJuris = doc.jurisdictions;

    return (
      <div>
        <StepIndicator />
        <SectionLabel text="Ebene B" />
        <button
          onClick={() => {
            setStep(0);
            setDocKey(null);
            setJurisdiction(null);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: T.ink3,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: T.sans,
            padding: 0,
            marginBottom: 12,
          }}
        >
          <Icon d={icons.back} size={14} color={T.ink3} />
          Zurück
        </button>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 28,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 2px",
          }}
        >
          {doc.name}
        </h1>
        <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
          {doc.desc} &middot; Rechtsgrundlage: {doc.legal}
        </p>

        {/* Jurisdiction picker */}
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 14 }}>
            Jurisdiktion wählen
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {availableJuris.map((j) => {
              const jr = JURIS[j];
              if (!jr) return null;
              const sel = jurisdiction === j;
              return (
                <button
                  key={j}
                  onClick={() => setJurisdiction(j)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 20px",
                    borderRadius: T.r,
                    border: `2px solid ${sel ? T.accent : T.border}`,
                    background: sel ? T.accentS : "#fff",
                    cursor: jr.soon ? "not-allowed" : "pointer",
                    opacity: jr.soon ? 0.5 : 1,
                    fontFamily: T.sans,
                    transition: "all 0.15s",
                  }}
                  disabled={jr.soon}
                >
                  <span style={{ fontSize: 22 }}>{jr.flag}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{jr.name}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3 }}>{jr.reg}</div>
                  </div>
                  {jr.soon && (
                    <span
                      style={{
                        fontSize: 10,
                        background: T.amberS,
                        color: T.amber,
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      Bald
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile summary */}
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 14 }}>
            Firmenprofil (Ebene A)
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 20px",
            }}
          >
            {[
              ["Firma", profile.company_name],
              ["Rechtsform", profile.legal_form],
              ["UID", profile.uid],
              ["Branche", profile.industry],
              ["SRO", profile.sro],
              ["Mitarbeitende", profile.employees],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.borderL}` }}>
                <span style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans }}>{label as string}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                  {(value as string) || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chapters preview */}
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 12 }}>
            Kapitelstruktur ({doc.chapters.length} Kapitel)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {doc.chapters.map((ch, i) => (
              <span
                key={ch}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  background: T.s2,
                  fontSize: 12,
                  color: T.ink2,
                  fontFamily: T.sans,
                }}
              >
                {i + 1}. {ch}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (jurisdiction) setStep(2);
          }}
          disabled={!jurisdiction}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 28px",
            borderRadius: 8,
            border: "none",
            background: jurisdiction ? T.accent : T.border,
            color: jurisdiction ? "#fff" : T.ink4,
            fontSize: 14,
            fontWeight: 600,
            cursor: jurisdiction ? "pointer" : "not-allowed",
            fontFamily: T.sans,
          }}
        >
          Weiter zu Fragen
          <Icon d={icons.arrow} size={16} color={jurisdiction ? "#fff" : T.ink4} />
        </button>
      </div>
    );
  }

  /* Step 2: Document-specific questions */
  if (step === 2 && doc) {
    return (
      <div>
        <StepIndicator />
        <SectionLabel text="Ebene B" />
        <button
          onClick={() => setStep(1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: T.ink3,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: T.sans,
            padding: 0,
            marginBottom: 12,
          }}
        >
          <Icon d={icons.back} size={14} color={T.ink3} />
          Zurück
        </button>
        {/* Profile completeness warning */}
        {(() => {
          const pct = calcProfileCompletion(profile, PROFILE_FIELDS);
          if (pct >= 70) return null;
          return (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 8,
                background: "#fffbeb", border: "1px solid #d9770622",
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 16 }}>&#9888;</span>
              <div style={{ flex: 1, fontSize: 12.5, color: "#92400e", fontFamily: T.sans }}>
                <strong>Profil nur {pct}% vollständig</strong> — unvollständige Profile können zu ungenauen Angaben im Dokument führen.
              </div>
            </div>
          );
        })()}
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 28,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 2px",
          }}
        >
          {doc.name} — Fragen
        </h1>
        <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
          Beantworten Sie die folgenden Fragen, damit der DocGen Ihr Dokument optimal erstellen kann.
        </p>

        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "24px 28px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 24,
          }}
        >
          {doc.fields.map((f) => (
            <Field
              key={f.id}
              field={f}
              value={answers[f.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [f.id]: v }))}
            />
          ))}

          {/* Custom prompt field */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.borderL}` }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 6 }}>
              Zusätzliche Anweisungen (optional)
            </label>
            <textarea
              value={(answers.__customPrompt as string) ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, __customPrompt: e.target.value }))}
              placeholder="z.B. Bitte besonders auf Crypto-Risiken eingehen..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                fontFamily: T.sans,
                color: T.ink2,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 4 }}>
              Ihre Anweisungen werden bei der Generierung berücksichtigt.
            </div>
          </div>
        </div>

        {/* TOC Editor */}
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "24px 28px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 14 }}>
            Kapitelstruktur anpassen
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {chapters.map((ch, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, width: 20, textAlign: "right", flexShrink: 0 }}>{i + 1}.</span>
                <input
                  type="text"
                  value={ch}
                  onChange={(e) => {
                    const next = [...chapters];
                    next[i] = e.target.value;
                    setChapters(next);
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    fontSize: 13,
                    fontFamily: T.sans,
                    color: T.ink2,
                    outline: "none",
                  }}
                />
                {/* Move up */}
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const next = [...chapters];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setChapters(next);
                  }}
                  disabled={i === 0}
                  style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: 2, opacity: i === 0 ? 0.3 : 1 }}
                  title="Nach oben"
                >
                  <Icon d="M5 15l7-7 7 7" size={14} color={T.ink3} />
                </button>
                {/* Move down */}
                <button
                  onClick={() => {
                    if (i === chapters.length - 1) return;
                    const next = [...chapters];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    setChapters(next);
                  }}
                  disabled={i === chapters.length - 1}
                  style={{ background: "none", border: "none", cursor: i === chapters.length - 1 ? "default" : "pointer", padding: 2, opacity: i === chapters.length - 1 ? 0.3 : 1 }}
                  title="Nach unten"
                >
                  <Icon d="M19 9l-7 7-7-7" size={14} color={T.ink3} />
                </button>
                {/* Delete */}
                <button
                  onClick={() => {
                    setChapters(chapters.filter((_, j) => j !== i));
                  }}
                  disabled={chapters.length <= 1}
                  style={{ background: "none", border: "none", cursor: chapters.length <= 1 ? "default" : "pointer", padding: 2, opacity: chapters.length <= 1 ? 0.3 : 1 }}
                  title="Entfernen"
                >
                  <Icon d="M6 18L18 6M6 6l12 12" size={14} color={T.red} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setChapters([...chapters, ""])}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px dashed ${T.border}`,
              background: "none",
              color: T.ink3,
              fontSize: 12.5,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            <Icon d={icons.plus} size={13} color={T.ink3} />
            Kapitel hinzufügen
          </button>
        </div>

        <button
          onClick={() => setStep(3)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 28px",
            borderRadius: 8,
            border: "none",
            background: T.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.sans,
          }}
        >
          <Icon d={icons.sparkle} size={16} color="#fff" />
          Dokument generieren
        </button>
      </div>
    );
  }

  // Trigger generation when step 3 is entered (via useEffect to avoid React Strict Mode double-fire)
  useEffect(() => {
    if (step !== 3 || !doc || generating || result || error) return;
    if (!orgId) {
      setError("Keine Organisation ausgewählt. Bitte wählen Sie zuerst eine Organisation.");
      return;
    }
    setGenerating(true);
    setGeneratingStart(Date.now());
    setSlowHint(false);
    supabase.functions
      .invoke("generate-document", {
        body: {
          docType: docKey,
          jurisdiction,
          companyProfile: profile,
          answers,
          organizationId: orgId,
          chapters: chapters.filter((c) => c.trim()),
        },
      })
      .then(({ data, error: fnError }) => {
        setGenerating(false);
        setGeneratingStart(null);
        setSlowHint(false);
        if (fnError) {
          let msg = "Fehler bei der Generierung.";
          try {
            const parsed = typeof fnError.message === "string" ? JSON.parse(fnError.message) : null;
            if (parsed?.error) msg = parsed.error;
          } catch {
            msg = fnError.message || msg;
          }
          if (data?.error) msg = data.error;
          setError(msg);
        } else {
          const content = data?.document?.content;
          setResult(content || (typeof data === "string" ? data : "Dokument wurde generiert, aber kein Inhalt erhalten."));
          autosave.clear();
        }
      })
      .catch((err: Error) => {
        setGenerating(false);
        setGeneratingStart(null);
        setSlowHint(false);
        setError(err.message || "Unbekannter Fehler.");
      });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Step 3: Generation — call edge function */
  if (step === 3 && doc) {

    /* Loading state */
    if (generating) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: T.accentS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Icon d={icons.sparkle} size={28} color={T.accent} />
          </div>
          <h2
            style={{
              fontFamily: T.serif,
              fontSize: 22,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            Dokument wird generiert...
          </h2>
          <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px", textAlign: "center" }}>
            {doc.name} &middot; {JURIS[jurisdiction!]?.flag} {JURIS[jurisdiction!]?.name}
          </p>
          {/* Animated progress bar */}
          <div
            style={{
              width: 300,
              height: 4,
              borderRadius: 2,
              background: T.s2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "60%",
                borderRadius: 2,
                background: T.accent,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; transform: translateX(-30%); } 50% { opacity: 1; transform: translateX(70%); } }`}</style>
          {slowHint && (
            <div style={{ marginTop: 16, fontSize: 13, color: T.amber, fontFamily: T.sans, textAlign: "center" }}>
              Generierung dauert länger als üblich — bitte haben Sie Geduld...
            </div>
          )}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {doc.chapters.slice(0, 5).map((ch, i) => (
              <div
                key={ch}
                style={{
                  fontSize: 12,
                  color: T.ink4,
                  fontFamily: T.sans,
                  opacity: 0.6 + i * 0.1,
                }}
              >
                Kapitel {i + 1}: {ch}
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* Error state */
    if (error) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: T.redS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 28 }}>&#10060;</span>
          </div>
          <h2
            style={{
              fontFamily: T.serif,
              fontSize: 22,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            Generierung fehlgeschlagen
          </h2>
          <p style={{ fontSize: 14, color: T.red, fontFamily: T.sans, margin: "0 0 24px", textAlign: "center", maxWidth: 400 }}>
            {error}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setError(null);
                setResult(null);
                setGenerating(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => {
                setStep(2);
                setResult(null);
                setError(null);
                setGenerating(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.back} size={14} color={T.ink} />
              Zurück zu Fragen
            </button>
            <button
              onClick={() => onNav("dashboard")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 8,
                border: "none",
                background: T.primary,
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              Zum Dashboard
            </button>
          </div>
        </div>
      );
    }

    /* Success / result state */
    if (result) {
      return (
        <div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0 32px",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: T.accentS,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Icon d={icons.check} size={28} color={T.accent} />
            </div>
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                fontWeight: 700,
                color: T.ink,
                margin: "0 0 6px",
              }}
            >
              Dokument erfolgreich generiert
            </h2>
            <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: 0 }}>
              {doc.name} &middot; {JURIS[jurisdiction!]?.flag} {JURIS[jurisdiction!]?.name}
            </p>
          </div>

          {/* Document preview */}
          <div
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "28px 32px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
              marginBottom: 24,
              maxHeight: 500,
              overflow: "auto",
            }}
          >
            <MarkdownContent content={result} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => onNav("documents")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 8,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.folder} size={16} color="#fff" />
              Zu Dokumenten
            </button>
            <button
              onClick={() => {
                setStep(2);
                setResult(null);
                setError(null);
                setGenerating(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.back} size={16} color={T.ink} />
              Antworten anpassen
            </button>
            <button
              onClick={() => {
                setStep(0);
                setDocKey(null);
                setJurisdiction(null);
                setAnswers({});
                setChapters([]);
                setResult(null);
                setError(null);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.plus} size={16} color={T.ink} />
              Neues Dokument
            </button>
            <button
              onClick={() => onNav("dashboard")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return null;
}
