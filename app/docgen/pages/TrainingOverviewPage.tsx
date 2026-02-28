import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

interface ModuleSummary {
  id: string;
  title: string;
}

interface ProgressEntry {
  organization_id: string;
  module_id: string;
  completed_at: string | null;
  score: number | null;
}

interface OrgTrainingSummary {
  orgId: string;
  orgName: string;
  completed: number;
  total: number;
  pct: number;
  avgScore: number | null;
}

interface TrainingOverviewPageProps {
  organizations: Organization[];
}

export function TrainingOverviewPage({ organizations }: TrainingOverviewPageProps) {
  const [summaries, setSummaries] = useState<OrgTrainingSummary[]>([]);
  const [totalModules, setTotalModules] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "pct">("pct");

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modulesRes, progressRes] = await Promise.all([
        supabase.from("elearning_modules").select("id, title"),
        supabase.from("elearning_progress").select("organization_id, module_id, completed_at, score"),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (progressRes.error) throw progressRes.error;

      const modules = (modulesRes.data ?? []) as ModuleSummary[];
      const progress = (progressRes.data ?? []) as ProgressEntry[];
      const moduleCount = modules.length;
      setTotalModules(moduleCount);

      // Group progress by org
      const orgProgress = new Map<string, { completed: number; scores: number[] }>();
      progress.forEach((p) => {
        const current = orgProgress.get(p.organization_id) ?? { completed: 0, scores: [] };
        if (p.completed_at) {
          current.completed++;
          if (p.score != null) current.scores.push(p.score);
        }
        orgProgress.set(p.organization_id, current);
      });

      // Build summaries for all orgs
      const results: OrgTrainingSummary[] = organizations.map((org) => {
        const prog = orgProgress.get(org.id);
        const completed = prog?.completed ?? 0;
        const pct = moduleCount > 0 ? Math.round((completed / moduleCount) * 100) : 0;
        const avgScore = prog?.scores && prog.scores.length > 0
          ? Math.round(prog.scores.reduce((a, b) => a + b, 0) / prog.scores.length)
          : null;
        return {
          orgId: org.id,
          orgName: org.name,
          completed,
          total: moduleCount,
          pct,
          avgScore,
        };
      });

      setSummaries(results);
    } catch (err) {
      console.error("Training overview load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...summaries].sort((a, b) => {
    if (sortBy === "pct") return a.pct - b.pct; // Low completion first
    return a.orgName.localeCompare(b.orgName);
  });

  const totalCompleted = summaries.reduce((sum, s) => sum + s.completed, 0);
  const totalPossible = summaries.length * totalModules;
  const overallPct = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const lowCompletionCount = summaries.filter((s) => s.pct < 50).length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Schulungsdaten werden geladen...
      </div>
    );
  }

  return (
    <div>
      <SectionLabel text="Schulungsverwaltung" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        Schulungsübersicht
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Schulungsfortschritt aller Organisationen auf einen Blick.
      </p>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Module verfügbar</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{totalModules}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Gesamt-Abschlussrate</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: overallPct >= 80 ? T.accent : overallPct >= 50 ? "#d97706" : T.red, fontFamily: T.sans }}>{overallPct}%</div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: T.s2 }}>
            <div style={{ height: 4, borderRadius: 2, background: overallPct >= 80 ? T.accent : overallPct >= 50 ? "#d97706" : T.red, width: `${overallPct}%`, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: T.rLg, padding: "18px 22px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Organisationen &lt;50%</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: lowCompletionCount > 0 ? T.red : T.accent, fontFamily: T.sans }}>{lowCompletionCount}</div>
        </div>
      </div>

      {/* Sort toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, fontWeight: 600 }}>Sortierung:</span>
        <button onClick={() => setSortBy("pct")}
          style={{
            padding: "5px 12px", borderRadius: 16, border: `1px solid ${sortBy === "pct" ? T.accent : T.border}`,
            background: sortBy === "pct" ? T.accentS : "#fff", color: sortBy === "pct" ? T.accent : T.ink3,
            fontSize: 12, fontWeight: sortBy === "pct" ? 600 : 400, cursor: "pointer", fontFamily: T.sans,
          }}>
          Abschlussrate
        </button>
        <button onClick={() => setSortBy("name")}
          style={{
            padding: "5px 12px", borderRadius: 16, border: `1px solid ${sortBy === "name" ? T.accent : T.border}`,
            background: sortBy === "name" ? T.accentS : "#fff", color: sortBy === "name" ? T.accent : T.ink3,
            fontSize: 12, fontWeight: sortBy === "name" ? 600 : 400, cursor: "pointer", fontFamily: T.sans,
          }}>
          Name
        </button>
      </div>

      {/* Org table */}
      {sorted.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.sparkle} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine Organisationen vorhanden.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`, boxShadow: T.shSm, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr", gap: 8, padding: "10px 18px", background: T.s1, borderBottom: `1px solid ${T.border}` }}>
            {["Organisation", "Abgeschlossen", "Total", "Fortschritt", "Avg. Score"].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.ink4, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {sorted.map((s) => {
            const barColor = s.pct >= 80 ? T.accent : s.pct >= 50 ? "#d97706" : T.red;
            const isLow = s.pct < 50;
            return (
              <div key={s.orgId} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr", gap: 8,
                padding: "12px 18px", borderBottom: `1px solid ${T.borderL}`, alignItems: "center",
                background: isLow ? "#fef2f205" : "transparent",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans, display: "flex", alignItems: "center", gap: 6 }}>
                  {s.orgName}
                  {isLow && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: T.red, background: T.redS, padding: "1px 6px", borderRadius: 4 }}>
                      Tief
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans }}>{s.completed}</span>
                <span style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans }}>{s.total}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.s2 }}>
                    <div style={{ height: 6, borderRadius: 3, background: barColor, width: `${s.pct}%`, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: barColor, fontFamily: T.sans, minWidth: 36 }}>{s.pct}%</span>
                </div>
                <span style={{ fontSize: 13, color: s.avgScore != null ? T.ink2 : T.ink4, fontFamily: T.sans }}>
                  {s.avgScore != null ? `${s.avgScore}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
