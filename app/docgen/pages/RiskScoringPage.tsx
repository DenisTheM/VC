import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { riskColor, riskBg, riskLabel } from "@shared/data/countryRiskData";
import { type Organization } from "../lib/api";

interface RiskProfile {
  id: string;
  sro: string;
  name: string;
  weights: Record<string, number>;
  country_risk_map: Record<string, number>;
}

interface CustomerScore {
  id: string;
  customer_id: string;
  overall_score: number;
  risk_level: string;
  factors: Record<string, number>;
  calculated_at: string;
  customer_name?: string;
}

export function RiskScoringPage({ organizations }: { organizations: Organization[] }) {
  const [profiles, setProfiles] = useState<RiskProfile[]>([]);
  const [selectedSro, setSelectedSro] = useState<string>("VQF");
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [scores, setScores] = useState<CustomerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RiskProfile | null>(null);
  const [editWeights, setEditWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (selectedOrg) loadScores(selectedOrg);
  }, [selectedOrg]);

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("risk_scoring_profiles")
      .select("*")
      .order("sro");
    if (!error && data) setProfiles(data as RiskProfile[]);
    setLoading(false);
  }

  async function loadScores(orgId: string) {
    const { data: scoreData } = await supabase
      .from("customer_risk_scores")
      .select("*, client_customers(data)")
      .eq("organization_id", orgId)
      .order("overall_score", { ascending: false });

    if (scoreData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setScores(scoreData.map((s: any) => ({
        ...s,
        customer_name: s.client_customers?.data?.name || s.client_customers?.data?.company_name || "Unbekannt",
      })));
    }
  }

  async function handleCalculate() {
    if (!selectedOrg) return;
    setCalculating(true);
    try {
      await supabase.functions.invoke("calculate-risk-score", {
        body: { organization_id: selectedOrg },
      });
      await loadScores(selectedOrg);
    } catch (err) {
      console.error("Risk calculation failed:", err);
    }
    setCalculating(false);
  }

  async function handleSaveWeights() {
    if (!editingProfile) return;
    const { error } = await supabase
      .from("risk_scoring_profiles")
      .update({ weights: editWeights })
      .eq("id", editingProfile.id);
    if (!error) {
      setEditingProfile(null);
      loadProfiles();
    }
  }

  const currentProfile = profiles.find((p) => p.sro === selectedSro);
  const WEIGHT_LABELS: Record<string, string> = {
    country: "Länderrisiko",
    industry: "Branchenrisiko",
    pep: "PEP-Status",
    products: "Produktrisiko",
    volume: "Transaktionsvolumen",
    source_of_funds: "Mittelherkunft",
  };

  if (loading) {
    return <div style={{ padding: 40, color: T.ink3, fontFamily: T.sans }}>Laden...</div>;
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960 }}>
      <SectionLabel text="Risk Management" />
      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
        Risk Scoring
      </h1>
      <p style={{ fontSize: 14, color: T.ink3, fontFamily: T.sans, margin: "0 0 32px" }}>
        Konfigurierbare Risikobewertung pro SRO — 6 gewichtete Faktoren
      </p>

      {/* SRO Profile Selector */}
      <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: 24, marginBottom: 24, boxShadow: T.shSm }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, margin: "0 0 16px" }}>
          Gewichtungsprofile nach SRO
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[...new Set(profiles.map((p) => p.sro))].map((sro) => (
            <button
              key={sro}
              onClick={() => setSelectedSro(sro)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: `1px solid ${selectedSro === sro ? T.accent : T.border}`,
                background: selectedSro === sro ? T.accentS : "#fff",
                color: selectedSro === sro ? T.accent : T.ink3,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: T.sans,
                cursor: "pointer",
              }}
            >
              {sro}
            </button>
          ))}
        </div>

        {currentProfile && !editingProfile && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {Object.entries(currentProfile.weights).map(([key, val]) => (
                <div key={key} style={{ background: T.s1, borderRadius: T.r, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 500, marginBottom: 4 }}>
                    {WEIGHT_LABELS[key] ?? key}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>
                    {val}%
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setEditingProfile(currentProfile); setEditWeights({ ...currentProfile.weights }); }}
              style={{
                padding: "8px 20px",
                borderRadius: T.r,
                border: `1px solid ${T.border}`,
                background: "#fff",
                color: T.ink,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: T.sans,
                cursor: "pointer",
              }}
            >
              Gewichtung anpassen
            </button>
          </div>
        )}

        {editingProfile && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {Object.entries(editWeights).map(([key, val]) => (
                <div key={key} style={{ background: T.s1, borderRadius: T.r, padding: "12px 16px" }}>
                  <label style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    {WEIGHT_LABELS[key] ?? key}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => setEditWeights((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: T.sans,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveWeights} style={{ padding: "8px 20px", borderRadius: T.r, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: T.sans, cursor: "pointer" }}>
                Speichern
              </button>
              <button onClick={() => setEditingProfile(null)} style={{ padding: "8px 20px", borderRadius: T.r, border: `1px solid ${T.border}`, background: "#fff", color: T.ink3, fontSize: 13, fontWeight: 500, fontFamily: T.sans, cursor: "pointer" }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Scores */}
      <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: 24, boxShadow: T.shSm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.ink, fontFamily: T.sans, margin: 0 }}>
            Kunden-Risikobewertungen
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans }}
            >
              <option value="">Organisation wählen...</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            {selectedOrg && (
              <button
                onClick={handleCalculate}
                disabled={calculating}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  cursor: calculating ? "wait" : "pointer",
                  opacity: calculating ? 0.6 : 1,
                }}
              >
                {calculating ? "Berechne..." : "Neu berechnen"}
              </button>
            )}
          </div>
        </div>

        {scores.length === 0 && selectedOrg && (
          <div style={{ padding: 32, textAlign: "center", color: T.ink4, fontFamily: T.sans, fontSize: 14 }}>
            Noch keine Risikobewertungen. Klicken Sie "Neu berechnen" um die Kunden zu bewerten.
          </div>
        )}

        {scores.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scores.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 18px",
                  borderRadius: T.r,
                  background: riskBg(s.risk_level),
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans }}>
                    {s.customer_name}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink4, fontFamily: T.sans, marginTop: 2 }}>
                    Berechnet: {new Date(s.calculated_at).toLocaleDateString("de-CH")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: riskColor(s.risk_level), fontFamily: T.sans }}>
                    {s.overall_score}
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: riskBg(s.risk_level),
                      border: `1px solid ${riskColor(s.risk_level)}30`,
                      color: riskColor(s.risk_level),
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: T.sans,
                    }}
                  >
                    {riskLabel(s.risk_level)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
