import { useState } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { Field } from "@shared/components/Field";
import { DOC_TYPES } from "../data/docTypes";
import type { DocType } from "../data/docTypes";
import { JURIS } from "../data/jurisdictions";
import { supabase } from "@shared/lib/supabase";

interface GenerateWizardProps {
  profile: Record<string, unknown>;
  onNav: (id: string) => void;
  orgId?: string | null;
  orgName?: string;
  initialDocKey?: string | null;
}

export function GenerateWizard({ profile, onNav, orgId, orgName, initialDocKey }: GenerateWizardProps) {
  const [step, setStep] = useState(initialDocKey ? 1 : 0);
  const [docKey, setDocKey] = useState<string | null>(initialDocKey ?? null);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doc: DocType | null = docKey ? DOC_TYPES[docKey] : null;

  /* Step 0: Choose document type */
  if (step === 0) {
    return (
      <div>
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
          Wählen Sie den Dokumenttyp, den Elena {orgName ? `für ${orgName} ` : ""}erstellen soll.
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
          Beantworten Sie die folgenden Fragen, damit Elena Ihr Dokument optimal erstellen kann.
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

  /* Step 3: Generation — call edge function */
  if (step === 3 && doc) {
    // Trigger generation on mount
    if (!generating && !result && !error) {
      setGenerating(true);
      supabase.functions
        .invoke("generate-document", {
          body: {
            docType: docKey,
            jurisdiction,
            profile,
            answers,
            organizationId: orgId || undefined,
          },
        })
        .then(({ data, error: fnError }) => {
          setGenerating(false);
          if (fnError) {
            setError(fnError.message || "Fehler bei der Generierung.");
          } else {
            setResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
          }
        })
        .catch((err: Error) => {
          setGenerating(false);
          setError(err.message || "Unbekannter Fehler.");
        });
    }

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
            Elena generiert Ihr Dokument...
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
          <div style={{ display: "flex", gap: 10 }}>
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
            <pre
              style={{
                fontFamily: T.sans,
                fontSize: 13,
                color: T.ink2,
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {result}
            </pre>
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
                setStep(0);
                setDocKey(null);
                setJurisdiction(null);
                setAnswers({});
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
