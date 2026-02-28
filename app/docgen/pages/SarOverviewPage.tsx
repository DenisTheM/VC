import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

interface SarSummary {
  id: string;
  organization_id: string;
  status: string;
  created_at: string;
  reference_number: string | null;
  org_name?: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: T.s2, color: T.ink3, label: "Entwurf" },
  submitted: { bg: "#eff6ff", color: "#3b82f6", label: "Eingereicht" },
  under_review: { bg: "#fffbeb", color: "#d97706", label: "In Prüfung" },
  filed: { bg: T.accentS, color: T.accent, label: "Gemeldet" },
  closed: { bg: T.s2, color: T.ink3, label: "Abgeschlossen" },
};

interface SarOverviewPageProps {
  organizations: Organization[];
}

export function SarOverviewPage({ organizations }: SarOverviewPageProps) {
  const [reports, setReports] = useState<SarSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Only load minimal fields — no content for confidentiality
      const { data, error } = await supabase
        .from("sar_reports")
        .select("id, organization_id, status, created_at, reference_number")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(
        (data ?? []).map((r: SarSummary) => ({
          ...r,
          org_name: orgMap.get(r.organization_id) ?? "Unbekannt",
        })),
      );
    } catch (err) {
      console.error("SAR load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orgFilter ? reports.filter((r) => r.organization_id === orgFilter) : reports;

  const statusCounts = {
    total: reports.length,
    draft: reports.filter((r) => r.status === "draft").length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    filed: reports.filter((r) => r.status === "filed").length,
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Verdachtsmeldungen werden geladen...
      </div>
    );
  }

  return (
    <div>
      <SectionLabel text="SAR-Verwaltung" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        Verdachtsmeldungen (SAR)
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 6px" }}>
        Statusübersicht aller Verdachtsmeldungen. Inhalte sind aus Vertraulichkeitsgründen nicht einsehbar.
      </p>

      {/* Confidentiality notice */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        borderRadius: T.r, background: "#fffbeb", border: "1px solid #d9770622",
        marginBottom: 20, fontSize: 12, color: "#92400e", fontFamily: T.sans, fontWeight: 500,
      }}>
        <Icon d={icons.shield} size={16} color="#d97706" />
        Vertraulichkeitshinweis: Nur Metadaten werden angezeigt. Meldungsinhalte sind nicht abrufbar.
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", count: statusCounts.total, color: T.ink },
          { label: "Entwurf", count: statusCounts.draft, color: T.ink3 },
          { label: "Eingereicht", count: statusCounts.submitted, color: "#3b82f6" },
          { label: "Gemeldet", count: statusCounts.filed, color: T.accent },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ padding: "10px 16px", borderRadius: T.r, background: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: T.sans }}>{count}</span>
            <span style={{ fontSize: 12, color, fontFamily: T.sans }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Org filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={orgFilter ?? ""} onChange={(e) => setOrgFilter(e.target.value || null)}
          style={{ padding: "10px 14px", borderRadius: T.r, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink2, background: "#fff" }}>
          <option value="">Alle Organisationen</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine Verdachtsmeldungen gefunden.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`, boxShadow: T.shSm, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, padding: "10px 18px", background: T.s1, borderBottom: `1px solid ${T.border}` }}>
            {["Organisation", "Status", "Referenz", "Erstellt"].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {filtered.map((r) => {
            const stat = STATUS_COLORS[r.status] ?? STATUS_COLORS.draft;
            const date = new Date(r.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${T.borderL}`, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>{r.org_name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: stat.color, background: stat.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, display: "inline-block", width: "fit-content" }}>{stat.label}</span>
                <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>{r.reference_number ?? "—"}</span>
                <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>{date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
