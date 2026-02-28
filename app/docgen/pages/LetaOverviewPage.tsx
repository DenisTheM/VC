import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

type LetaStatus = "not_checked" | "matched" | "discrepancy" | "pending_report" | "reported";

interface UboPerson {
  name: string;
  birthDate?: string | null;
  nationality?: string | null;
  share_percent?: number | null;
  control_type?: string | null;
}

interface UboDeclarationRow {
  id: string;
  organization_id: string;
  customer_id: string;
  ubo_data: UboPerson[];
  leta_status: LetaStatus;
  report_deadline: string | null;
  created_at: string;
}

// Flattened display entry
interface FlatUboEntry {
  declId: string;
  organizationId: string;
  orgName: string;
  person: UboPerson;
  letaStatus: LetaStatus;
  reportDeadline: string | null;
}

const LETA_STATUS_CONFIG: Record<LetaStatus, { label: string; bg: string; color: string }> = {
  not_checked: { label: "Nicht geprüft", bg: T.s2, color: T.ink3 },
  matched: { label: "Übereinstimmung", bg: T.accentS, color: T.accent },
  discrepancy: { label: "Abweichung", bg: T.redS, color: T.redD },
  pending_report: { label: "Meldung ausstehend", bg: T.amberS, color: T.amberD },
  reported: { label: "Gemeldet", bg: T.blueS, color: T.blue },
};

interface LetaOverviewPageProps {
  organizations: Organization[];
}

export function LetaOverviewPage({ organizations }: LetaOverviewPageProps) {
  const [declarations, setDeclarations] = useState<UboDeclarationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ubo_declarations")
        .select("id, organization_id, customer_id, ubo_data, leta_status, report_deadline, created_at")
        .order("organization_id");

      if (error) throw error;
      setDeclarations((data ?? []) as UboDeclarationRow[]);
    } catch (err) {
      console.error("LETA load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Flatten all UBO persons across all declarations for display
  const allEntries: FlatUboEntry[] = [];
  declarations.forEach((decl) => {
    const orgName = orgMap.get(decl.organization_id) ?? "Unbekannt";
    (decl.ubo_data ?? []).forEach((person) => {
      allEntries.push({
        declId: decl.id,
        organizationId: decl.organization_id,
        orgName,
        person,
        letaStatus: decl.leta_status,
        reportDeadline: decl.report_deadline,
      });
    });
  });

  const filtered = orgFilter ? allEntries.filter((e) => e.organizationId === orgFilter) : allEntries;

  // Org-level summary
  const orgSummary = new Map<string, { name: string; totalPersons: number; declarations: number; discrepancies: number; deadline: string | null }>();
  declarations.forEach((decl) => {
    const orgName = orgMap.get(decl.organization_id) ?? "Unbekannt";
    const current = orgSummary.get(decl.organization_id) ?? { name: orgName, totalPersons: 0, declarations: 0, discrepancies: 0, deadline: null };
    current.declarations++;
    current.totalPersons += (decl.ubo_data ?? []).length;
    if (decl.leta_status === "discrepancy" || decl.leta_status === "pending_report") {
      current.discrepancies++;
      if (decl.report_deadline) {
        if (!current.deadline || decl.report_deadline < current.deadline) {
          current.deadline = decl.report_deadline;
        }
      }
    }
    orgSummary.set(decl.organization_id, current);
  });

  const totalDiscrepancies = declarations.filter((d) => d.leta_status === "discrepancy").length;
  const totalPending = declarations.filter((d) => d.leta_status === "pending_report").length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        LETA-Daten werden geladen...
      </div>
    );
  }

  return (
    <div>
      <SectionLabel text="LETA / UBO-Übersicht" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        LETA / UBO Register
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Cross-Client Übersicht aller UBO-Deklarationen und LETA-Register-Status.
      </p>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>UBO Personen</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{allEntries.length}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Abweichungen</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalDiscrepancies > 0 ? T.redD : T.accent, fontFamily: T.sans }}>{totalDiscrepancies}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Meldung ausstehend</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalPending > 0 ? T.amberD : T.ink, fontFamily: T.sans }}>{totalPending}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Organisationen</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{orgSummary.size}</div>
        </div>
      </div>

      {/* Org filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={orgFilter ?? ""} onChange={(e) => setOrgFilter(e.target.value || null)}
          style={{ padding: "10px 14px", borderRadius: T.r, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink2, background: "#fff" }}>
          <option value="">Alle Organisationen</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Org summary table */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 12px" }}>Übersicht nach Organisation</h3>
      {orgSummary.size === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.users} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine UBO-Deklarationen vorhanden.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`, boxShadow: T.shSm, overflow: "hidden", marginBottom: 28 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "10px 18px", background: T.s1, borderBottom: `1px solid ${T.border}` }}>
            {["Organisation", "UBO Personen", "LETA Status", "Abweichungen", "Meldefrist"].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</span>
            ))}
          </div>
          {[...orgSummary.entries()].map(([orgId, summary]) => {
            const hasDiscrepancy = summary.discrepancies > 0;
            const daysLeft = summary.deadline ? Math.ceil((new Date(summary.deadline).getTime() - Date.now()) / 86400000) : null;
            // Determine dominant LETA status for org
            const orgDecls = declarations.filter((d) => d.organization_id === orgId);
            const hasDisc = orgDecls.some((d) => d.leta_status === "discrepancy");
            const hasMatch = orgDecls.some((d) => d.leta_status === "matched");
            const dominantStatus: LetaStatus = hasDisc ? "discrepancy" : hasMatch ? "matched" : "not_checked";
            const statusCfg = LETA_STATUS_CONFIG[dominantStatus];

            return (
              <div key={orgId} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8,
                padding: "12px 18px", borderBottom: `1px solid ${T.borderL}`, alignItems: "center",
                background: hasDiscrepancy ? "#fef2f205" : "transparent",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>{summary.name}</span>
                <span style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>{summary.totalPersons}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: statusCfg.color, background: statusCfg.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, display: "inline-block", width: "fit-content" }}>
                  {statusCfg.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: hasDiscrepancy ? T.redD : T.ink3, fontFamily: T.sans }}>
                  {summary.discrepancies}
                </span>
                <span style={{
                  fontSize: 12, fontFamily: T.sans, fontWeight: 600,
                  color: daysLeft !== null && daysLeft <= 7 ? T.redD : daysLeft !== null && daysLeft <= 14 ? T.amberD : T.ink3,
                }}>
                  {daysLeft !== null ? (daysLeft <= 0 ? "Abgelaufen" : `${daysLeft} Tage`) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed entry list */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 12px" }}>Einzeleinträge</h3>
      {filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}` }}>
          Keine Einträge für den ausgewählten Filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((e, idx) => {
            const status = LETA_STATUS_CONFIG[e.letaStatus] ?? LETA_STATUS_CONFIG.not_checked;
            return (
              <div key={`${e.declId}-${idx}`} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`,
                padding: "10px 16px", boxShadow: T.shSm,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, flex: 1 }}>{e.orgName}</span>
                <span style={{ fontSize: 12.5, color: T.ink2, fontFamily: T.sans, flex: 1 }}>{e.person.name}</span>
                <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, width: 60 }}>
                  {e.person.share_percent != null ? `${e.person.share_percent}%` : "—"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: status.color, background: status.bg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
