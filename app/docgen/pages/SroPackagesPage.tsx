import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type Organization } from "../lib/api";

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  required: boolean;
}

interface SroPackage {
  id: string;
  sro: string;
  name: string;
  description: string | null;
  review_cycle_months: number | null;
  checklist: ChecklistItem[];
  document_templates: string[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profileSroMap, setProfileSroMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("sro_compliance_packages")
        .select("id, sro, name, description, review_cycle_months, checklist, document_templates")
        .order("sro");

      if (fetchErr) throw fetchErr;
      setPackages((data ?? []) as SroPackage[]);

      // Load company_profiles to get SRO fallback for each org
      if (organizations.length > 0) {
        const { data: profileData } = await supabase
          .from("company_profiles")
          .select("organization_id, data")
          .in("organization_id", organizations.map(o => o.id));

        const sroMap = new Map<string, string>();
        if (profileData) {
          for (const p of profileData) {
            const sro = (p.data as Record<string, unknown>)?.sro as string | undefined;
            if (sro) sroMap.set(p.organization_id, sro);
          }
        }
        setProfileSroMap(sroMap);
      }
    } catch (err) {
      console.error("SRO packages load error:", err);
      setError("Pakete konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  // Build org -> SRO mapping with fallback to company_profiles.data.sro
  const orgsBySro = new Map<string, Organization[]>();
  organizations.forEach((o) => {
    const sro = o.sro || profileSroMap.get(o.id);
    if (sro) {
      const list = orgsBySro.get(sro) ?? [];
      list.push(o);
      orgsBySro.set(sro, list);
    }
  });

  // Group packages by SRO
  const sroGroups = new Map<string, SroPackage[]>();
  packages.forEach((p) => {
    const group = sroGroups.get(p.sro) ?? [];
    group.push(p);
    sroGroups.set(p.sro, group);
  });

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
        SRO-spezifische Checklisten und Dokumentvorlagen verwalten.
      </p>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #dc262622", color: "#dc2626", fontSize: 13, fontFamily: T.sans, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Packages grouped by SRO */}
      {sroGroups.size === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine SRO-Pakete gefunden.</div>
        </div>
      ) : (
        [...sroGroups.entries()].map(([sro, pkgs]) => {
          const sroColor = SRO_COLORS[sro] ?? { bg: T.s2, color: T.ink3 };
          const assignedOrgs = orgsBySro.get(sro) ?? [];
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
                  const checklistCount = (pkg.checklist ?? []).length;
                  const templateCount = (pkg.document_templates ?? []).length;
                  const isExpanded = expandedId === pkg.id;
                  return (
                    <div key={pkg.id} style={{
                      background: "#fff", borderRadius: T.r, border: `1px solid ${isExpanded ? T.accent + "44" : T.border}`,
                      boxShadow: T.shSm, padding: "18px 22px",
                    }}>
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : pkg.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px" }}>{pkg.name}</h3>
                            {pkg.description && (
                              <p style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 10px", lineHeight: 1.4 }}>{pkg.description}</p>
                            )}
                          </div>
                          <div style={{
                            width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                            flexShrink: 0, marginTop: 2,
                          }}>
                            <Icon d={icons.chevronDown} size={14} color={T.ink4} />
                          </div>
                        </div>

                        {/* Meta */}
                        <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                            <Icon d={icons.check} size={12} color={T.ink4} />
                            {checklistCount} Checklist-Punkte
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                            <Icon d={icons.doc} size={12} color={T.ink4} />
                            {templateCount} Vorlagen
                          </div>
                          {pkg.review_cycle_months && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                              <Icon d={icons.clock} size={12} color={T.ink4} />
                              {pkg.review_cycle_months}-Monats-Zyklus
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assigned orgs (matched by SRO) */}
                      {assignedOrgs.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: isExpanded ? 12 : 0 }}>
                          {assignedOrgs.map((o) => (
                            <span key={o.id} style={{
                              fontSize: 10, fontWeight: 600, color: T.accent, background: T.accentS,
                              padding: "2px 8px", borderRadius: 6, fontFamily: T.sans,
                            }}>
                              {o.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Checklist: collapsed preview or expanded full view */}
                      {checklistCount > 0 && !isExpanded && (
                        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: T.s1, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: T.ink3, fontFamily: T.sans, marginBottom: 6, textTransform: "uppercase" }}>Checkliste</div>
                          {(pkg.checklist ?? []).slice(0, 5).map((item) => (
                            <div key={item.id} style={{ fontSize: 12, color: T.ink2, fontFamily: T.sans, padding: "2px 0", display: "flex", gap: 6 }}>
                              <span style={{ color: item.required ? T.red : T.ink4 }}>{item.required ? "*" : "-"}</span>
                              {item.text}
                            </div>
                          ))}
                          {checklistCount > 5 && (
                            <div style={{ fontSize: 11, color: T.accent, fontFamily: T.sans, marginTop: 4, fontWeight: 500 }}>
                              + {checklistCount - 5} weitere Punkte — klicken zum Aufklappen
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expanded: full checklist grouped by category */}
                      {checklistCount > 0 && isExpanded && (
                        <div style={{ marginTop: 12 }}>
                          {CATEGORIES.map((category) => {
                            const catItems = (pkg.checklist ?? []).filter(item => item.category === category);
                            if (catItems.length === 0) return null;
                            const catColors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Dokumente;
                            const catIcon = CATEGORY_ICONS[category] ?? icons.doc;
                            return (
                              <div key={category} style={{ marginBottom: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: 6, background: catColors.bg,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    <Icon d={catIcon} size={11} color={catColors.color} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{category}</span>
                                  <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans }}>({catItems.length})</span>
                                </div>
                                <div style={{ padding: "6px 14px", borderRadius: 8, background: T.s1, border: `1px solid ${T.border}` }}>
                                  {catItems.map((item) => (
                                    <div key={item.id} style={{ fontSize: 12, color: T.ink2, fontFamily: T.sans, padding: "3px 0", display: "flex", gap: 6 }}>
                                      <span style={{ color: item.required ? T.red : T.ink4, fontWeight: item.required ? 700 : 400 }}>
                                        {item.required ? "*" : "-"}
                                      </span>
                                      <span style={{ fontWeight: item.required ? 500 : 400 }}>{item.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {/* Uncategorized items */}
                          {(() => {
                            const uncategorized = (pkg.checklist ?? []).filter(item => !CATEGORIES.includes(item.category));
                            if (uncategorized.length === 0) return null;
                            return (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>Sonstiges</span>
                                  <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans }}>({uncategorized.length})</span>
                                </div>
                                <div style={{ padding: "6px 14px", borderRadius: 8, background: T.s1, border: `1px solid ${T.border}` }}>
                                  {uncategorized.map((item) => (
                                    <div key={item.id} style={{ fontSize: 12, color: T.ink2, fontFamily: T.sans, padding: "3px 0", display: "flex", gap: 6 }}>
                                      <span style={{ color: item.required ? T.red : T.ink4, fontWeight: item.required ? 700 : 400 }}>
                                        {item.required ? "*" : "-"}
                                      </span>
                                      <span style={{ fontWeight: item.required ? 500 : 400 }}>{item.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
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
    </div>
  );
}
