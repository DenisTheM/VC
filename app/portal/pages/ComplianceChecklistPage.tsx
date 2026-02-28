import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface ChecklistProgress {
  checklist_item_id: string;
  completed: boolean;
  completed_at: string | null;
}

const CATEGORIES = ["Dokumente", "Prozesse", "Schulung", "Fristen", "Audit", "Organisation"];

const CATEGORY_ICONS: Record<string, string> = {
  Dokumente: icons.doc,
  Prozesse: icons.settings,
  Schulung: icons.sparkle,
  Fristen: icons.clock,
  Audit: icons.shield,
  Organisation: icons.building,
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Dokumente: { bg: "#eff6ff", color: "#3b82f6" },
  Prozesse: { bg: T.accentS, color: T.accent },
  Schulung: { bg: "#fef3c7", color: "#d97706" },
  Fristen: { bg: "#fef2f2", color: "#dc2626" },
  Audit: { bg: "#f0fdf4", color: "#16a34a" },
  Organisation: { bg: "#f5f3ff", color: "#7c3aed" },
};

interface ComplianceChecklistPageProps {
  org: ClientOrg | null;
}

export function ComplianceChecklistPage({ org }: ComplianceChecklistPageProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<Map<string, ChecklistProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [packageName, setPackageName] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    loadChecklist();
  }, [org]);

  const loadChecklist = async () => {
    if (!org) return;
    setLoading(true);
    try {
      // Find SRO compliance package for this org's SRO
      const { data: pkg } = await supabase
        .from("sro_compliance_packages")
        .select("id, name")
        .eq("sro", org.sro ?? "")
        .maybeSingle();

      if (pkg) {
        setPackageName(pkg.name);
        // Load checklist items for this package
        const { data: checklistItems } = await supabase
          .from("sro_checklist_items")
          .select("id, category, title, description, sort_order")
          .eq("package_id", pkg.id)
          .order("sort_order");

        setItems((checklistItems ?? []) as ChecklistItem[]);

        // Load progress
        const { data: progressData } = await supabase
          .from("organization_checklist_progress")
          .select("checklist_item_id, completed, completed_at")
          .eq("organization_id", org.id);

        const map = new Map<string, ChecklistProgress>();
        (progressData ?? []).forEach((p: ChecklistProgress) => {
          map.set(p.checklist_item_id, p);
        });
        setProgress(map);
      }
    } catch (err) {
      console.error("Checklist load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!org || toggling) return;
    setToggling(itemId);
    const current = progress.get(itemId);
    const newCompleted = !current?.completed;

    try {
      const { error } = await supabase
        .from("organization_checklist_progress")
        .upsert(
          {
            organization_id: org.id,
            checklist_item_id: itemId,
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
          },
          { onConflict: "organization_id,checklist_item_id" },
        );
      if (error) throw error;

      setProgress((prev) => {
        const next = new Map(prev);
        next.set(itemId, {
          checklist_item_id: itemId,
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        });
        return next;
      });
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setToggling(null);
    }
  };

  const completedCount = [...progress.values()].filter((p) => p.completed).length;
  const totalCount = items.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Checkliste wird geladen...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 800 }}>
      <SectionLabel text="Compliance-Checkliste" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        Compliance-Checkliste
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 8px" }}>
        {packageName ? `Paket: ${packageName} (${org?.sro ?? "Keine SRO"})` : "Kein SRO-Paket zugewiesen."}
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 32, background: "#fff", borderRadius: T.rLg, padding: "20px 24px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>Fortschritt</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: completionPct === 100 ? T.accent : T.ink, fontFamily: T.sans }}>
            {completionPct}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: T.s2 }}>
          <div style={{
            height: 8, borderRadius: 4,
            background: completionPct === 100 ? T.accent : completionPct >= 60 ? T.accent : completionPct >= 30 ? "#d97706" : T.red,
            width: `${completionPct}%`, transition: "width 0.3s",
          }} />
        </div>
        <div style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, marginTop: 6 }}>
          {completedCount} von {totalCount} Punkten erledigt
        </div>
      </div>

      {/* Checklist grouped by category */}
      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>
            {packageName ? "Keine Checklist-Punkte gefunden." : "Bitte wenden Sie sich an Virtue Compliance für die SRO-Zuweisung."}
          </div>
        </div>
      ) : (
        CATEGORIES.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;
          const catColors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Dokumente;
          const catIcon = CATEGORY_ICONS[category] ?? icons.doc;
          const catCompleted = categoryItems.filter((item) => progress.get(item.id)?.completed).length;

          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: catColors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon d={catIcon} size={14} color={catColors.color} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{category}</span>
                <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>{catCompleted}/{categoryItems.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {categoryItems.map((item) => {
                  const isCompleted = progress.get(item.id)?.completed ?? false;
                  const isToggling = toggling === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "12px 16px", borderRadius: T.r,
                        background: isCompleted ? T.accentS : "#fff",
                        border: `1px solid ${isCompleted ? `${T.accent}33` : T.border}`,
                        cursor: isToggling ? "default" : "pointer",
                        transition: "all 0.15s", opacity: isToggling ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                        border: `2px solid ${isCompleted ? T.accent : T.border}`,
                        background: isCompleted ? T.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isCompleted && <Icon d={icons.check} size={12} color="#fff" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: isCompleted ? T.ink3 : T.ink,
                          fontFamily: T.sans, textDecoration: isCompleted ? "line-through" : "none",
                        }}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2, lineHeight: 1.4 }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
