import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

interface SroPackage {
  id: string;
  sro: string;
  name: string;
  description: string | null;
  review_cycle_months: number | null;
  checklist_count?: number;
  template_count?: number;
}

interface PackageAssignment {
  id: string;
  organization_id: string;
  package_id: string;
}

const SRO_COLORS: Record<string, { bg: string; color: string }> = {
  VQF: { bg: "#eff6ff", color: "#3b82f6" },
  PolyReg: { bg: T.accentS, color: T.accent },
  "SO-FIT": { bg: "#f5f3ff", color: "#7c3aed" },
  ARIF: { bg: "#fef3c7", color: "#d97706" },
  "OAR-G": { bg: "#fef2f2", color: "#dc2626" },
};

interface SroPackagesPageProps {
  organizations: Organization[];
}

export function SroPackagesPage({ organizations }: SroPackagesPageProps) {
  const [packages, setPackages] = useState<SroPackage[]>([]);
  const [assignments, setAssignments] = useState<PackageAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOrgId, setAssignOrgId] = useState<string>("");
  const [assignPkgId, setAssignPkgId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgRes, itemsRes, templatesRes, assignRes] = await Promise.all([
        supabase.from("sro_compliance_packages").select("id, sro, name, description, review_cycle_months").order("sro"),
        supabase.from("sro_checklist_items").select("package_id"),
        supabase.from("sro_document_templates").select("package_id"),
        supabase.from("organization_package_assignments").select("id, organization_id, package_id"),
      ]);

      if (pkgRes.error) throw pkgRes.error;

      // Count items per package
      const itemCounts = new Map<string, number>();
      (itemsRes.data ?? []).forEach((i: { package_id: string }) => {
        itemCounts.set(i.package_id, (itemCounts.get(i.package_id) ?? 0) + 1);
      });

      const templateCounts = new Map<string, number>();
      (templatesRes.data ?? []).forEach((t: { package_id: string }) => {
        templateCounts.set(t.package_id, (templateCounts.get(t.package_id) ?? 0) + 1);
      });

      setPackages(
        (pkgRes.data ?? []).map((p: SroPackage) => ({
          ...p,
          checklist_count: itemCounts.get(p.id) ?? 0,
          template_count: templateCounts.get(p.id) ?? 0,
        })),
      );

      setAssignments((assignRes.data ?? []) as PackageAssignment[]);
    } catch (err) {
      console.error("SRO packages load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignOrgId || !assignPkgId) return;
    setAssigning(true);
    try {
      const { error } = await supabase.from("organization_package_assignments").upsert(
        { organization_id: assignOrgId, package_id: assignPkgId },
        { onConflict: "organization_id" },
      );
      if (error) throw error;
      await loadData();
      setAssignOrgId("");
      setAssignPkgId("");
    } catch (err) {
      console.error("Assignment failed:", err);
    } finally {
      setAssigning(false);
    }
  };

  // Group packages by SRO
  const sroGroups = new Map<string, SroPackage[]>();
  packages.forEach((p) => {
    const group = sroGroups.get(p.sro) ?? [];
    group.push(p);
    sroGroups.set(p.sro, group);
  });

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
  const pkgMap = new Map(packages.map((p) => [p.id, p.name]));

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        SRO-Pakete werden geladen...
      </div>
    );
  }

  return (
    <div>
      <SectionLabel text="SRO-Verwaltung" />
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 2px" }}>
        SRO Compliance-Pakete
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        SRO-spezifische Checklisten und Dokumentvorlagen verwalten und Organisationen zuweisen.
      </p>

      {/* Packages grouped by SRO */}
      {sroGroups.size === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine SRO-Pakete gefunden.</div>
        </div>
      ) : (
        [...sroGroups.entries()].map(([sro, pkgs]) => {
          const sroColor = SRO_COLORS[sro] ?? { bg: T.s2, color: T.ink3 };
          return (
            <div key={sro} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: sroColor.color, background: sroColor.bg,
                  padding: "3px 10px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  {sro}
                </span>
                <span style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans }}>{pkgs.length} Paket(e)</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pkgs.map((pkg) => {
                  const assignedOrgs = assignments.filter((a) => a.package_id === pkg.id);
                  return (
                    <div key={pkg.id} style={{
                      background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`,
                      boxShadow: T.shSm, padding: "18px 22px",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px" }}>{pkg.name}</h3>
                          {pkg.description && (
                            <p style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 10px", lineHeight: 1.4 }}>{pkg.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                          <Icon d={icons.check} size={12} color={T.ink4} />
                          {pkg.checklist_count} Checklist-Punkte
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                          <Icon d={icons.doc} size={12} color={T.ink4} />
                          {pkg.template_count} Vorlagen
                        </div>
                        {pkg.review_cycle_months && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                            <Icon d={icons.clock} size={12} color={T.ink4} />
                            {pkg.review_cycle_months}-Monats-Zyklus
                          </div>
                        )}
                      </div>

                      {/* Assigned orgs */}
                      {assignedOrgs.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {assignedOrgs.map((a) => (
                            <span key={a.id} style={{
                              fontSize: 10, fontWeight: 600, color: T.accent, background: T.accentS,
                              padding: "2px 8px", borderRadius: 6, fontFamily: T.sans,
                            }}>
                              {orgMap.get(a.organization_id) ?? "Unbekannt"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Assign section */}
      <div style={{ marginTop: 32, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shSm, padding: "24px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 14px" }}>
          Paket zuweisen
        </h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Organisation</label>
            <select value={assignOrgId} onChange={(e) => setAssignOrgId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box" }}>
              <option value="">Wählen...</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.ink2, fontFamily: T.sans, marginBottom: 4, display: "block" }}>Paket</label>
            <select value={assignPkgId} onChange={(e) => setAssignPkgId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, color: T.ink, background: "#fff", boxSizing: "border-box" }}>
              <option value="">Wählen...</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.sro} — {p.name}</option>)}
            </select>
          </div>
          <button onClick={handleAssign} disabled={!assignOrgId || !assignPkgId || assigning}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: assignOrgId && assignPkgId ? T.accent : T.s2,
              color: assignOrgId && assignPkgId ? "#fff" : T.ink4,
              fontSize: 13, fontWeight: 700, cursor: assignOrgId && assignPkgId && !assigning ? "pointer" : "default",
              fontFamily: T.sans, opacity: assigning ? 0.6 : 1, whiteSpace: "nowrap",
            }}>
            {assigning ? "Wird zugewiesen..." : "Zuweisen"}
          </button>
        </div>
      </div>
    </div>
  );
}
