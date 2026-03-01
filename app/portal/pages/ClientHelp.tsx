import { useState, useEffect, useCallback } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import type { ClientOrg } from "../lib/api";
import { coName, coInitials, coEmail, coPhone, coRole } from "../lib/contactHelper";
import {
  loadHelpRequests, createHelpRequest, loadCustomers,
  type HelpRequest, type Customer,
} from "../lib/customerApi";
import { HELP_STATUS } from "../data/statusConfig";

interface Props {
  org: ClientOrg | null;
}

export function ClientHelp({ org }: Props) {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<HelpRequest | null>(null);

  // Form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [reqs, custs] = await Promise.all([
        loadHelpRequests(org.id),
        loadCustomers(org.id),
      ]);
      setRequests(reqs);
      setCustomers(custs);
    } catch (err) {
      console.error("Load help requests:", err);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  if (!org) {
    return <div style={{ padding: "40px 48px", color: T.ink3, fontFamily: T.sans }}>Wird geladen...</div>;
  }

  const handleSubmit = async () => {
    setFormError(null);
    if (!subject.trim() || !message.trim()) { setFormError("Betreff und Nachricht sind Pflichtfelder."); return; }
    setSaving(true);
    try {
      await createHelpRequest({
        organization_id: org.id,
        subject: subject.trim(),
        message: message.trim(),
        customer_id: customerId || undefined,
      });
      setSubject("");
      setMessage("");
      setCustomerId("");
      setFormError(null);
      setShowForm(false);
      load();
    } catch (err) {
      console.error("Create help request:", err);
      setFormError("Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>Wird geladen...</div>;
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960, fontFamily: T.sans }}>
      <SectionLabel text="Kundenportal" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Hilfe & Support</h1>
          <p style={{ fontSize: 15, color: T.ink3, margin: 0 }}>
            Fragen zu Compliance-Themen? Wir helfen Ihnen gerne.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
            background: T.accent, color: "#fff", border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
          }}
        >
          <Icon d={icons.plus} size={15} color="#fff" />
          Neue Anfrage
        </button>
      </div>

      {/* Compliance Officer contact card */}
      <div style={{
        background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`,
        padding: "20px 24px", marginBottom: 28, display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", background: T.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: T.sans, flexShrink: 0,
        }}>
          {coInitials(org)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{coName(org)}</div>
          <div style={{ fontSize: 13, color: T.ink3 }}>{coRole(org)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={"mailto:" + coEmail(org)} style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
            background: "#fff", fontSize: 12, fontWeight: 500, color: T.ink2,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
          }}>
            <Icon d={icons.mail} size={13} color={T.ink3} /> E-Mail
          </a>
          {coPhone(org) && (
            <a href={"tel:" + coPhone(org)} style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: "#fff", fontSize: 12, fontWeight: 500, color: T.ink2,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
            }}>
              <Icon d={icons.phone} size={13} color={T.ink3} /> Anrufen
            </a>
          )}
        </div>
      </div>

      {/* Requests list */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: "0 0 16px" }}>Bisherige Anfragen</h2>
      {requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.ink3, fontSize: 14, background: T.s1, borderRadius: 10 }}>
          Noch keine Anfragen gestellt.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((r) => {
            const st = HELP_STATUS[r.status] ?? HELP_STATUS.open;
            return (
              <div
                key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                style={{
                  background: "#fff", borderRadius: T.r, border: `1px solid ${T.border}`,
                  padding: "16px 20px", cursor: "pointer", transition: "box-shadow 0.15s",
                }}
                onMouseOver={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd)}
                onMouseOut={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{r.subject}</div>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: st.bg, color: st.color, fontFamily: T.sans,
                  }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.ink4 }}>
                  {r.requested_by_name} &middot; {r.created_at}
                </div>

                {/* Expanded detail */}
                {selected?.id === r.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderL}` }}>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, marginBottom: r.admin_response ? 12 : 0 }}>
                      {r.message}
                    </div>
                    {r.admin_response && (
                      <div style={{ background: T.accentS, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 4 }}>Antwort von Virtue Compliance</div>
                        <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{r.admin_response}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New request form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowForm(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 500, boxShadow: T.shLg }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>Neue Hilfe-Anfrage</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <Icon d="M6 18L18 6M6 6l12 12" size={20} color={T.ink3} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Betreff *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="z.B. Frage zur Risikoklassifizierung"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Nachricht *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Beschreiben Sie Ihr Anliegen..."
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              {customers.length > 0 && (
                <div>
                  <label style={labelStyle}>Betroffener Kunde (optional)</label>
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">— Keinen Kunden verknüpfen —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_type === "natural_person"
                          ? [c.first_name, c.last_name].filter(Boolean).join(" ")
                          : c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {formError && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: T.redS, color: T.red, fontSize: 13, fontWeight: 500 }}>
                {formError}
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={btnSec}>Abbrechen</button>
              <button onClick={handleSubmit} disabled={saving} style={{ ...btnPri, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Wird gesendet..." : "Anfrage senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: T.sans, outline: "none", boxSizing: "border-box",
};

const btnPri: React.CSSProperties = {
  padding: "10px 20px", background: T.accent, color: "#fff", border: "none",
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
};

const btnSec: React.CSSProperties = {
  padding: "10px 20px", background: "#fff", color: T.ink2, border: `1px solid ${T.border}`,
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.sans,
};
