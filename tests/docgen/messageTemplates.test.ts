import { describe, it, expect } from "vitest";
import { MESSAGE_TEMPLATES, fillTemplate } from "../../app/docgen/data/messageTemplates";

// ─── Template Structure ─────────────────────────────────────────────

describe("MESSAGE_TEMPLATES", () => {
  it("all 5 templates have required fields", () => {
    expect(MESSAGE_TEMPLATES).toHaveLength(5);
    for (const t of MESSAGE_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.body).toBeTruthy();
    }
  });

  it("every template body contains {{orgName}} placeholder", () => {
    for (const t of MESSAGE_TEMPLATES) {
      expect(t.body).toContain("{{orgName}}");
    }
  });
});

// ─── fillTemplate ───────────────────────────────────────────────────

describe("fillTemplate", () => {
  const template = MESSAGE_TEMPLATES[0]; // annual_review

  it("replaces all placeholders with full org data", () => {
    const result = fillTemplate(template, {
      name: "Acme AG",
      contact_name: "Max Muster",
      contact_salutation: "Sehr geehrter Herr",
    });

    expect(result.body).toContain("Acme AG");
    expect(result.body).toContain("Max Muster");
    expect(result.body).toContain("Sehr geehrter Herr");
    expect(result.body).not.toContain("{{orgName}}");
    expect(result.body).not.toContain("{{contactName}}");
    expect(result.body).not.toContain("{{contactSalutation}}");
  });

  it("uses defaults when contactName is missing", () => {
    const result = fillTemplate(template, { name: "Test AG" });

    expect(result.body).toContain("Damen und Herren");
    expect(result.body).toContain("Sehr geehrte");
    expect(result.body).not.toContain("Sehr geehrte(r)");
  });

  it("uses 'Sehr geehrte(r)' when contactName present but no salutation", () => {
    const result = fillTemplate(template, {
      name: "Test AG",
      contact_name: "Alex Keller",
    });

    expect(result.body).toContain("Alex Keller");
    expect(result.body).toContain("Sehr geehrte(r)");
  });

  it("leaves no unreplaced placeholders in any template", () => {
    for (const t of MESSAGE_TEMPLATES) {
      const result = fillTemplate(t, {
        name: "Org",
        contact_name: "Name",
        contact_salutation: "Salutation",
      });

      expect(result.subject).not.toMatch(/\{\{.*?\}\}/);
      expect(result.body).not.toMatch(/\{\{.*?\}\}/);
    }
  });
});
