import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { DOC_STATUS, FORMAT_COLORS } from "../data/clientData";
import { loadClientDocuments, type ClientOrg, type PortalDoc } from "../lib/api";

interface ClientDocsProps {
  org: ClientOrg | null;
}

export function ClientDocs({ org }: ClientDocsProps) {
  const [docs, setDocs] = useState<PortalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const orgShort = org?.short_name || org?.name || "Ihr Unternehmen";

  useEffect(() => {
    if (!org) return;
    loadClientDocuments(org.id)
      .then(setDocs)
      .catch((err) => console.error("Failed to load client docs:", err))
      .finally(() => setLoading(false));
  }, [org]);

  /* -- Derived data ------------------------------------------------ */
  const categories = [...new Set(docs.map((d) => d.category))];
  const filtered = docs.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || d.category === activeCategory;
    return matchSearch && matchCat;
  });

  const grouped = categories
    .map((cat) => ({
      category: cat,
      docs: filtered.filter((d) => d.category === cat),
    }))
    .filter((g) => g.docs.length > 0);

  const totalDocs = docs.length;
  const currentCount = docs.filter((d) => d.status === "current").length;
  const reviewCount = docs.filter((d) => d.status === "review" || d.status === "draft").length;
  const alertCount = docs.filter((d) => d.alert).length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Dokumente werden geladen...
      </div>
    );
  }

  /* -- Render ------------------------------------------------------ */
  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Dokumentation" />

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: T.ink,
          fontFamily: T.sans,
          margin: "0 0 4px",
          letterSpacing: "-0.4px",
        }}
      >
        Ihre Dokumente
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Alle Compliance-Dokumente für {orgShort}, erstellt und gepflegt von Elena Hartmann.
      </p>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div
          style={{
            background: T.s1,
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: `1px solid ${T.border}`,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>{totalDocs}</span>
          <span style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, fontWeight: 500 }}>Dokumente</span>
        </div>
        <div
          style={{
            background: T.accentS,
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: T.accent, fontFamily: T.sans }}>{currentCount}</span>
          <span style={{ fontSize: 12, color: T.accent, fontFamily: T.sans, fontWeight: 500 }}>Aktuell</span>
        </div>
        <div
          style={{
            background: "#fffbeb",
            borderRadius: T.r,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#d97706", fontFamily: T.sans }}>{reviewCount}</span>
          <span style={{ fontSize: 12, color: "#d97706", fontFamily: T.sans, fontWeight: 500 }}>Review nötig</span>
        </div>
        {alertCount > 0 && (
          <div
            style={{
              background: "#fef2f2",
              borderRadius: T.r,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", fontFamily: T.sans }}>{alertCount}</span>
            <span style={{ fontSize: 12, color: "#dc2626", fontFamily: T.sans, fontWeight: 500 }}>Mit Hinweisen</span>
          </div>
        )}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            borderRadius: T.r,
            border: `1px solid ${T.border}`,
            padding: "10px 14px",
          }}
        >
          <Icon d={icons.search} size={16} color={T.ink4} />
          <input
            type="text"
            placeholder="Dokument suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: 13.5,
              fontFamily: T.sans,
              color: T.ink,
              background: "transparent",
              width: "100%",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              background: !activeCategory ? T.primaryDeep : "#fff",
              color: !activeCategory ? "#fff" : T.ink3,
              border: `1px solid ${!activeCategory ? T.primaryDeep : T.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.sans,
              cursor: "pointer",
            }}
          >
            Alle
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              style={{
                background: activeCategory === cat ? T.primaryDeep : "#fff",
                color: activeCategory === cat ? "#fff" : T.ink3,
                border: `1px solid ${activeCategory === cat ? T.primaryDeep : T.border}`,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: T.sans,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped document list */}
      {grouped.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
          Keine Dokumente gefunden.
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.category} style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.ink3,
                fontFamily: T.sans,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon d={icons.folder} size={16} color={T.ink4} />
              {group.category}
              <span style={{ fontSize: 11, fontWeight: 500, color: T.ink4 }}>({group.docs.length})</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.docs.map((doc) => {
                const st = DOC_STATUS[doc.status] ?? DOC_STATUS.draft;
                const fmt = FORMAT_COLORS[doc.format] ?? FORMAT_COLORS.DOCX;
                const isExpanded = expanded === doc.id;

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: "#fff",
                      borderRadius: T.r,
                      border: `1px solid ${T.border}`,
                      boxShadow: T.shSm,
                      overflow: "hidden",
                    }}
                  >
                    {/* Row header */}
                    <div
                      onClick={() => setExpanded(isExpanded ? null : doc.id)}
                      style={{
                        padding: "14px 18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        transition: "background 0.1s",
                      }}
                      onMouseOver={(e) => ((e.currentTarget as HTMLDivElement).style.background = T.s1)}
                      onMouseOut={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                    >
                      {/* Format badge */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: fmt.color,
                          background: fmt.bg,
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontFamily: T.sans,
                          flexShrink: 0,
                        }}
                      >
                        {doc.format}
                      </span>

                      {/* Name + version */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                            {doc.name}
                          </span>
                          <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>{doc.version}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: st.color,
                          background: st.bg,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontFamily: T.sans,
                          flexShrink: 0,
                        }}
                      >
                        {st.label}
                      </span>

                      {/* Alert indicator */}
                      {doc.alert && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#f59e0b",
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {/* Expand arrow */}
                      <Icon
                        d={isExpanded ? "M19 15l-7-7-7 7" : "M9 5l7 7-7 7"}
                        size={14}
                        color={T.ink4}
                      />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "0 18px 18px",
                          borderTop: `1px solid ${T.borderL}`,
                        }}
                      >
                        <div style={{ paddingTop: 16 }}>
                          <p style={{ fontSize: 13, color: T.ink2, fontFamily: T.sans, lineHeight: 1.6, margin: "0 0 14px" }}>
                            {doc.desc}
                          </p>

                          {/* Doc meta grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                            <div style={{ background: T.s1, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                Zuletzt aktualisiert
                              </div>
                              <div style={{ fontSize: 12.5, color: T.ink2, fontFamily: T.sans }}>
                                {doc.updatedAt}
                              </div>
                              <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                                von {doc.updatedBy}
                              </div>
                            </div>
                            <div style={{ background: T.s1, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                Rechtsgrundlage
                              </div>
                              <div style={{ fontSize: 12.5, color: T.ink2, fontFamily: T.sans }}>
                                {doc.legalBasis}
                              </div>
                            </div>
                            <div style={{ background: T.s1, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                Umfang
                              </div>
                              <div style={{ fontSize: 12.5, color: T.ink2, fontFamily: T.sans }}>
                                {doc.pages} Seiten ({doc.format})
                              </div>
                            </div>
                          </div>

                          {/* Alert notice */}
                          {doc.alert && (
                            <div
                              style={{
                                background: "#fffbeb",
                                borderRadius: 8,
                                padding: "10px 14px",
                                marginBottom: 14,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                border: "1px solid #f59e0b22",
                              }}
                            >
                              <Icon d={icons.alert} size={14} color="#d97706" />
                              <span style={{ fontSize: 12.5, color: "#92400e", fontFamily: T.sans, fontWeight: 500 }}>
                                {doc.alert}
                              </span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{
                                background: T.primaryDeep,
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "9px 16px",
                                fontSize: 12.5,
                                fontWeight: 600,
                                fontFamily: T.sans,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Icon d={icons.download} size={14} color="#fff" />
                              Download
                            </button>
                            {doc.status === "review" && (
                              <button
                                style={{
                                  background: T.accentS,
                                  color: T.accent,
                                  border: `1px solid ${T.accent}33`,
                                  borderRadius: 8,
                                  padding: "9px 16px",
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  fontFamily: T.sans,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Icon d={icons.check} size={14} color={T.accent} />
                                Freigeben
                              </button>
                            )}
                            <button
                              style={{
                                background: "#fff",
                                color: T.ink3,
                                border: `1px solid ${T.border}`,
                                borderRadius: 8,
                                padding: "9px 16px",
                                fontSize: 12.5,
                                fontWeight: 600,
                                fontFamily: T.sans,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Icon d={icons.mail} size={14} color={T.ink4} />
                              Elena kontaktieren
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Elena info bar */}
      <div
        style={{
          background: T.accentS,
          borderRadius: T.r,
          padding: "16px 20px",
          border: `1px solid ${T.accent}22`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            fontFamily: T.sans,
            flexShrink: 0,
          }}
        >
          EH
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
            Dokumente werden von Elena Hartmann gepflegt
          </div>
          <div style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans }}>
            Alle Dokumente werden regelmässig auf regulatorische Änderungen geprüft und bei Bedarf aktualisiert.
          </div>
        </div>
        <button
          style={{
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: T.sans,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <Icon d={icons.mail} size={14} color="#fff" />
          Elena kontaktieren
        </button>
      </div>
    </div>
  );
}
