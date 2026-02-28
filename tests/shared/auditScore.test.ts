import { describe, it, expect } from "vitest";
import { calculateAuditScore, auditColor } from "../../app/shared/lib/auditScore";
import type { AuditInputData } from "../../app/shared/lib/auditScore";
import { PROFILE_FIELDS } from "../../app/shared/data/profileFields";

// ─── Helper: Build AuditInputData with defaults ─────────────────────

function input(overrides: Partial<AuditInputData> = {}): AuditInputData {
  return {
    documents: [],
    profileData: null,
    profileFields: PROFILE_FIELDS,
    customers: [],
    openActionCount: 0,
    overdueActionCount: 0,
    hasAnnualReport: false,
    docTypeCount: 0,
    lastDocUpdateDays: null,
    ...overrides,
  };
}

const ALL_REQUIRED_DOCS = ["aml_policy", "kyc_checklist", "risk_assessment", "kyt_policy", "annual_report"];

function makeDocs(status: string) {
  return ALL_REQUIRED_DOCS.map((t) => ({ doc_type: t, status, next_review: null }));
}

function makeFullProfile(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const f of PROFILE_FIELDS) {
    if (f.required !== false) {
      data[f.id] = f.type === "multi" ? ["value"] : f.type === "toggle" ? true : "filled";
    }
  }
  return data;
}

// ─── Perfekte Score ─────────────────────────────────────────────────

describe("calculateAuditScore", () => {
  it("returns ~100 for perfect input", () => {
    const result = calculateAuditScore(
      input({
        documents: makeDocs("current"),
        profileData: makeFullProfile(),
        customers: [],
        openActionCount: 0,
        overdueActionCount: 0,
        hasAnnualReport: true,
        docTypeCount: 5,
        lastDocUpdateDays: 10,
      }),
    );

    expect(result.total).toBeGreaterThanOrEqual(95);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.label).toBe("Bereit");
    expect(result.color).toBe("#16654e");
  });

  it("returns critical score (<50) for empty input", () => {
    const result = calculateAuditScore(
      input({
        documents: [],
        profileData: null,
        openActionCount: 15,
        overdueActionCount: 5,
        hasAnnualReport: false,
        docTypeCount: 0,
        lastDocUpdateDays: 365,
      }),
    );

    expect(result.total).toBeLessThan(50);
    expect(result.label).toBe("Kritisch");
    expect(result.color).toBe("#dc2626");
  });

  it("returns partial score (50-79) for mixed input", () => {
    // 3 current docs + 2 draft = partial docs score
    const docs = [
      { doc_type: "aml_policy", status: "current", next_review: null },
      { doc_type: "kyc_checklist", status: "current", next_review: null },
      { doc_type: "risk_assessment", status: "current", next_review: null },
      { doc_type: "kyt_policy", status: "draft", next_review: null },
      { doc_type: "annual_report", status: "draft", next_review: null },
    ];

    // Partial profile: fill ~60% of required fields
    const requiredFields = PROFILE_FIELDS.filter((f) => f.required !== false);
    const partial: Record<string, unknown> = {};
    const fillCount = Math.round(requiredFields.length * 0.6);
    for (let i = 0; i < fillCount; i++) {
      const f = requiredFields[i];
      partial[f.id] = f.type === "multi" ? ["v"] : "v";
    }

    const result = calculateAuditScore(
      input({
        documents: docs,
        profileData: partial,
        openActionCount: 2,
        hasAnnualReport: true,
        docTypeCount: 3,
        lastDocUpdateDays: 60,
      }),
    );

    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.total).toBeLessThanOrEqual(79);
    expect(result.label).toBe("Teilweise");
  });

  // ─── Documents ──────────────────────────────────────────────────

  it("scores document statuses: current=100, review=40, draft=20, outdated=10", () => {
    const docs = [
      { doc_type: "aml_policy", status: "current", next_review: null },
      { doc_type: "kyc_checklist", status: "review", next_review: null },
      { doc_type: "risk_assessment", status: "draft", next_review: null },
      { doc_type: "kyt_policy", status: "outdated", next_review: null },
      { doc_type: "annual_report", status: "current", next_review: null },
    ];

    const result = calculateAuditScore(input({ documents: docs }));
    // Expected doc score: (100+40+20+10+100)/5 = 54
    expect(result.categories.documents.score).toBe(54);
  });

  it("only counts required docs, ignores extras", () => {
    const docs = [
      ...makeDocs("current"),
      { doc_type: "extra_doc", status: "current", next_review: null },
      { doc_type: "another_extra", status: "draft", next_review: null },
    ];

    const result = calculateAuditScore(input({ documents: docs }));
    // All 5 required docs current → 100
    expect(result.categories.documents.score).toBe(100);
  });

  it("scores 0 for missing required docs", () => {
    const result = calculateAuditScore(input({ documents: [] }));
    expect(result.categories.documents.score).toBe(0);
    expect(result.categories.documents.details).toHaveLength(5);
  });

  // ─── Profile ────────────────────────────────────────────────────

  it("scores profile 0 when profileData is null", () => {
    const result = calculateAuditScore(input({ profileData: null }));
    expect(result.categories.profile.score).toBe(0);
  });

  it("counts filled required fields correctly", () => {
    const requiredFields = PROFILE_FIELDS.filter((f) => f.required !== false);
    // Fill exactly half
    const half = Math.floor(requiredFields.length / 2);
    const data: Record<string, unknown> = {};
    for (let i = 0; i < half; i++) {
      const f = requiredFields[i];
      data[f.id] = f.type === "multi" ? ["v"] : "v";
    }

    const result = calculateAuditScore(input({ profileData: data }));
    const expectedPct = Math.round((half / requiredFields.length) * 100);
    expect(result.categories.profile.score).toBe(expectedPct);
  });

  // ─── Customers ──────────────────────────────────────────────────

  it("scores 100% when no customers exist", () => {
    const result = calculateAuditScore(input({ customers: [] }));
    expect(result.categories.customers.score).toBe(100);
  });

  it("penalises expired reviews and missing KYC docs", () => {
    const past = "2020-01-01";
    const future = "2099-01-01";
    const customers = [
      { status: "active", next_review: past, has_kyc_doc: true },
      { status: "active", next_review: future, has_kyc_doc: false },
      { status: "active", next_review: future, has_kyc_doc: true },
    ];

    const result = calculateAuditScore(input({ customers }));
    // 1 of 3 active has expired review → reviewFresh = 2/3
    // 2 of 3 have kyc doc → docScore = 67
    expect(result.categories.customers.score).toBeLessThan(100);
    expect(result.categories.customers.score).toBeGreaterThan(0);
  });

  // ─── Actions ────────────────────────────────────────────────────

  it("scores actions with correct step thresholds", () => {
    // 0 → 100
    expect(calculateAuditScore(input({ openActionCount: 0 })).categories.actions.score).toBe(100);
    // 1 → 80
    expect(calculateAuditScore(input({ openActionCount: 1 })).categories.actions.score).toBe(80);
    // 3 → 60
    expect(calculateAuditScore(input({ openActionCount: 3 })).categories.actions.score).toBe(60);
    // 6 → 40
    expect(calculateAuditScore(input({ openActionCount: 6 })).categories.actions.score).toBe(40);
    // 11 → 20
    expect(calculateAuditScore(input({ openActionCount: 11 })).categories.actions.score).toBe(20);
  });

  it("deducts for overdue actions", () => {
    const result = calculateAuditScore(input({ openActionCount: 3, overdueActionCount: 3 }));
    // Base: 60 - 3×5 = 45
    expect(result.categories.actions.score).toBe(45);
  });

  // ─── Training ───────────────────────────────────────────────────

  it("scores annual report presence correctly", () => {
    const withReport = calculateAuditScore(
      input({ hasAnnualReport: true, docTypeCount: 5, lastDocUpdateDays: 10 }),
    );
    const withoutReport = calculateAuditScore(
      input({ hasAnnualReport: false, docTypeCount: 5, lastDocUpdateDays: 10 }),
    );

    expect(withReport.categories.training.score).toBeGreaterThan(withoutReport.categories.training.score);
  });

  it("uses neutral 50 score when lastDocUpdateDays is null", () => {
    const result = calculateAuditScore(input({ lastDocUpdateDays: null, docTypeCount: 0 }));
    // annualScore=0 (40%), updateScore=50 (30%), diversityScore=0 (30%)
    // = 0*0.4 + 50*0.3 + 0*0.3 = 15
    expect(result.categories.training.score).toBe(15);
  });
});

// ─── auditColor() ───────────────────────────────────────────────────

describe("auditColor", () => {
  it("returns green for score >= 80", () => {
    expect(auditColor(80)).toEqual({ color: "#16654e", bg: "#ecf5f1", label: "Bereit" });
    expect(auditColor(100)).toEqual({ color: "#16654e", bg: "#ecf5f1", label: "Bereit" });
  });

  it("returns yellow for score 50-79", () => {
    expect(auditColor(50)).toEqual({ color: "#d97706", bg: "#fffbeb", label: "Teilweise" });
    expect(auditColor(79)).toEqual({ color: "#d97706", bg: "#fffbeb", label: "Teilweise" });
  });

  it("returns red for score < 50", () => {
    expect(auditColor(49)).toEqual({ color: "#dc2626", bg: "#fef2f2", label: "Kritisch" });
    expect(auditColor(0)).toEqual({ color: "#dc2626", bg: "#fef2f2", label: "Kritisch" });
  });
});
