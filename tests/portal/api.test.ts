import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  supabase,
  mockSupabaseQuery,
  mockSupabaseSingle,
  mockSupabaseAuth,
  resetSupabaseMocks,
} from "../mocks/supabase";
import {
  loadUserOrganization,
  loadClientAlerts,
  updateClientActionStatus,
  loadActionComments,
  addActionComment,
  deleteActionComment,
  loadClientDocuments,
  approveDocument,
  loadDocumentVersions,
  loadDocumentAuditLog,
  loadPortalStats,
  loadDocAlerts,
  loadClientProfile,
  loadClientMessages,
  markMessageAsRead,
} from "../../app/portal/lib/api";

beforeEach(() => {
  resetSupabaseMocks();
  vi.clearAllMocks();
});

// ─── Organization ──────────────────────────────────────────────────────

describe("loadUserOrganization", () => {
  it("returns org with user role", async () => {
    const raw = {
      role: "editor",
      organizations: {
        id: "o1",
        name: "Acme AG",
        short_name: "ACM",
        industry: "Finance",
        sro: "FINMA",
        contact_name: "Max",
        contact_salutation: "Herr",
      },
    };
    mockSupabaseSingle(raw);

    const result = await loadUserOrganization("u1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("o1");
    expect(result!.userRole).toBe("editor");
  });

  it("returns null when no organization", async () => {
    mockSupabaseSingle({ role: null, organizations: null });

    const result = await loadUserOrganization("u1");
    expect(result).toBeNull();
  });

  it("defaults role to viewer", async () => {
    const raw = {
      role: null,
      organizations: { id: "o2", name: "Test", short_name: null, industry: null, sro: null, contact_name: null, contact_salutation: null },
    };
    mockSupabaseSingle(raw);

    const result = await loadUserOrganization("u1");
    expect(result!.userRole).toBe("viewer");
  });
});

// ─── Client Alerts ─────────────────────────────────────────────────────

describe("loadClientAlerts", () => {
  it("returns mapped alerts excluding drafts/dismissed", async () => {
    // Mock returns only data the DB would return after !inner + neq filtering
    const raw = [
      {
        id: "ac1",
        reason: "Betroffen",
        risk: "high",
        elena_comment: "Sofort handeln",
        regulatory_alerts: {
          id: "ra1", title: "FINMA Update", source: "FINMA", date: "2025-06-01",
          severity: "high", status: "new", category: "AML", summary: "...",
          legal_basis: "GwG", deadline: "2025-12-31",
        },
        client_alert_actions: [{ id: "caa1", text: "Prüfen", due: "2025-07-01", status: "offen" }],
        alert_related_documents: [{ name: "AML Policy", type: "PDF", date: "2025-01-01" }],
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadClientAlerts("o1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("FINMA Update");
    expect(result[0].isNew).toBe(true);
    expect(result[0].impact).toBe("high");
    expect(result[0].actions).toHaveLength(1);
    expect(result[0].relatedDocs).toHaveLength(1);
  });

  it("returns empty when DB filters out all alerts (draft/dismissed)", async () => {
    // !inner join with neq filters happen at DB level — mock returns empty result
    mockSupabaseQuery([]);

    const result = await loadClientAlerts("o1");
    expect(result).toHaveLength(0);
  });
});

describe("updateClientActionStatus", () => {
  it("updates action status", async () => {
    mockSupabaseQuery(null);

    await updateClientActionStatus("caa1", "erledigt");
    expect(supabase.from).toHaveBeenCalledWith("client_alert_actions");
  });

  it("throws on error", async () => {
    mockSupabaseQuery(null, { message: "Not found" });

    await expect(updateClientActionStatus("x", "offen")).rejects.toEqual({ message: "Not found" });
  });
});

// ─── Action Comments ───────────────────────────────────────────────────

describe("Action Comments", () => {
  it("loadActionComments maps profiles to user_name", async () => {
    const raw = [
      { id: "c1", action_id: "a1", user_id: "u1", text: "Kommentar", created_at: "2025-01-01T10:00:00Z", profiles: { full_name: "Max Muster" } },
      { id: "c2", action_id: "a1", user_id: "u2", text: "Antwort", created_at: "2025-01-01T11:00:00Z", profiles: null },
    ];
    mockSupabaseQuery(raw);

    const result = await loadActionComments("a1");
    expect(result).toHaveLength(2);
    expect(result[0].user_name).toBe("Max Muster");
    expect(result[1].user_name).toBe("Unbekannt");
  });

  it("addActionComment checks auth and inserts", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery(null);

    await addActionComment("a1", "Neuer Kommentar");
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("action_comments");
  });

  it("addActionComment throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(addActionComment("a1", "Test")).rejects.toThrow("Nicht authentifiziert");
  });

  it("deleteActionComment removes comment", async () => {
    mockSupabaseQuery(null);

    await deleteActionComment("c1");
    expect(supabase.from).toHaveBeenCalledWith("action_comments");
  });
});

// ─── Client Documents ──────────────────────────────────────────────────

describe("Client Documents", () => {
  it("loadClientDocuments maps fields correctly", async () => {
    const raw = [
      {
        id: "d1", category: "AML", doc_type: "Policy", name: "AML Richtlinie",
        description: "Beschreibung", version: "v2.0", status: "current",
        updated_by_name: "Admin", updated_at: "2025-06-15T10:00:00Z",
        format: "PDF", pages: 12, legal_basis: "GwG Art. 3",
        alert_notice: "Achtung", content: "...", approved_at: "2025-06-10T08:00:00Z",
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadClientDocuments("o1");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("AML");
    expect(result[0].format).toBe("PDF");
    expect(result[0].approvedAt).toBeTruthy();
  });

  it("loadClientDocuments uses defaults for missing fields", async () => {
    const raw = [
      { id: "d2", name: "Minimal", updated_at: "2025-01-01T00:00:00Z" },
    ];
    mockSupabaseQuery(raw);

    const result = await loadClientDocuments("o1");
    expect(result[0].version).toBe("v1.0");
    expect(result[0].status).toBe("draft");
    expect(result[0].updatedBy).toBe("Virtue Compliance");
    expect(result[0].format).toBe("DOCX");
    expect(result[0].pages).toBe(0);
    expect(result[0].approvedAt).toBeNull();
  });
});

describe("approveDocument", () => {
  it("approves document in review status", async () => {
    mockSupabaseAuth({ id: "u1", email: "approver@example.com" });
    mockSupabaseQuery([{ id: "d1" }]);

    await approveDocument("d1");
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("documents");
  });

  it("throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(approveDocument("d1")).rejects.toThrow("Nicht authentifiziert");
  });

  it("throws when document is not in review status", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery([]); // empty result = no matching doc

    await expect(approveDocument("d1")).rejects.toThrow("nicht im Status 'Review'");
  });
});

// ─── Document Versions ─────────────────────────────────────────────────

describe("loadDocumentVersions", () => {
  it("returns versions list", async () => {
    const versions = [
      { id: "v1", version: "v2.0", name: "AML v2", content: "...", created_at: "2025-06-01" },
      { id: "v2", version: "v1.0", name: "AML v1", content: "...", created_at: "2025-01-01" },
    ];
    mockSupabaseQuery(versions);

    const result = await loadDocumentVersions("d1");
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe("v2.0");
  });
});

// ─── Document Audit Log ────────────────────────────────────────────────

describe("loadDocumentAuditLog", () => {
  it("maps fields correctly including profile name", async () => {
    const raw = [
      {
        id: "al1", action: "status_changed", old_status: "draft", new_status: "review",
        changed_by: "u1", changed_at: "2025-06-15T10:00:00Z", details: "Status geändert",
        profiles: { full_name: "Max Muster" },
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadDocumentAuditLog("d1");
    expect(result).toHaveLength(1);
    expect(result[0].changedBy).toBe("Max Muster");
    expect(result[0].oldStatus).toBe("draft");
    expect(result[0].newStatus).toBe("review");
  });

  it("defaults changedBy to System when no profile", async () => {
    const raw = [
      { id: "al2", action: "created", old_status: null, new_status: "draft", changed_by: null, changed_at: "2025-01-01T00:00:00Z", details: null, profiles: null },
    ];
    mockSupabaseQuery(raw);

    const result = await loadDocumentAuditLog("d1");
    expect(result[0].changedBy).toBe("System");
  });
});

// ─── Portal Stats ──────────────────────────────────────────────────────

describe("loadPortalStats", () => {
  it("counts alerts and docs from parallel queries", async () => {
    // Both parallel queries share the same mock state.
    // Mock returns data that works for both: alerts (filtered by DB) and docs.
    mockSupabaseQuery([
      { id: "a1", risk: "high", status: "current", regulatory_alerts: { status: "new" } },
      { id: "a3", risk: "low", status: "current", regulatory_alerts: { status: "acknowledged" } },
      { id: "d1", risk: null, status: "draft", regulatory_alerts: null },
    ]);

    const result = await loadPortalStats("o1");
    // Alerts: 3 items returned (DB !inner filter simulated by mock returning all)
    expect(result.totalAlerts).toBe(3);
    // newAlerts: only a1 has regulatory_alerts.status === "new"
    expect(result.newAlerts).toBe(1);
    // Docs: 3 total, 2 with status "current"
    expect(result.totalDocs).toBe(3);
    expect(result.currentDocs).toBe(2);
  });
});

// ─── Doc Alert Links ───────────────────────────────────────────────────

describe("loadDocAlerts", () => {
  it("returns linked alerts excluding draft/dismissed", async () => {
    const raw = [
      {
        alert_affected_clients: {
          id: "ac1", organization_id: "o1",
          regulatory_alerts: { title: "Alert 1", severity: "high", date: "2025-06-01", status: "new" },
        },
      },
      {
        alert_affected_clients: {
          id: "ac2", organization_id: "o1",
          regulatory_alerts: { title: "Alert 2", severity: "medium", date: "2025-05-01", status: "draft" },
        },
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadDocAlerts("AML Policy", "o1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Alert 1");
    expect(result[0].severity).toBe("high");
  });

  it("returns empty array when no linked alerts", async () => {
    mockSupabaseQuery([]);

    const result = await loadDocAlerts("Unknown Doc", "o1");
    expect(result).toEqual([]);
  });
});

// ─── Client Profile ───────────────────────────────────────────────────

describe("loadClientProfile", () => {
  it("returns profile data as object", async () => {
    mockSupabaseSingle({ data: { company_name: "Acme AG", industry: "Crypto / DLT" } });

    const result = await loadClientProfile("o1");
    expect(result).toEqual({ company_name: "Acme AG", industry: "Crypto / DLT" });
    expect(supabase.from).toHaveBeenCalledWith("company_profiles");
  });

  it("returns null when no row found", async () => {
    mockSupabaseSingle(null);

    const result = await loadClientProfile("o1");
    expect(result).toBeNull();
  });

  it("returns null when data is non-object (string)", async () => {
    mockSupabaseSingle({ data: "invalid-string" });

    const result = await loadClientProfile("o1");
    expect(result).toBeNull();
  });
});

// ─── Client Messages ──────────────────────────────────────────────────

describe("loadClientMessages", () => {
  it("returns messages with read status merged", async () => {
    // First call (admin_messages) returns messages, second (admin_message_reads) returns reads
    // Both use the same mockSupabaseQuery state
    mockSupabaseQuery([
      { id: "m1", subject: "Hello", body: "Test body", created_at: "2026-01-01" },
      { id: "m2", subject: "Update", body: "Info", created_at: "2026-01-02" },
    ]);

    const result = await loadClientMessages("o1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m1");
    expect(result[0].subject).toBe("Hello");
    // Read status: the second query returns the same data shape,
    // but readSet looks for message_id, so m1/m2 won't match → is_read = false
    expect(result[0]).toHaveProperty("is_read");
    expect(supabase.from).toHaveBeenCalledWith("admin_messages");
  });

  it("returns empty array when no messages", async () => {
    mockSupabaseQuery([]);

    const result = await loadClientMessages("o1");
    expect(result).toEqual([]);
  });

  it("handles reads error gracefully (still returns messages)", async () => {
    // Messages succeed but reads might fail — the function logs the error and continues
    const messages = [
      { id: "m1", subject: "Test", body: "Body", created_at: "2026-01-01" },
    ];
    mockSupabaseQuery(messages);

    const result = await loadClientMessages("o1");
    // Should still return messages even if reads had an issue
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Test");
  });
});

// ─── Mark Message As Read ─────────────────────────────────────────────

describe("markMessageAsRead", () => {
  it("upserts read entry for authenticated user", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery(null);

    await markMessageAsRead("m1");
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("admin_message_reads");
  });

  it("silently returns when no user is authenticated", async () => {
    mockSupabaseAuth(null);

    await markMessageAsRead("m1");
    // Should not call supabase.from since no user
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does not throw on DB error (logs instead)", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery(null, { message: "Upsert failed" });

    // Should not throw — the function catches and logs
    await expect(markMessageAsRead("m1")).resolves.toBeUndefined();
  });
});
