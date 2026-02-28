import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

type TriggerStatus = "new" | "investigating" | "resolved" | "dismissed";
type TriggerSeverity = "info" | "warning" | "critical";

interface PkycTrigger {
  id: string;
  organization_id: string;
  trigger_type: string;
  description: string;
  severity: TriggerSeverity;
  status: TriggerStatus;
  created_at: string;
  org_name?: string;
}

const STATUS_CONFIG: Record<TriggerStatus, { label: string; bg: string; color: string }> = {
  new: { label: "Neu", bg: "#eff6ff", color: "#3b82f6" },
  investigating: { label: "In Abklärung", bg: "#fffbeb", color: "#d97706" },
  resolved: { label: "Erledigt", bg: T.accentS, color: T.accent },
  dismissed: { label: "Abgelehnt", bg: T.s2, color: T.ink3 },
};

const SEVERITY_CONFIG: Record<TriggerSeverity, { label: string; bg: string; color: string }> = {
  critical: { label: "Kritisch", bg: "#fef2f2", color: "#dc2626" },
  warning: { label: "Warnung", bg: "#fffbeb", color: "#d97706" },
  info: { label: "Info", bg: "#eff6ff", color: "#3b82f6" },
};

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  sanctions_hit: "Sanktionstreffer",
  adverse_media: "Adverse Media",
  registry_change: "Registeränderung",
  transaction_anomaly: "Transaktionsanomalie",
  review_due: "Review fällig",
  manual: "Manuell",
};

interface PkycOverviewPageProps {
  organizations: Organization[];
}

export function PkycOverviewPage({ organizations }: PkycOverviewPageProps) {
  const [triggers, setTriggers] = useState<PkycTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TriggerStatus | "all">("all");
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("pkyc_triggers")
        .select("id, organization_id, trigger_type, description, severity, status, created_at")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;

      const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
      setTriggers(
        (data ?? []).map((t: PkycTrigger) => ({
          ...t,
          org_name: orgMap.get(t.organization_id) ?? "Unbekannt",
        })),
      );
    } catch (err) {
      console.error("pKYC triggers load error:", err);
      setError("Trigger konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = triggers.filter((t) => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchOrg = !orgFilter || t.organization_id === orgFilter;
    return matchStatus && matchOrg;
  });

  // Dashboard counts
  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  triggers.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    bySeverity[t.severity] = (bySeverity[t.severity] ?? 0) + 1;
  });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        pKYC-Daten werden geladen...
      </div>
    );
  }

  return (
    <div>
      <SectionLabel text="pKYC-Übersicht" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        pKYC Monitor
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Cross-Client Übersicht aller pKYC-Trigger und deren Bearbeitungsstatus.
      </p>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #dc262622", color: "#dc2626", fontSize: 13, fontFamily: T.sans, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Dashboard cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Status counts */}
        <div style={{ background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 12 }}>Nach Status</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(["new", "investigating", "resolved", "dismissed"] as TriggerStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: cfg.color, fontFamily: T.sans }}>{byStatus[s] ?? 0}</span>
                  <span style={{ fontSize: 11, color: cfg.color, fontFamily: T.sans }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity counts */}
        <div style={{ background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 12 }}>Nach Schweregrad</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(["critical", "warning", "info"] as TriggerSeverity[]).map((s) => {
              const cfg = SEVERITY_CONFIG[s];
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: cfg.color, fontFamily: T.sans }}>{bySeverity[s] ?? 0}</span>
                  <span style={{ fontSize: 11, color: cfg.color, fontFamily: T.sans }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {(["all", "new", "investigating", "resolved", "dismissed"] as const).map((key) => {
          const isActive = statusFilter === key;
          const cfg = key === "all" ? { label: "Alle", bg: T.s1, color: T.ink } : STATUS_CONFIG[key];
          return (
            <button key={key} onClick={() => setStatusFilter(isActive && key !== "all" ? "all" : key)}
              style={{
                padding: "6px 14px", borderRadius: 16,
                border: `1px solid ${isActive ? cfg.color : T.border}`,
                background: isActive ? cfg.bg : "#fff",
                color: isActive ? cfg.color : T.ink3,
                fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                cursor: "pointer", fontFamily: T.sans,
              }}>
              {cfg.label}
            </button>
          );
        })}
        <select value={orgFilter ?? ""} onChange={(e) => setOrgFilter(e.target.value || null)}
          style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12.5, fontFamily: T.sans, color: T.ink2, background: "#fff", marginLeft: 8 }}>
          <option value="">Alle Organisationen</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Trigger list */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine pKYC-Trigger gefunden.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((t) => {
            const sev = SEVERITY_CONFIG[t.severity] ?? SEVERITY_CONFIG.info;
            const stat = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.new;
            const typeLabel = TRIGGER_TYPE_LABELS[t.trigger_type] ?? t.trigger_type;
            const date = new Date(t.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });

            return (
              <div key={t.id} style={{
                background: "#fff", borderRadius: T.r,
                border: `1px solid ${T.border}`, borderLeft: `4px solid ${sev.color}`,
                boxShadow: T.shSm, padding: "14px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>{t.org_name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: sev.color, background: sev.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase" }}>
                    {sev.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: stat.color, background: stat.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>
                    {stat.label}
                  </span>
                  <span style={{ fontSize: 10, color: T.ink4, background: T.s2, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>{typeLabel}</span>
                  <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, marginLeft: "auto" }}>{date}</span>
                </div>
                <div style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans, lineHeight: 1.5 }}>
                  {t.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
