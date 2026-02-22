import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { signIn, getRedirectPath, getProfile } from "@shared/lib/auth";
import { supabase } from "@shared/lib/supabase";

export function LoginApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already logged in
  useEffect(() => {
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

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/" style={{ fontSize: 13, color: T.accent, fontWeight: 500, textDecoration: "none" }}>
            &larr; Zurück zur Website
          </a>
        </div>
      </div>
    </div>
  );
}
