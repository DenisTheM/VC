import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { useAuthContext } from "@shared/components/AuthContext";
import { DOC_TYPES } from "../data/docTypes";
import { JURIS } from "../data/jurisdictions";

interface DashboardPageProps {
  onNav: (id: string) => void;
  onGenerateDoc: (docKey: string) => void;
  profile: Record<string, unknown>;
  profOk: boolean;
  stats: { documentCount: number; alertCount: number };
}

export function DashboardPage({ onNav, onGenerateDoc, profile, profOk, stats: dbStats }: DashboardPageProps) {
  const { profile: authProfile } = useAuthContext();
  const firstName = authProfile.full_name?.split(" ")[0] || "User";

  const stats = [
    { label: "Dokumente", value: dbStats.documentCount, icon: icons.doc, color: T.primary, nav: "documents" },
    { label: "Jurisdiktionen", value: 2, icon: icons.shield, color: T.accent, nav: "generate" },
    { label: "Reg. Alerts", value: dbStats.alertCount, icon: icons.alert, color: T.amber, nav: "alerts" },
  ];

  return (
    <div>
      <SectionLabel text="Übersicht" />
      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 28,
          fontWeight: 700,
          color: T.ink,
          margin: "0 0 2px",
        }}
      >
        Guten Tag, {firstName}
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Ihr Compliance-Cockpit auf einen Blick.
      </p>

      {/* Profile incomplete warning */}
      {!profOk && (
        <div
          onClick={() => onNav("profile")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: T.r,
            background: T.amberS,
            border: `1px solid ${T.amber}`,
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>&#9888;</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", fontFamily: T.sans }}>
              Firmenprofil unvollständig
            </div>
            <div style={{ fontSize: 12, color: "#b45309", fontFamily: T.sans }}>
              Bitte vervollständigen Sie Ihr Profil für optimale Dokumentengenerierung.
            </div>
          </div>
          <Icon d={icons.arrow} size={16} color="#b45309" />
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={() => onNav(s.nav)}
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "20px 22px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
              cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: T.ink3, fontFamily: T.sans }}>
                {s.label}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: s.color + "12",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon d={s.icon} size={16} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: Document types */}
        <div
          style={{
            background: "#fff",
            borderRadius: T.rLg,
            padding: "22px 24px",
            border: `1px solid ${T.border}`,
            boxShadow: T.shSm,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 4 }}>
            Dokumenttypen
          </div>
          <p style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 16px" }}>
            Wählen Sie einen Typ, um ein neues Dokument zu generieren.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(DOC_TYPES).map(([key, doc]) => (
              <button
                key={key}
                onClick={() => onGenerateDoc(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: T.r,
                  border: `1px solid ${T.border}`,
                  background: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.15s",
                  fontFamily: T.sans,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.s1;
                  e.currentTarget.style.borderColor = T.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = T.border;
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: T.accentS,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon d={doc.icon} size={16} color={T.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{doc.name}</div>
                  <div style={{ fontSize: 11.5, color: T.ink4 }}>{doc.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {doc.jurisdictions.map((j) => (
                    <span key={j} style={{ fontSize: 12 }}>{JURIS[j]?.flag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Schnellstart + explanation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Schnellstart */}
          <div
            style={{
              background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDeep})`,
              borderRadius: T.rLg,
              padding: "26px 26px",
              color: "#fff",
              boxShadow: T.shMd,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: T.sans, marginBottom: 6 }}>
              Neues Dokument generieren
            </div>
            <p style={{ fontSize: 13, opacity: 0.8, fontFamily: T.sans, margin: "0 0 18px", lineHeight: 1.5 }}>
              Wählen Sie einen Kunden und Dokumenttyp — der DocGen erstellt das massgeschneiderte Compliance-Dokument.
            </p>
            <button
              onClick={() => onNav("generate")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 8,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
              }}
            >
              <Icon d={icons.sparkle} size={16} color="#fff" />
              Schnellstart
            </button>
          </div>

          {/* 3-Level explanation */}
          <div
            style={{
              background: "#fff",
              borderRadius: T.rLg,
              padding: "22px 24px",
              border: `1px solid ${T.border}`,
              boxShadow: T.shSm,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 14 }}>
              So funktioniert der DocGen
            </div>
            {[
              {
                step: "1",
                title: "Kunde erfassen",
                desc: "Legen Sie einen neuen Kunden an — Stammdaten werden automatisch aus dem Handelsregister übernommen.",
                color: T.primary,
                nav: "organizations",
              },
              {
                step: "2",
                title: "Dokumenttyp & Angaben wählen",
                desc: "Wählen Sie den Dokumenttyp und beantworten Sie wenige spezifische Fragen zu Jurisdiktion und Kontext.",
                color: T.accent,
                nav: "generate",
              },
              {
                step: "3",
                title: "Dokument generieren & prüfen",
                desc: "Der DocGen erstellt das Compliance-Dokument mit korrekten Rechtsverweisen — bereit zum Download und zur Prüfung.",
                color: T.amber,
                nav: "documents",
              },
            ].map((item) => (
              <div
                key={item.step}
                onClick={() => onNav(item.nav)}
                style={{ display: "flex", gap: 14, marginBottom: 16, cursor: "pointer", borderRadius: 8, padding: "6px 8px", margin: "0 -8px 10px", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.s1; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: item.color + "14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: item.color,
                    fontFamily: T.sans,
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 2 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <Icon d={icons.arrow} size={13} color={T.ink4} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
