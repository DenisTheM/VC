import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

type TriggerStatus = "new" | "investigating" | "resolved" | "dismissed";
type TriggerSeverity = "info" | "warning" | "critical";

interface PkycTrigger {
  id: string;
  trigger_type: string;
  description: string;
  severity: TriggerSeverity;
  status: TriggerStatus;
  created_at: string;
  resolved_at: string | null;
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

interface PkycDashboardPageProps {
  org: ClientOrg | null;
}

export function PkycDashboardPage({ org }: PkycDashboardPageProps) {
  const [triggers, setTriggers] = useState<PkycTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TriggerStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    loadTriggers();
  }, [org]);

  const loadTriggers = async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("pkyc_triggers")
        .select("id, trigger_type, description, severity, status, created_at, resolved_at")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setTriggers((data ?? []) as PkycTrigger[]);
    } catch (err) {
      console.error("pKYC load error:", err);
      setError("Triggers konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (triggerId: string, newStatus: TriggerStatus) => {
    setUpdating(triggerId);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === "resolved") {
        updates.resolved_at = new Date().toISOString();
      }
      const { error: updateErr } = await supabase
        .from("pkyc_triggers")
        .update(updates)
        .eq("id", triggerId);

      if (updateErr) throw updateErr;
      setTriggers((prev) =>
        prev.map((t) => t.id === triggerId ? { ...t, status: newStatus, resolved_at: newStatus === "resolved" ? new Date().toISOString() : t.resolved_at } : t),
      );
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredTriggers = filter === "all" ? triggers : triggers.filter((t) => t.status === filter);
  const statusCounts = {
    all: triggers.length,
    new: triggers.filter((t) => t.status === "new").length,
    investigating: triggers.filter((t) => t.status === "investigating").length,
    resolved: triggers.filter((t) => t.status === "resolved").length,
    dismissed: triggers.filter((t) => t.status === "dismissed").length,
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        pKYC Triggers werden geladen...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900 }}>
      <SectionLabel text="pKYC Monitoring" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        pKYC Monitoring
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 28px" }}>
        Perpetual KYC — Trigger-basierte laufende Überwachung Ihrer Geschäftsbeziehungen.
      </p>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #dc262622", color: "#dc2626", fontSize: 13, fontFamily: T.sans, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(["all", "new", "investigating", "resolved", "dismissed"] as const).map((key) => {
          const isActive = filter === key;
          const cfg = key === "all" ? { label: "Alle", bg: T.s1, color: T.ink } : STATUS_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(isActive && key !== "all" ? "all" : key)}
              style={{
                padding: "7px 14px", borderRadius: 20,
                border: `1px solid ${isActive ? cfg.color : T.border}`,
                background: isActive ? cfg.bg : "#fff",
                color: isActive ? cfg.color : T.ink3,
                fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                cursor: "pointer", fontFamily: T.sans,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {cfg.label}
              <span style={{
                fontSize: 10, fontWeight: 700, background: isActive ? `${cfg.color}22` : T.s2,
                color: isActive ? cfg.color : T.ink4, padding: "1px 6px", borderRadius: 8,
              }}>
                {statusCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Trigger timeline */}
      {filteredTriggers.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine Triggers gefunden.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredTriggers.map((trigger) => {
            const sev = SEVERITY_CONFIG[trigger.severity] ?? SEVERITY_CONFIG.info;
            const stat = STATUS_CONFIG[trigger.status] ?? STATUS_CONFIG.new;
            const typeLabel = TRIGGER_TYPE_LABELS[trigger.trigger_type] ?? trigger.trigger_type;
            const date = new Date(trigger.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
            const isUpdating = updating === trigger.id;

            return (
              <div
                key={trigger.id}
                style={{
                  background: "#fff", borderRadius: T.r,
                  border: `1px solid ${T.border}`, borderLeft: `4px solid ${sev.color}`,
                  boxShadow: T.shSm, padding: "16px 20px",
                  opacity: isUpdating ? 0.6 : 1, transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sev.color, background: sev.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase" }}>
                        {sev.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: stat.color, background: stat.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>
                        {stat.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: T.ink4, background: T.s2, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, marginLeft: "auto" }}>{date}</span>
                    </div>
                    {/* Description */}
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink, fontFamily: T.sans, lineHeight: 1.5 }}>
                      {trigger.description}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {trigger.status !== "resolved" && trigger.status !== "dismissed" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {trigger.status === "new" && (
                      <button
                        onClick={() => updateStatus(trigger.id, "investigating")}
                        disabled={isUpdating}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
                          background: "#fff", color: "#d97706", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: T.sans, display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <Icon d={icons.search} size={12} color="#d97706" />
                        Untersuchen
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(trigger.id, "resolved")}
                      disabled={isUpdating}
                      style={{
                        padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.accent}33`,
                        background: T.accentS, color: T.accent, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: T.sans, display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <Icon d={icons.check} size={12} color={T.accent} />
                      Erledigt
                    </button>
                    <button
                      onClick={() => updateStatus(trigger.id, "dismissed")}
                      disabled={isUpdating}
                      style={{
                        padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
                        background: "#fff", color: T.ink3, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: T.sans,
                      }}
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
