import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

interface KycCase {
  id: string;
  organization_id: string;
  case_type: "form_a" | "form_k";
  status: string;
  customer_id: string | null;
  risk_category: string | null;
  created_at: string;
  org_name?: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: T.s2, color: T.ink3, label: "Entwurf" },
  submitted: { bg: "#eff6ff", color: "#3b82f6", label: "Eingereicht" },
  in_review: { bg: "#fffbeb", color: "#d97706", label: "In Prüfung" },
  approved: { bg: T.accentS, color: T.accent, label: "Genehmigt" },
  rejected: { bg: "#fef2f2", color: "#dc2626", label: "Abgelehnt" },
};

const CASE_TYPE_LABELS: Record<string, string> = {
  form_a: "Formular A",
  form_k: "Formular K",
};

interface KycCasesPageProps {
  organizations: Organization[];
}

export function KycCasesPage({ organizations }: KycCasesPageProps) {
  const [cases, setCases] = useState<KycCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kyc_cases")
        .select("id, organization_id, case_type, status, customer_id, risk_category, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(
        (data ?? []).map((c: KycCase) => ({
          ...c,
          org_name: orgMap.get(c.organization_id) ?? "Unbekannt",
        })),
      );
    } catch (err) {
      console.error("KYC cases load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = cases.filter((c) => {
    const matchOrg = !orgFilter || c.organization_id === orgFilter;
    const matchSearch = !search || c.org_name?.toLowerCase().includes(search.toLowerCase()) || c.customer_id?.toLowerCase().includes(search.toLowerCase());
    return matchOrg && matchSearch;
  });

  const statusCounts = {
    total: cases.length,
    draft: cases.filter((c) => c.status === "draft").length,
    submitted: cases.filter((c) => c.status === "submitted").length,
    in_review: cases.filter((c) => c.status === "in_review").length,
    approved: cases.filter((c) => c.status === "approved").length,
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        KYC-Fälle werden geladen...
      </div>
    );
  }

  return (
    <div>
      <SectionLabel text="KYC-Verwaltung" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        KYC Cases
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 20px" }}>
        Übersicht aller KYC-Fälle nach Organisation.
      </p>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", count: statusCounts.total, color: T.ink },
          { label: "Entwurf", count: statusCounts.draft, color: T.ink3 },
          { label: "Eingereicht", count: statusCounts.submitted, color: "#3b82f6" },
          { label: "In Prüfung", count: statusCounts.in_review, color: "#d97706" },
          { label: "Genehmigt", count: statusCounts.approved, color: T.accent },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ padding: "10px 16px", borderRadius: T.r, background: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: T.sans }}>{count}</span>
            <span style={{ fontSize: 12, color, fontFamily: T.sans }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
            <Icon d={icons.search} size={16} color={T.ink4} />
          </div>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="KYC-Fälle durchsuchen..."
            style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: T.r, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box", outline: "none" }}
          />
        </div>
        <select value={orgFilter ?? ""} onChange={(e) => setOrgFilter(e.target.value || null)}
          style={{ padding: "10px 14px", borderRadius: T.r, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink2, background: "#fff" }}>
          <option value="">Alle Organisationen</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.doc} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine KYC-Fälle gefunden.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`, boxShadow: T.shSm, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "10px 18px", background: T.s1, borderBottom: `1px solid ${T.border}` }}>
            {["Organisation", "Typ", "Status", "Kunden-ID", "Risiko", "Erstellt"].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {filtered.map((c) => {
            const stat = STATUS_COLORS[c.status] ?? STATUS_COLORS.draft;
            const date = new Date(c.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${T.borderL}`, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.org_name}</span>
                <span style={{ fontSize: 12, color: T.ink2, fontFamily: T.sans }}>{CASE_TYPE_LABELS[c.case_type] ?? c.case_type}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: stat.color, background: stat.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, display: "inline-block", width: "fit-content" }}>{stat.label}</span>
                <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>{c.customer_id ?? "—"}</span>
                <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>{c.risk_category ?? "—"}</span>
                <span style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans }}>{date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
