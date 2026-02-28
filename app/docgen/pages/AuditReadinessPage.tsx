import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { PROFILE_FIELDS } from "@shared/data/profileFields";
import { calculateAuditScore, auditColor, type AuditScoreResult, type AuditInputData } from "@shared/lib/auditScore";
import { loadAllAuditData, loadAllCompanyProfiles, type Organization, type OrgAuditData } from "../lib/api";
import { exportAuditReadinessPdf } from "@shared/lib/pdfExport";

interface AuditReadinessPageProps {
  organizations: Organization[];
}

interface OrgScore {
  org: Organization;
  score: AuditScoreResult;
}

export function AuditReadinessPage({ organizations }: AuditReadinessPageProps) {
  const [scores, setScores] = useState<OrgScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<OrgScore | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  useEffect(() => {
    Promise.all([loadAllAuditData(), loadAllCompanyProfiles()])
      .then(([auditData, profiles]) => {
        const auditMap = new Map<string, OrgAuditData>();
        for (const ad of auditData) auditMap.set(ad.orgId, ad);

        const results: OrgScore[] = organizations.map((org) => {
          const ad = auditMap.get(org.id);
          const profileData = profiles.get(org.id) ?? null;

          const input: AuditInputData = {
            documents: ad?.documents ?? [],
            profileData,
            profileFields: PROFILE_FIELDS,
            customers: [], // TODO: load customer data in batch if needed
            openActionCount: ad?.openActionCount ?? 0,
            overdueActionCount: ad?.overdueActionCount ?? 0,
            hasAnnualReport: (ad?.documents ?? []).some((d) => d.doc_type === "annual_report" && d.status === "current"),
            docTypeCount: new Set((ad?.documents ?? []).map((d) => d.doc_type)).size,
            lastDocUpdateDays: null, // Would need updated_at from docs
          };

          return { org, score: calculateAuditScore(input) };
        });

        setScores(results);
      })
      .catch((err) => console.error("Failed to load audit data:", err))
      .finally(() => setLoading(false));
  }, [organizations.length]);

  const sorted = [...scores].sort((a, b) =>
    sortBy === "score" ? a.score.total - b.score.total : a.org.name.localeCompare(b.org.name),
  );

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, o) => s + o.score.total, 0) / scores.length) : 0;
  const criticalCount = scores.filter((s) => s.score.total < 50).length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Audit-Daten werden geladen...
      </div>
    );
  }

  /* ─── Detail View ─── */
  if (selectedOrg) {
    const { org, score } = selectedOrg;
    const cats = [
      { key: "documents", label: "Dokumente", weight: "30%", icon: icons.doc },
      { key: "profile", label: "Profil", weight: "15%", icon: icons.building },
      { key: "customers", label: "KYC-Kunden", weight: "25%", icon: icons.users },
      { key: "actions", label: "Offene Massnahmen", weight: "15%", icon: icons.clock },
      { key: "training", label: "Schulung/Doku", weight: "15%", icon: icons.shield },
    ] as const;

    return (
      <div>
        <SectionLabel text="Audit Readiness" />
        <button
          onClick={() => setSelectedOrg(null)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", color: T.ink3,
            fontSize: 13, cursor: "pointer", fontFamily: T.sans, padding: 0, marginBottom: 16,
          }}
        >
          <Icon d={icons.back} size={14} color={T.ink3} />
          Alle Organisationen
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {/* Score gauge */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: score.bg, border: `3px solid ${score.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", flexShrink: 0,
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: score.color, fontFamily: T.sans }}>{score.total}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: score.color, fontFamily: T.sans }}>{score.label}</div>
          </div>
          <div>
            <h1 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.ink, margin: "0 0 4px" }}>
              {org.name}
            </h1>
            <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, margin: 0 }}>
              SRO Audit Readiness Score — {org.sro ?? "Keine SRO"}
            </p>
          </div>
          <button
            onClick={() => exportAuditReadinessPdf(org.name, score)}
            style={{
              marginLeft: "auto",
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: "#fff", color: T.ink2, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: T.sans,
            }}
          >
            <Icon d={icons.download} size={14} color={T.ink3} />
            PDF Export
          </button>
        </div>

        {/* Category cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cats.map(({ key, label, weight, icon }) => {
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
                      <span style={{ fontSize: 11, color: T.ink4, fontWeight: 400, marginLeft: 8 }}>
                        Gewichtung: {weight}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: catColor.color, fontFamily: T.sans,
                  }}>
                    {cat.score}%
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, background: T.s2, marginBottom: cat.details.length > 0 ? 10 : 0 }}>
                  <div style={{ height: 6, borderRadius: 3, background: catColor.color, width: `${cat.score}%`, transition: "width 0.3s" }} />
                </div>
                {/* Details */}
                {cat.details.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {cat.details.map((d, i) => (
                      <div key={i} style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, paddingLeft: 4 }}>
                        &bull; {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── List View ─── */
  return (
    <div>
      <SectionLabel text="Audit Readiness" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        SRO Audit Readiness
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Prüfungsbereitschaft aller Kundenorganisationen im Überblick.
      </p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: T.rLg, padding: "20px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink3, fontFamily: T.sans, marginBottom: 8 }}>Durchschnitt</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: auditColor(avgScore).color, fontFamily: T.sans }}>{avgScore}%</div>
        </div>
        <div style={{ background: "#fff", borderRadius: T.rLg, padding: "20px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink3, fontFamily: T.sans, marginBottom: 8 }}>Kritisch (&lt;50%)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: criticalCount > 0 ? "#dc2626" : T.accent, fontFamily: T.sans }}>{criticalCount}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: T.rLg, padding: "20px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: T.ink3, fontFamily: T.sans, marginBottom: 8 }}>Organisationen</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{scores.length}</div>
        </div>
      </div>

      {/* Sort controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setSortBy("score")}
          style={{
            padding: "6px 14px", borderRadius: 16, fontSize: 12,
            border: `1px solid ${sortBy === "score" ? T.accent : T.border}`,
            background: sortBy === "score" ? T.accentS : "#fff",
            color: sortBy === "score" ? T.accent : T.ink3,
            fontWeight: sortBy === "score" ? 600 : 400,
            cursor: "pointer", fontFamily: T.sans,
          }}
        >
          Nach Score
        </button>
        <button
          onClick={() => setSortBy("name")}
          style={{
            padding: "6px 14px", borderRadius: 16, fontSize: 12,
            border: `1px solid ${sortBy === "name" ? T.accent : T.border}`,
            background: sortBy === "name" ? T.accentS : "#fff",
            color: sortBy === "name" ? T.accent : T.ink3,
            fontWeight: sortBy === "name" ? 600 : 400,
            cursor: "pointer", fontFamily: T.sans,
          }}
        >
          Nach Name
        </button>
      </div>

      {/* Org list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(({ org, score }) => {
          const cats = score.categories;
          return (
            <div
              key={org.id}
              onClick={() => setSelectedOrg({ org, score })}
              style={{
                background: "#fff", borderRadius: T.r, padding: "16px 20px",
                border: `1px solid ${T.border}`, borderLeft: `3px solid ${score.color}`,
                boxShadow: T.shSm, cursor: "pointer", transition: "box-shadow 0.15s",
                display: "flex", alignItems: "center", gap: 16,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shMd; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shSm; }}
            >
              {/* Score circle */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: score.bg, border: `2px solid ${score.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: score.color, fontFamily: T.sans }}>{score.total}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>{org.name}</div>
                <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                  {org.sro ?? "Keine SRO"} · {org.industry ?? "—"}
                </div>
              </div>

              {/* Mini category bars */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {([
                  { score: cats.documents.score, label: "D" },
                  { score: cats.profile.score, label: "P" },
                  { score: cats.customers.score, label: "K" },
                  { score: cats.actions.score, label: "M" },
                  { score: cats.training.score, label: "S" },
                ] as const).map((c, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 4,
                      background: auditColor(c.score).bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, color: auditColor(c.score).color,
                    }}>
                      {c.label}
                    </div>
                  </div>
                ))}
              </div>

              <Icon d="M9 5l7 7-7 7" size={14} color={T.ink4} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
