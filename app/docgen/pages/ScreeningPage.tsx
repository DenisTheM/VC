import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { screeningStatusInfo, datasetName, type ScreeningResult, type ScreeningMatch } from "@shared/lib/sanctionsScreening";
import { type Organization } from "../lib/api";

interface SimpleCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  customer_type: string;
  date_of_birth: string | null;
  nationality: string | null;
}

function customerDisplayName(c: SimpleCustomer): string {
  return c.customer_type === "natural_person"
    ? [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unbekannt"
    : c.company_name || "Unbekannt";
}

export function ScreeningPage({ organizations }: { organizations: Organization[] }) {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ScreeningResult | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // New screening state
  const [customers, setCustomers] = useState<SimpleCustomer[]>([]);
  const [screeningCustomerId, setScreeningCustomerId] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualDob, setManualDob] = useState("");
  const [manualNationality, setManualNationality] = useState("");
  const [screeningMode, setScreeningMode] = useState<"customer" | "manual">("customer");
  const [screening, setScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<{ status: string; match_count: number; matches: ScreeningMatch[] } | null>(null);
  const [screeningError, setScreeningError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOrg) {
      loadResults(selectedOrg);
      loadCustomers(selectedOrg);
    }
  }, [selectedOrg]);

  async function loadResults(orgId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("screening_results")
      .select("*")
      .eq("organization_id", orgId)
      .order("screened_at", { ascending: false });

    if (!error && data) setResults(data as ScreeningResult[]);
    setLoading(false);
  }

  async function loadCustomers(orgId: string) {
    const { data } = await supabase
      .from("client_customers")
      .select("id, first_name, last_name, company_name, customer_type, date_of_birth, nationality")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("last_name");

    setCustomers((data ?? []) as SimpleCustomer[]);
  }

  async function handleStartScreening() {
    if (!selectedOrg) return;
    setScreening(true);
    setScreeningError(null);
    setScreeningResult(null);

    let name = "";
    let customerId: string | undefined;
    let dob: string | undefined;
    let nationality: string | undefined;

    if (screeningMode === "customer" && screeningCustomerId) {
      const cust = customers.find((c) => c.id === screeningCustomerId);
      if (!cust) { setScreeningError("Kunde nicht gefunden."); setScreening(false); return; }
      name = customerDisplayName(cust);
      customerId = cust.id;
      dob = cust.date_of_birth ?? undefined;
      nationality = cust.nationality ?? undefined;
    } else if (screeningMode === "manual" && manualName.trim()) {
      name = manualName.trim();
      dob = manualDob || undefined;
      nationality = manualNationality || undefined;
    } else {
      setScreeningError("Bitte Name oder Kunde angeben.");
      setScreening(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("sanctions-screening", {
        body: {
          name,
          organization_id: selectedOrg,
          customer_id: customerId,
          date_of_birth: dob,
          nationality,
          screening_type: "sanctions",
        },
      });

      if (error) throw error;
      setScreeningResult(data as { status: string; match_count: number; matches: ScreeningMatch[] });
      // Reload results list
      loadResults(selectedOrg);
    } catch (err) {
      console.error("Screening failed:", err);
      setScreeningError("Screening fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setScreening(false);
    }
  }

  async function handleReview(resultId: string, newStatus: "confirmed_match" | "false_positive") {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("screening_results")
      .update({
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes || null,
      })
      .eq("id", resultId);

    if (!error) {
      setSelectedResult(null);
      setReviewNotes("");
      if (selectedOrg) loadResults(selectedOrg);
    }
  }

  const pendingReview = results.filter((r) => r.status === "potential_match");
  const reviewed = results.filter((r) => r.status !== "potential_match");

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Screening" />
      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
        Sanctions & PEP Screening
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 32px" }}>
        SECO, EU, UN Sanktionslisten + PEP-Screening via OpenSanctions
      </p>

      {/* Org selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <select
          value={selectedOrg}
          onChange={(e) => { setSelectedOrg(e.target.value); setScreeningResult(null); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, minWidth: 220 }}
        >
          <option value="">Organisation wählen...</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {pendingReview.length > 0 && (
          <span style={{ padding: "4px 12px", borderRadius: 20, background: "#fff7ed", color: "#ea580c", fontSize: 12, fontWeight: 600, fontFamily: T.sans }}>
            {pendingReview.length} zur Überprüfung
          </span>
        )}
      </div>

      {/* New Screening Panel */}
      {selectedOrg && (
        <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: 24, marginBottom: 24, boxShadow: T.shSm }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon d={icons.search} size={18} color={T.accent} />
            Neues Screening
          </h2>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["customer", "manual"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setScreeningMode(mode)}
                style={{
                  padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: T.sans,
                  border: `1px solid ${screeningMode === mode ? T.accent : T.border}`,
                  background: screeningMode === mode ? T.accentS : "#fff",
                  color: screeningMode === mode ? T.accent : T.ink3,
                  cursor: "pointer",
                }}
              >
                {mode === "customer" ? "Kunde auswählen" : "Manuelle Eingabe"}
              </button>
            ))}
          </div>

          {screeningMode === "customer" ? (
            <div>
              <select
                value={screeningCustomerId}
                onChange={(e) => setScreeningCustomerId(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, boxSizing: "border-box" }}
              >
                <option value="">Kunde wählen...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{customerDisplayName(c)}{c.date_of_birth ? ` (${c.date_of_birth})` : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.ink3, fontFamily: T.sans, display: "block", marginBottom: 4 }}>Name *</label>
                <input
                  type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                  placeholder="Vor- und Nachname oder Firma..."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.ink3, fontFamily: T.sans, display: "block", marginBottom: 4 }}>Geburtsdatum</label>
                <input
                  type="date" value={manualDob} onChange={(e) => setManualDob(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.ink3, fontFamily: T.sans, display: "block", marginBottom: 4 }}>Nationalität</label>
                <input
                  type="text" value={manualNationality} onChange={(e) => setManualNationality(e.target.value)}
                  placeholder="z.B. CH"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={handleStartScreening}
              disabled={screening}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: screening ? "default" : "pointer", fontFamily: T.sans,
                opacity: screening ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Icon d={icons.shield} size={14} color="#fff" />
              {screening ? "Screening läuft..." : "Screening starten"}
            </button>

            {screeningError && (
              <span style={{ fontSize: 12, color: "#dc2626", fontFamily: T.sans }}>{screeningError}</span>
            )}
          </div>

          {/* Inline screening result */}
          {screeningResult && (
            <div style={{
              marginTop: 16, padding: "14px 18px", borderRadius: T.r,
              background: screeningResult.status === "clear" ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${screeningResult.status === "clear" ? "#16a34a22" : "#ea580c22"}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: screeningResult.status === "clear" ? "#16a34a" : "#ea580c", fontFamily: T.sans, marginBottom: 4 }}>
                {screeningResult.status === "clear"
                  ? "Keine Treffer gefunden"
                  : `${screeningResult.match_count} mögliche Treffer gefunden`}
              </div>
              {screeningResult.matches.length > 0 && (
                <div style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans }}>
                  Die Treffer sind unten in der Überprüfungsliste sichtbar.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && <div style={{ padding: 32, color: T.ink3, fontFamily: T.sans }}>Laden...</div>}

      {/* Pending review */}
      {pendingReview.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#ea580c", fontFamily: T.sans, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon d={icons.alert} size={18} color="#ea580c" />
            Zur Überprüfung ({pendingReview.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingReview.map((r) => {
              const info = screeningStatusInfo(r.status);
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedResult(r)}
                  style={{
                    background: "#fff", borderRadius: T.r, border: `1px solid #fed7aa`,
                    padding: "16px 20px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseOver={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd)}
                  onMouseOut={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>{r.query_name}</div>
                    <div style={{ fontSize: 12, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                      {r.matches.length} Treffer &middot; {new Date(r.screened_at).toLocaleDateString("de-CH")}
                    </div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 20, background: info.bg, color: info.color, fontSize: 11, fontWeight: 600, fontFamily: T.sans }}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match Detail Panel */}
      {selectedResult && (
        <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: 24, marginBottom: 24, boxShadow: T.shSm }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, margin: 0 }}>
              Treffer-Details: {selectedResult.query_name}
            </h3>
            <button onClick={() => setSelectedResult(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Icon d="M6 18L18 6M6 6l12 12" size={18} color={T.ink4} />
            </button>
          </div>

          {(selectedResult.matches as ScreeningMatch[]).map((match, idx) => (
            <div key={idx} style={{ background: T.s1, borderRadius: T.r, padding: "14px 18px", marginBottom: 10, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>{match.name}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: match.score >= 0.9 ? "#dc2626" : match.score >= 0.8 ? "#ea580c" : "#d97706", fontFamily: T.sans }}>
                  {Math.round(match.score * 100)}% Match
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {match.datasets.map((ds) => (
                  <span key={ds} style={{ padding: "2px 8px", borderRadius: 4, background: "#eff6ff", color: "#1e40af", fontSize: 10, fontWeight: 600, fontFamily: T.sans }}>
                    {datasetName(ds)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: T.ink3, fontFamily: T.sans, display: "block", marginBottom: 6 }}>
              Notizen zur Überprüfung
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Begründung für Entscheidung..."
              rows={3}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => handleReview(selectedResult.id, "confirmed_match")}
              style={{ padding: "8px 20px", borderRadius: T.r, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: T.sans, cursor: "pointer" }}
            >
              Treffer bestätigen
            </button>
            <button
              onClick={() => handleReview(selectedResult.id, "false_positive")}
              style={{ padding: "8px 20px", borderRadius: T.r, border: `1px solid ${T.border}`, background: "#fff", color: T.ink, fontSize: 13, fontWeight: 500, fontFamily: T.sans, cursor: "pointer" }}
            >
              Fehlalarm markieren
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {reviewed.length > 0 && (
        <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: 24, boxShadow: T.shSm }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, margin: "0 0 16px" }}>
            Screening-Verlauf
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reviewed.map((r) => {
              const info = screeningStatusInfo(r.status);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: T.r, background: T.s1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: info.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.ink, fontFamily: T.sans }}>{r.query_name}</span>
                    <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, marginLeft: 8 }}>
                      {new Date(r.screened_at).toLocaleDateString("de-CH")}
                    </span>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 12, background: info.bg, color: info.color, fontSize: 10, fontWeight: 600, fontFamily: T.sans }}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && selectedOrg && results.length === 0 && !screeningResult && (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.shield} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Noch keine Screenings durchgeführt.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Verwenden Sie das Formular oben, um ein Screening zu starten.</div>
        </div>
      )}
    </div>
  );
}
