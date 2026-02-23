import { useState, useEffect, useRef } from "react";
import { T } from "../styles/tokens";
import { Icon, icons } from "./Icon";
import {
  loadUnreadCount,
  loadNotifications,
  markAsRead,
  markAllAsRead,
  type AppNotification,
} from "../lib/notifications";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  new_alert: { icon: icons.alert, color: "#d97706" },
  action_due: { icon: icons.clock, color: "#dc2626" },
  doc_approved: { icon: icons.check, color: T.accent },
  doc_updated: { icon: icons.doc, color: "#2563eb" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

export function NotificationBell({ onNavigate }: { onNavigate?: (link: string) => void }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load unread count on mount and poll every 60s
  useEffect(() => {
    loadUnreadCount().then(setUnreadCount).catch(console.error);
    const interval = setInterval(() => {
      loadUnreadCount().then(setUnreadCount).catch(console.error);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const data = await loadNotifications();
        setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markAsRead(notif.id).catch(console.error);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notif.link && onNavigate) {
      onNavigate(notif.link);
      setOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead().catch(console.error);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          background: open ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "7px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
        }}
      >
        <Icon d={icons.alert} size={16} color="rgba(255,255,255,0.6)" />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "#dc2626",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: T.sans,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid #0f2b1e",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxHeight: 420,
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: `1px solid ${T.borderL}`,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>
              Benachrichtigungen
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11.5,
                  color: T.accent,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  padding: 0,
                }}
              >
                Alle gelesen
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", maxHeight: 360 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.ink4, fontFamily: T.sans }}>
                Wird geladen...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.ink4, fontFamily: T.sans }}>
                Keine Benachrichtigungen.
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.new_alert;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "12px 16px",
                      cursor: n.link ? "pointer" : "default",
                      background: n.read ? "#fff" : "#f0fdf4",
                      borderBottom: `1px solid ${T.borderL}`,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (n.link) e.currentTarget.style.background = n.read ? T.s1 : "#e6f7ee"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "#fff" : "#f0fdf4"; }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: `${cfg.color}12`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <Icon d={cfg.icon} size={14} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: n.read ? 500 : 600, color: T.ink, fontFamily: T.sans }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: T.ink3,
                            fontFamily: T.sans,
                            marginTop: 1,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: T.ink4, fontFamily: T.sans, marginTop: 3 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read && (
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: T.accent,
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
