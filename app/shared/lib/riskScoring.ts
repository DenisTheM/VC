// Configurable Risk Scoring Engine
// Calculates customer risk based on 6 weighted factors

import { getCountryRisk, riskCategory } from "@shared/data/countryRiskData";

// ─── Types ───────────────────────────────────────────────────────────

export interface RiskWeights {
  country: number;
  industry: number;
  pep: number;
  products: number;
  volume: number;
  source_of_funds: number;
}

export interface RiskFactors {
  country: number;
  industry: number;
  pep: number;
  products: number;
  volume: number;
  source_of_funds: number;
}

export interface RiskResult {
  overallScore: number;        // 0-100
  riskLevel: "low" | "standard" | "elevated" | "high";
  factors: RiskFactors;
  breakdown: { factor: string; weight: number; score: number; weighted: number }[];
}

export interface CustomerData {
  nationality?: string;
  country?: string;
  geo_focus?: string | string[];
  industry?: string;
  pep_status?: boolean | string;
  products?: string | string[];
  tx_volume?: string;
  source_of_funds?: string;
}

// ─── Default weights ─────────────────────────────────────────────────

export const DEFAULT_WEIGHTS: RiskWeights = {
  country: 25,
  industry: 15,
  pep: 20,
  products: 15,
  volume: 10,
  source_of_funds: 15,
};

// ─── Industry risk scores ────────────────────────────────────────────

const INDUSTRY_RISK: Record<string, number> = {
  // High risk
  "Krypto / Blockchain / DLT": 80,
  "Money Service Business (MSB)": 85,
  "Zahlungsdienstleister": 65,
  "Payment Service Provider": 65,
  "Geldtransfer / Remittance": 80,
  "Crowdfunding": 55,
  "Investment / Fondsmanagement": 50,
  "Investmentgesellschaft": 50,
  "Venture Capital / PE": 45,
  // Medium risk
  "Fintech": 50,
  "Bank / Kreditinstitut": 40,
  "Vermögensverwaltung": 45,
  "Versicherung": 30,
  "Treuhand / Trust": 55,
  // Low risk
  "Immobilien": 35,
  "Handel / E-Commerce": 30,
  "IT / Software": 15,
  "Beratung / Consulting": 20,
};

// ─── Product risk scores ─────────────────────────────────────────────

const PRODUCT_RISK: Record<string, number> = {
  "Crypto Trading": 75,
  "Crypto Custody": 65,
  "DeFi Services": 80,
  "NFT Marketplace": 60,
  "Token Issuance / ICO / STO": 75,
  "Payment Processing": 55,
  "Remittance": 75,
  "Crowdfunding": 50,
  "Investment / Fondsmanagement": 45,
  "Forex / CFD": 60,
  "Lending / Credit": 45,
  "Insurance": 25,
  "Banking": 35,
  "Asset Management": 40,
};

// ─── Volume risk thresholds ──────────────────────────────────────────

function volumeRisk(txVolume: string): number {
  const lower = txVolume.toLowerCase();
  if (lower.includes("> 10 mio") || lower.includes(">10m") || lower.includes("sehr hoch")) return 80;
  if (lower.includes("5-10 mio") || lower.includes("5m-10m") || lower.includes("hoch")) return 60;
  if (lower.includes("1-5 mio") || lower.includes("1m-5m") || lower.includes("mittel")) return 40;
  if (lower.includes("< 1 mio") || lower.includes("<1m") || lower.includes("tief") || lower.includes("gering")) return 15;
  return 30; // default standard
}

// ─── Source of funds risk ────────────────────────────────────────────

function sourceOfFundsRisk(source: string): number {
  const lower = source.toLowerCase();
  if (lower.includes("ererbt") || lower.includes("erbschaft")) return 40;
  if (lower.includes("geschenk") || lower.includes("donation")) return 55;
  if (lower.includes("krypto") || lower.includes("crypto") || lower.includes("mining")) return 65;
  if (lower.includes("gewinn") || lower.includes("gambling") || lower.includes("lottery")) return 70;
  if (lower.includes("bar") || lower.includes("cash")) return 75;
  if (lower.includes("gehalt") || lower.includes("lohn") || lower.includes("salary")) return 10;
  if (lower.includes("geschäfts") || lower.includes("business") || lower.includes("umsatz")) return 25;
  if (lower.includes("investition") || lower.includes("investment")) return 30;
  if (lower.includes("verkauf") || lower.includes("sale")) return 30;
  return 30;
}

// ─── Main calculation ────────────────────────────────────────────────

/**
 * Calculate risk score for a customer based on weighted factors.
 */
export function calculateCustomerRisk(
  customer: CustomerData,
  weights: RiskWeights = DEFAULT_WEIGHTS,
  countryRiskMap?: Record<string, number>,
): RiskResult {
  // Normalize weights to sum to 100
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const norm = totalWeight > 0 ? 100 / totalWeight : 1;

  // 1. Country risk — highest of nationality, country, geo_focus
  const countries: string[] = [];
  if (customer.nationality) countries.push(customer.nationality);
  if (customer.country) countries.push(customer.country);
  if (customer.geo_focus) {
    const gf = Array.isArray(customer.geo_focus) ? customer.geo_focus : [customer.geo_focus];
    gf.forEach((c) => {
      // geo_focus might be comma-separated or array
      c.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => countries.push(s));
    });
  }
  const countryScore = countries.length > 0
    ? Math.max(...countries.map((c) => getCountryRisk(c, countryRiskMap)))
    : 30;

  // 2. Industry risk
  const industryScore = customer.industry
    ? INDUSTRY_RISK[customer.industry] ?? 30
    : 30;

  // 3. PEP status
  const pepScore = (customer.pep_status === true || customer.pep_status === "yes" || customer.pep_status === "true")
    ? 90
    : 5;

  // 4. Product risk — highest of products
  let productScore = 30;
  if (customer.products) {
    const prods = Array.isArray(customer.products) ? customer.products : [customer.products];
    const scores = prods
      .flatMap((p) => p.split(",").map((s) => s.trim()))
      .filter(Boolean)
      .map((p) => PRODUCT_RISK[p] ?? 30);
    if (scores.length > 0) productScore = Math.max(...scores);
  }

  // 5. Volume risk
  const volScore = customer.tx_volume ? volumeRisk(customer.tx_volume) : 30;

  // 6. Source of funds risk
  const sofScore = customer.source_of_funds ? sourceOfFundsRisk(customer.source_of_funds) : 30;

  const factors: RiskFactors = {
    country: countryScore,
    industry: industryScore,
    pep: pepScore,
    products: productScore,
    volume: volScore,
    source_of_funds: sofScore,
  };

  // Weighted calculation
  const breakdown = [
    { factor: "Länderrisiko", weight: weights.country, score: countryScore, weighted: countryScore * weights.country * norm / 100 },
    { factor: "Branchenrisiko", weight: weights.industry, score: industryScore, weighted: industryScore * weights.industry * norm / 100 },
    { factor: "PEP-Status", weight: weights.pep, score: pepScore, weighted: pepScore * weights.pep * norm / 100 },
    { factor: "Produktrisiko", weight: weights.products, score: productScore, weighted: productScore * weights.products * norm / 100 },
    { factor: "Transaktionsvolumen", weight: weights.volume, score: volScore, weighted: volScore * weights.volume * norm / 100 },
    { factor: "Mittelherkunft", weight: weights.source_of_funds, score: sofScore, weighted: sofScore * weights.source_of_funds * norm / 100 },
  ];

  const overallScore = Math.round(
    breakdown.reduce((sum, b) => sum + b.weighted, 0),
  );

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    riskLevel: riskCategory(overallScore),
    factors,
    breakdown,
  };
}
