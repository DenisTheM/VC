import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { signIn, getRedirectPath, getProfile } from "@shared/lib/auth";
import { supabase } from "@shared/lib/supabase";

type Mode = "login" | "set-password";

export function LoginApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Password-set mode (for invited users)
  const [mode, setMode] = useState<Mode>("login");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  // Check if already logged in OR handle recovery token from URL hash
  useEffect(() => {
    const hash = window.location.hash;

    // Parse recovery token from URL hash (e.g. #access_token=...&type=recovery)
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (type === "recovery" && accessToken) {
        // Set session from recovery token
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          })
          .then(({ error: sessErr }) => {
            if (sessErr) {
              console.error("Recovery session error:", sessErr);
              setError(
                "Der Einladungslink ist ungültig oder abgelaufen. Bitte kontaktieren Sie den Administrator.",
              );
              setCheckingSession(false);
              return;
            }
            // Clean the hash from URL
            window.history.replaceState(null, "", window.location.pathname);
            setMode("set-password");
            setCheckingSession(false);
          });
        return;
      }
    }

    // Normal session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user);
        if (profile) {
          window.location.href = getRedirectPath(profile.role);
          return;
        }
      }
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authError } = await signIn(email, password);

    if (authError) {
      setError("Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.");
      setLoading(false);
      return;
    }

    if (data.user) {
      const profile = await getProfile(data.user);
      if (profile) {
        window.location.href = getRedirectPath(profile.role);
      } else {
        // Debug: show user ID so we can troubleshoot
        setError(`Kein Profil gefunden für User ${data.user.id} (${data.user.email}). Bitte kontaktieren Sie den Administrator.`);
        setLoading(false);
      }
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setSettingPassword(true);

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      console.error("updateUser error:", updateErr);
      setError("Passwort konnte nicht gesetzt werden. Bitte versuchen Sie es erneut.");
      setSettingPassword(false);
      return;
    }

    // Password set — now get profile and redirect
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await getProfile(session.user);
      if (profile) {
        window.location.href = getRedirectPath(profile.role);
        return;
      }
    }

    // Fallback: redirect to portal
    window.location.href = "/app/portal";
  };

  if (checkingSession) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: T.sans,
          color: T.ink3,
          background: T.s1,
        }}
      >
        Laden...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: T.sans,
        background: T.s1,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 40,
          background: T.s0,
          borderRadius: T.rLg,
          border: `1px solid ${T.borderL}`,
          boxShadow: T.shMd,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon d={icons.shield} size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, letterSpacing: "-0.2px" }}>
              Virtue <span style={{ color: T.ink3, fontWeight: 400 }}>Compliance</span>
            </div>
          </div>
        </div>

        {mode === "set-password" ? (
          /* ── Set Password Form (for invited users) ──────────────── */
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 24,
                fontWeight: 700,
                color: T.ink,
                margin: "0 0 6px",
              }}
            >
              Willkommen
            </h1>
            <p style={{ fontSize: 14, color: T.ink3, margin: "0 0 28px" }}>
              Bitte setzen Sie Ihr Passwort für den Portal-Zugang.
            </p>

            <form onSubmit={handleSetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5 }}>
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mindestens 8 Zeichen"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: T.r,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: T.sans,
                    color: T.ink,
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5 }}>
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Passwort wiederholen"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: T.r,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: T.sans,
                    color: T.ink,
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: T.r,
                    background: T.redS,
                    color: T.red,
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 16,
                    fontFamily: T.sans,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={settingPassword}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  cursor: settingPassword ? "not-allowed" : "pointer",
                  background: T.primary,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  opacity: settingPassword ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {settingPassword ? "Wird gespeichert..." : "Passwort setzen & weiter"}
              </button>
            </form>
          </>
        ) : (
          /* ── Normal Login Form ──────────────────────────────────── */
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 24,
                fontWeight: 700,
                color: T.ink,
                margin: "0 0 6px",
              }}
            >
              Anmelden
            </h1>
            <p style={{ fontSize: 14, color: T.ink3, margin: "0 0 28px" }}>
              Melden Sie sich bei Ihrem Compliance-Portal an.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5 }}>
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@firma.ch"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: T.r,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: T.sans,
                    color: T.ink,
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: T.ink, display: "block", marginBottom: 5 }}>
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Ihr Passwort"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: T.r,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: T.sans,
                    color: T.ink,
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: T.r,
                    background: T.redS,
                    color: T.red,
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 16,
                    fontFamily: T.sans,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: T.primary,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Wird angemeldet..." : "Anmelden"}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/" style={{ fontSize: 13, color: T.accent, fontWeight: 500, textDecoration: "none" }}>
            &larr; Zurück zur Website
          </a>
        </div>
      </div>
    </div>
  );
}
