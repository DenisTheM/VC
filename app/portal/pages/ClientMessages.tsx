import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { loadClientMessages, markMessageAsRead, type ClientOrg, type ClientMessage } from "../lib/api";

interface ClientMessagesProps {
  org: ClientOrg | null;
}

export function ClientMessages({ org }: ClientMessagesProps) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadClientMessages(org.id)
      .then(setMessages)
      .catch((err) => console.error("Failed to load messages:", err))
      .finally(() => setLoading(false));
  }, [org?.id]);

  const handleExpand = async (msg: ClientMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);

    if (!msg.is_read) {
      try {
        await markMessageAsRead(msg.id);
        setMessages((prev) =>
          prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m),
        );
      } catch {
        // Non-critical
      }
    }
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Nachrichten werden geladen...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Kommunikation" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        Nachrichten
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 24px" }}>
        Ihre Nachrichten von Virtue Compliance.
        {unreadCount > 0 && (
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: T.accent, background: T.accentS, padding: "2px 8px", borderRadius: 10 }}>
            {unreadCount} ungelesen
          </span>
        )}
      </p>

      {messages.length === 0 ? (
        <div
          style={{
            padding: 48, textAlign: "center", background: "#fff",
            borderRadius: T.rLg, border: `1px solid ${T.border}`,
          }}
        >
          <Icon d={icons.mail} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, color: T.ink3, fontFamily: T.sans, marginTop: 12 }}>
            Keine Nachrichten vorhanden.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const date = new Date(msg.created_at).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" });
            const time = new Date(msg.created_at).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={msg.id}
                style={{
                  background: "#fff",
                  borderRadius: T.r,
                  border: `1px solid ${msg.is_read ? T.border : T.accent + "44"}`,
                  borderLeft: `3px solid ${msg.is_read ? T.border : T.accent}`,
                  boxShadow: T.shSm,
                  overflow: "hidden",
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => handleExpand(msg)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 18px", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.s1; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Unread indicator */}
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: msg.is_read ? "transparent" : T.accent,
                      flexShrink: 0,
                    }}
                  />

                  {/* Subject */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: msg.is_read ? 500 : 700, color: T.ink,
                      fontFamily: T.sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {msg.subject}
                    </div>
                    {!isExpanded && (
                      <div style={{
                        fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {msg.body.length > 100 ? msg.body.substring(0, 100) + "..." : msg.body}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, flexShrink: 0 }}>
                    {date}, {time}
                  </span>

                  {/* Expand icon */}
                  <Icon
                    d={isExpanded ? "M19 15l-7-7-7 7" : "M5 9l7 7 7-7"}
                    size={14}
                    color={T.ink4}
                  />
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div style={{ padding: "0 18px 18px 38px", borderTop: `1px solid ${T.borderL}` }}>
                    <div
                      style={{
                        fontSize: 14, color: T.ink2, fontFamily: T.sans,
                        lineHeight: 1.7, paddingTop: 16,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.body}
                    </div>
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
