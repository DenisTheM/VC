import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { screeningStatusInfo, datasetName, type ScreeningResult } from "@shared/lib/sanctionsScreening";
import { type Organization } from "../lib/api";

export function ScreeningPage({ organizations }: { organizations: Organization[] }) {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ScreeningResult | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  useEffect(() => {
    if (selectedOrg) loadResults(selectedOrg);
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
          onChange={(e) => setSelectedOrg(e.target.value)}
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
                    background: "#fff",
                    borderRadius: T.r,
                    border: `1px solid #fed7aa`,
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
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

          {selectedResult.matches.map((match, idx) => (
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
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, resize: "vertical" }}
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
    </div>
  );
}
