import type { ProfileFieldDef } from "@shared/data/profileFields";

// ─── Types ──────────────────────────────────────────────────────────

export interface AuditScoreResult {
  total: number; // 0-100
  categories: {
    documents: CategoryScore;
    profile: CategoryScore;
    customers: CategoryScore;
    actions: CategoryScore;
    training: CategoryScore;
  };
  color: string;
  bg: string;
  label: string;
}

export interface CategoryScore {
  score: number; // 0-100
  weight: number; // 0-1
  weighted: number; // score * weight
  details: string[];
}

export interface AuditInputData {
  documents: { doc_type: string; status: string; next_review: string | null }[];
  profileData: Record<string, unknown> | null;
  profileFields: ProfileFieldDef[];
  customers: { status: string; next_review: string | null; has_kyc_doc: boolean }[];
  openActionCount: number;
  overdueActionCount: number;
  hasAnnualReport: boolean;
  docTypeCount: number;
  lastDocUpdateDays: number | null;
}

// ─── Required documents for a "complete" set ────────────────────────

const REQUIRED_DOCS = ["aml_policy", "kyc_checklist", "risk_assessment", "kyt_policy", "annual_report"];

const DOC_LABELS: Record<string, string> = {
  aml_policy: "GwG-Richtlinie",
  kyc_checklist: "KYC-Checkliste",
  risk_assessment: "Risikobewertung",
  kyt_policy: "KYT-Richtlinie",
  annual_report: "Jahresbericht",
};

// ─── Scoring Algorithm ──────────────────────────────────────────────

export function calculateAuditScore(input: AuditInputData): AuditScoreResult {
  const documents = scoreDocuments(input.documents);
  const profile = scoreProfile(input.profileData, input.profileFields);
  const customers = scoreCustomers(input.customers);
  const actions = scoreActions(input.openActionCount, input.overdueActionCount);
  const training = scoreTraining(input.hasAnnualReport, input.lastDocUpdateDays, input.docTypeCount);

  const total = Math.round(
    documents.weighted + profile.weighted + customers.weighted + actions.weighted + training.weighted,
  );

  const { color, bg, label } = auditColor(total);

  return {
    total,
    categories: { documents, profile, customers, actions, training },
    color,
    bg,
    label,
  };
}

export function auditColor(score: number): { color: string; bg: string; label: string } {
  if (score >= 80) return { color: "#16654e", bg: "#ecf5f1", label: "Bereit" };
  if (score >= 50) return { color: "#d97706", bg: "#fffbeb", label: "Teilweise" };
  return { color: "#dc2626", bg: "#fef2f2", label: "Kritisch" };
}

// ─── Category: Documents (30%) ──────────────────────────────────────

function scoreDocuments(docs: { doc_type: string; status: string; next_review: string | null }[]): CategoryScore {
  const weight = 0.3;
  const details: string[] = [];

  // For each required doc, find the best version
  let docScore = 0;
  const statusScore: Record<string, number> = { current: 100, review: 40, draft: 20, outdated: 10 };

  for (const reqType of REQUIRED_DOCS) {
    const label = DOC_LABELS[reqType] || reqType;
    const matching = docs.filter((d) => d.doc_type === reqType);
    if (matching.length === 0) {
      details.push(`${label}: fehlt`);
      continue;
    }
    // Best status wins
    const best = matching.reduce((prev, curr) => {
      const statusOrder: Record<string, number> = { current: 100, review: 40, draft: 20, outdated: 10 };
      return (statusOrder[curr.status] || 0) > (statusOrder[prev.status] || 0) ? curr : prev;
    });
    const s = statusScore[best.status] || 0;
    docScore += s;
    if (s < 100) {
      const statusLabel: Record<string, string> = { review: "Überprüfung", draft: "Entwurf", outdated: "Veraltet" };
      details.push(`${label}: ${statusLabel[best.status] || best.status} (${s}%)`);
    }
  }

  const score = Math.round(docScore / REQUIRED_DOCS.length);
  return { score, weight, weighted: score * weight, details };
}

// ─── Category: Profile (15%) ────────────────────────────────────────

function scoreProfile(data: Record<string, unknown> | null, fields: ProfileFieldDef[]): CategoryScore {
  const weight = 0.15;
  const details: string[] = [];

  if (!data) {
    details.push("Kein Firmenprofil vorhanden");
    return { score: 0, weight, weighted: 0, details };
  }

  const required = fields.filter((f) => f.required !== false);
  let filled = 0;
  const missing: string[] = [];

  for (const f of required) {
    const v = data[f.id];
    if (v !== undefined && v !== "" && v !== null && !(Array.isArray(v) && v.length === 0)) {
      filled++;
    } else {
      missing.push(f.label);
    }
  }

  const score = required.length > 0 ? Math.round((filled / required.length) * 100) : 100;
  if (missing.length > 0) {
    details.push(`${missing.length} Pflichtfelder fehlen: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`);
  }

  return { score, weight, weighted: score * weight, details };
}

// ─── Category: KYC Customers (25%) ──────────────────────────────────

function scoreCustomers(customers: { status: string; next_review: string | null; has_kyc_doc: boolean }[]): CategoryScore {
  const weight = 0.25;
  const details: string[] = [];

  if (customers.length === 0) {
    return { score: 100, weight, weighted: 100 * weight, details: ["Keine Kunden erfasst (100%)"] };
  }

  // Review freshness (50%): how many customers have non-expired review dates
  const now = Date.now();
  let reviewFresh = 0;
  let kycDocOk = 0;
  let expiredReviews = 0;

  for (const c of customers) {
    if (c.status === "active") {
      if (c.next_review) {
        const reviewDate = new Date(c.next_review).getTime();
        if (reviewDate > now) reviewFresh++;
        else expiredReviews++;
      } else {
        reviewFresh++; // no review set = assume OK
      }
    }
    if (c.has_kyc_doc) kycDocOk++;
  }

  if (expiredReviews > 0) details.push(`${expiredReviews} Kunden mit abgelaufenem Review`);

  const activeCount = customers.filter((c) => c.status === "active").length;
  const reviewScore = activeCount > 0 ? Math.round((reviewFresh / activeCount) * 100) : 100;
  const docScore = Math.round((kycDocOk / customers.length) * 100);
  const score = Math.round(reviewScore * 0.5 + docScore * 0.5);

  if (reviewScore < 100) details.push(`Review-Aktualität: ${reviewScore}%`);
  if (docScore < 100) details.push(`KYC-Dokumente: ${docScore}%`);

  return { score, weight, weighted: score * weight, details };
}

// ─── Category: Open Actions (15%) ───────────────────────────────────

function scoreActions(openCount: number, overdueCount: number): CategoryScore {
  const weight = 0.15;
  const details: string[] = [];

  let score: number;
  if (openCount === 0) score = 100;
  else if (openCount <= 2) score = 80;
  else if (openCount <= 5) score = 60;
  else if (openCount <= 10) score = 40;
  else score = 20;

  // Deduct for overdue
  score = Math.max(0, score - overdueCount * 5);

  if (openCount > 0) details.push(`${openCount} offene Massnahmen`);
  if (overdueCount > 0) details.push(`${overdueCount} überfällig`);

  return { score, weight, weighted: score * weight, details };
}

// ─── Category: Training/Documentation (15%) ─────────────────────────

function scoreTraining(hasAnnualReport: boolean, lastDocUpdateDays: number | null, docTypeCount: number): CategoryScore {
  const weight = 0.15;
  const details: string[] = [];

  // Annual report (40%)
  const annualScore = hasAnnualReport ? 100 : 0;
  if (!hasAnnualReport) details.push("Jahresbericht fehlt");

  // Update frequency (30%): docs updated in last 90 days
  // null → no data available, use neutral score
  let updateScore = 50;
  if (lastDocUpdateDays != null) {
    if (lastDocUpdateDays <= 30) updateScore = 100;
    else if (lastDocUpdateDays <= 90) updateScore = 70;
    else if (lastDocUpdateDays <= 180) updateScore = 40;
    else updateScore = 10;
  }

  // Doc diversity (30%): number of different doc types
  let diversityScore = 0;
  if (docTypeCount >= 5) diversityScore = 100;
  else if (docTypeCount >= 3) diversityScore = 70;
  else if (docTypeCount >= 1) diversityScore = 40;

  const score = Math.round(annualScore * 0.4 + updateScore * 0.3 + diversityScore * 0.3);

  return { score, weight, weighted: score * weight, details };
}
