import { describe, it, expect } from "vitest";
import { calcProfileCompletion, completionColor } from "../../app/shared/lib/profileCompletion";
import type { ProfileFieldDef } from "../../app/shared/data/profileFields";

// ─── Test fields (simple set for predictable testing) ───────────────

const FIELDS: ProfileFieldDef[] = [
  { id: "a", label: "A", type: "text", required: true, section: "S" },
  { id: "b", label: "B", type: "text", required: true, section: "S" },
  { id: "c", label: "C", type: "text", required: true, section: "S" },
  { id: "d", label: "D", type: "text", required: true, section: "S" },
  { id: "e", label: "E", type: "multi", required: true, section: "S" },
  { id: "f", label: "F", type: "text", required: true, section: "S" },
  { id: "opt", label: "Optional", type: "text", required: false, section: "S" },
];

// ─── calcProfileCompletion ──────────────────────────────────────────

describe("calcProfileCompletion", () => {
  it("returns 0 for null data", () => {
    expect(calcProfileCompletion(null, FIELDS)).toBe(0);
  });

  it("returns 0 for undefined data", () => {
    expect(calcProfileCompletion(undefined, FIELDS)).toBe(0);
  });

  it("returns 0 when all required fields are empty", () => {
    expect(calcProfileCompletion({ a: "", b: null, c: undefined }, FIELDS)).toBe(0);
  });

  it("returns 100 when all required fields are filled", () => {
    const data = { a: "x", b: "x", c: "x", d: "x", e: ["v"], f: "x" };
    expect(calcProfileCompletion(data, FIELDS)).toBe(100);
  });

  it("returns 50 when half of required fields are filled", () => {
    // 3 of 6 required filled
    const data = { a: "x", b: "x", c: "x" };
    expect(calcProfileCompletion(data, FIELDS)).toBe(50);
  });

  it("ignores optional fields", () => {
    // All required filled, optional empty → still 100
    const data = { a: "x", b: "x", c: "x", d: "x", e: ["v"], f: "x" };
    expect(calcProfileCompletion(data, FIELDS)).toBe(100);

    // Only optional filled → 0
    expect(calcProfileCompletion({ opt: "filled" }, FIELDS)).toBe(0);
  });

  it("treats empty array as not filled", () => {
    const data = { a: "x", b: "x", c: "x", d: "x", e: [], f: "x" };
    // 5 of 6 required → 83%
    expect(calcProfileCompletion(data, FIELDS)).toBe(83);
  });
});

// ─── completionColor ────────────────────────────────────────────────

describe("completionColor", () => {
  it("returns green/Gut for >= 80%", () => {
    expect(completionColor(80)).toEqual({ bg: "#ecf5f1", color: "#16654e", label: "Gut" });
    expect(completionColor(100)).toEqual({ bg: "#ecf5f1", color: "#16654e", label: "Gut" });
  });

  it("returns yellow/Unvollständig for 50-79%", () => {
    expect(completionColor(50)).toEqual({ bg: "#fffbeb", color: "#d97706", label: "Unvollständig" });
    expect(completionColor(79)).toEqual({ bg: "#fffbeb", color: "#d97706", label: "Unvollständig" });
  });

  it("returns red/Lückenhaft for < 50%", () => {
    expect(completionColor(49)).toEqual({ bg: "#fef2f2", color: "#dc2626", label: "Lückenhaft" });
    expect(completionColor(0)).toEqual({ bg: "#fef2f2", color: "#dc2626", label: "Lückenhaft" });
  });
});
