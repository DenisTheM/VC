import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  required: boolean;
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
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [packageName, setPackageName] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    loadChecklist();
  }, [org]);

  const loadChecklist = async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      // Find SRO compliance package for this org's SRO
      const { data: pkg, error: pkgErr } = await supabase
        .from("sro_compliance_packages")
        .select("id, name, checklist")
        .eq("sro", org.sro ?? "")
        .maybeSingle();

      if (pkgErr) throw pkgErr;

      if (pkg) {
        setPackageName(pkg.name);
        setPackageId(pkg.id);

        // Parse checklist items from JSONB
        const checklistItems = (pkg.checklist ?? []) as ChecklistItem[];
        setItems(checklistItems);

        // Load progress (JSONB object: {item_id: true/false})
        const { data: progressData, error: progressErr } = await supabase
          .from("organization_checklist_progress")
          .select("checklist_status")
          .eq("organization_id", org.id)
          .eq("package_id", pkg.id)
          .maybeSingle();

        if (progressErr) throw progressErr;

        const completed = new Set<string>();
        if (progressData?.checklist_status) {
          const status = progressData.checklist_status as Record<string, boolean>;
          for (const [itemId, done] of Object.entries(status)) {
            if (done) completed.add(itemId);
          }
        }
        setCompletedItems(completed);
      }
    } catch (err) {
      console.error("Checklist load error:", err);
      setError("Checkliste konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!org || !packageId || toggling) return;
    setToggling(itemId);
    const newCompleted = !completedItems.has(itemId);

    // Optimistic update
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (newCompleted) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });

    try {
      // Build the full checklist_status object
      const newStatus: Record<string, boolean> = {};
      for (const item of items) {
        if (item.id === itemId) {
          newStatus[item.id] = newCompleted;
        } else {
          newStatus[item.id] = completedItems.has(item.id);
        }
      }

      const { error } = await supabase
        .from("organization_checklist_progress")
        .upsert(
          {
            organization_id: org.id,
            package_id: packageId,
            checklist_status: newStatus,
            last_updated: new Date().toISOString(),
          },
          { onConflict: "organization_id,package_id" },
        );
      if (error) throw error;
    } catch (err) {
      console.error("Toggle failed:", err);
      // Revert optimistic update
      setCompletedItems((prev) => {
        const next = new Set(prev);
        if (newCompleted) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    } finally {
      setToggling(null);
    }
  };

  const completedCount = completedItems.size;
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

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #dc262622", color: "#dc2626", fontSize: 13, fontFamily: T.sans, marginBottom: 16 }}>
          {error}
        </div>
      )}

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
          const catCompleted = categoryItems.filter((item) => completedItems.has(item.id)).length;

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
                  const isCompleted = completedItems.has(item.id);
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
                          {item.text}
                        </div>
                        {item.required && !isCompleted && (
                          <div style={{ fontSize: 11, color: T.red, fontFamily: T.sans, marginTop: 2 }}>
                            Pflichtfeld
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
