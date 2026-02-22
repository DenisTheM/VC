import { T } from "../styles/tokens";
import { Icon } from "./Icon";

interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  badge?: number;
  dot?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  active: string;
  onNav: (id: string) => void;
  title: string;
  subtitle: string;
  /** Footer content rendered at the bottom of the sidebar */
  footer?: React.ReactNode;
}

export function Sidebar({ items, active, onNav, title, subtitle, footer }: SidebarProps) {
  return (
    <div style={{ width: 248, minHeight: "100vh", background: T.primaryDeep, display: "flex", flexDirection: "column" }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", fontFamily: T.sans, letterSpacing: "-0.2px" }}>
              {title} <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>Compliance</span>
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: T.sans }}>{subtitle}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "1px",
            textTransform: "uppercase",
            padding: "6px 10px 12px",
            fontFamily: T.sans,
          }}
        >
          Navigation
        </div>
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onNav(it.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                marginBottom: 2,
                fontFamily: T.sans,
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <Icon d={it.icon} size={18} color={isActive ? T.glow : "rgba(255,255,255,0.35)"} />
              {it.label}
              {it.badge != null && it.badge > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: T.accent,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 10,
                    fontFamily: T.sans,
                  }}
                >
                  {it.badge}
                </span>
              )}
              {it.dot && <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: T.amber }} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>{footer}</div>
      )}
    </div>
  );
}
