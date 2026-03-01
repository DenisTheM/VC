import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { PROFILE_FIELDS } from "@shared/data/profileFields";
import { calculateAuditScore, auditColor, type AuditScoreResult, type AuditInputData } from "@shared/lib/auditScore";
import { loadClientProfile, loadClientDocuments, type ClientOrg } from "../lib/api";
import { loadCustomerStats } from "../lib/customerApi";

interface ClientAuditReadinessProps {
  org: ClientOrg | null;
  embedded?: boolean;
}

export function ClientAuditReadiness({ org, embedded }: ClientAuditReadinessProps) {
  const [score, setScore] = useState<AuditScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      loadClientProfile(org.id),
      loadClientDocuments(org.id),
      loadCustomerStats(org.id),
    ])
      .then(([profileData, docs, custStats]) => {
        const input: AuditInputData = {
          documents: docs.map((d) => ({ doc_type: d.docType, status: d.status, next_review: d.nextReview })),
          profileData,
          profileFields: PROFILE_FIELDS,
          customers: [],
          openActionCount: custStats.reviewDue ?? 0,
          overdueActionCount: 0,
          hasAnnualReport: docs.some((d) => d.docType === "annual_report" && d.status === "current"),
          docTypeCount: new Set(docs.map((d) => d.docType)).size,
          lastDocUpdateDays: null,
        };

        setScore(calculateAuditScore(input));
      })
      .catch((err) => console.error("Audit score error:", err))
      .finally(() => setLoading(false));
  }, [org?.id]);

  if (loading) {
    return (
      <div style={{ padding: embedded ? "20px 0" : "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Audit-Score wird berechnet...
      </div>
    );
  }

  if (!score) {
    return (
      <div style={{ padding: embedded ? "20px 0" : "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Score konnte nicht berechnet werden.
      </div>
    );
  }

  const cats = [
    { key: "documents" as const, label: "Dokumente", weight: "30%", icon: icons.doc, reco: "Erstellen und pflegen Sie alle Pflicht-Dokumente." },
    { key: "profile" as const, label: "Firmenprofil", weight: "15%", icon: icons.building, reco: "Vervollständigen Sie alle Pflichtfelder im Firmenprofil." },
    { key: "customers" as const, label: "KYC-Kunden", weight: "25%", icon: icons.users, reco: "Überprüfen Sie fällige Kunden-Reviews und KYC-Dokumente." },
    { key: "actions" as const, label: "Massnahmen", weight: "15%", icon: icons.clock, reco: "Schliessen Sie offene Compliance-Massnahmen ab." },
    { key: "training" as const, label: "Schulung & Doku", weight: "15%", icon: icons.shield, reco: "Erstellen Sie einen Jahresbericht und diversifizieren Sie Ihre Dokumente." },
  ];

  return (
    <div style={embedded ? { maxWidth: 960 } : { padding: "40px 48px", maxWidth: 960 }}>
      {!embedded && (
        <>
          <SectionLabel text="Audit Readiness" />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            SRO Audit Readiness
          </h1>
        </>
      )}
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 28px" }}>
        Wie gut ist {org?.short_name || org?.name || "Ihre Organisation"} auf eine SRO-Prüfung vorbereitet?
      </p>

      {/* Score gauge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 24, marginBottom: 32,
        background: "#fff", borderRadius: T.rLg, padding: "28px 32px",
        border: `1px solid ${T.border}`, boxShadow: T.shMd,
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: score.bg, border: `4px solid ${score.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: score.color, fontFamily: T.sans }}>{score.total}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: score.color, fontFamily: T.sans }}>{score.label}</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: T.sans, marginBottom: 4 }}>
            Ihr Audit-Score: {score.total}%
          </div>
          <div style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, lineHeight: 1.5 }}>
            {score.total >= 80
              ? "Ihre Organisation ist gut auf eine SRO-Prüfung vorbereitet."
              : score.total >= 50
                ? "Es gibt noch Handlungsbedarf in einigen Bereichen."
                : "Dringender Handlungsbedarf — bitte priorisieren Sie die offenen Punkte."}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cats.map(({ key, label, weight, icon, reco }) => {
          const cat = score.categories[key];
          const catColor = auditColor(cat.score);

          return (
            <div
              key={key}
              style={{
                background: "#fff", borderRadius: T.r, padding: "18px 22px",
                border: `1px solid ${T.border}`, boxShadow: T.shSm,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: catColor.bg, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon d={icon} size={16} color={catColor.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                    {label}
                    <span style={{ fontSize: 11, color: T.ink4, fontWeight: 400, marginLeft: 8 }}>({weight})</span>
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: catColor.color, fontFamily: T.sans }}>
                  {cat.score}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: T.s2, marginBottom: 10 }}>
                <div style={{ height: 6, borderRadius: 3, background: catColor.color, width: `${cat.score}%`, transition: "width 0.3s" }} />
              </div>

              {/* Details or recommendation */}
              {cat.details.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {cat.details.map((d, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>&bull; {d}</div>
                  ))}
                </div>
              ) : cat.score < 100 ? (
                <div style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>{reco}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
