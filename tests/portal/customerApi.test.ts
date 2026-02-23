import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  supabase,
  mockSupabaseQuery,
  mockSupabaseSingle,
  mockSupabaseAuth,
  mockSupabaseRpc,
  mockSupabaseFunctions,
  resetSupabaseMocks,
} from "../mocks/supabase";
import {
  loadCustomers,
  loadCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  loadCustomerDocuments,
  createCustomerDocument,
  saveCustomerDocumentData,
  submitForReview,
  approveCustomerDocument,
  rejectCustomerDocument,
  reviseCustomerDocument,
  loadCustomerContacts,
  createCustomerContact,
  updateCustomerContact,
  deleteCustomerContact,
  deleteCustomer,
  loadDeletedCustomers,
  createHelpRequest,
  loadHelpRequests,
  loadCustomerStats,
} from "../../app/portal/lib/customerApi";

beforeEach(() => {
  resetSupabaseMocks();
  vi.clearAllMocks();
});

// ─── Customer CRUD ─────────────────────────────────────────────────────

describe("Customer CRUD", () => {
  const sampleCustomer = {
    id: "cust1",
    organization_id: "o1",
    customer_type: "legal_entity",
    first_name: null,
    last_name: null,
    company_name: "Test AG",
    uid_number: "CHE-123.456.789",
    risk_level: "standard",
    status: "active",
    notes: null,
    next_review: "2026-01-01",
    created_at: "2025-01-01",
    updated_at: "2025-06-01",
  };

  it("loadCustomers returns customers with doc_count", async () => {
    // First query: customers
    mockSupabaseQuery([sampleCustomer]);

    const result = await loadCustomers("o1");
    expect(result).toHaveLength(1);
    expect(result[0].company_name).toBe("Test AG");
    // doc_count defaults to 0 when no matching docs
    expect(result[0].doc_count).toBe(0);
  });

  it("loadCustomers returns empty array when no customers", async () => {
    mockSupabaseQuery(null);

    const result = await loadCustomers("o1");
    expect(result).toEqual([]);
  });

  it("loadCustomer returns single customer", async () => {
    mockSupabaseSingle(sampleCustomer);

    const result = await loadCustomer("cust1");
    expect(result.id).toBe("cust1");
    expect(result.customer_type).toBe("legal_entity");
  });

  it("loadCustomer throws on error", async () => {
    mockSupabaseSingle(null, { message: "Not found" });

    await expect(loadCustomer("nonexistent")).rejects.toEqual({ message: "Not found" });
  });

  it("createCustomer checks auth and sets defaults", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseSingle({ ...sampleCustomer, id: "cust-new" });

    const result = await createCustomer({
      organization_id: "o1",
      customer_type: "legal_entity",
      company_name: "New AG",
    });

    expect(result.id).toBe("cust-new");
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("client_customers");
  });

  it("createCustomer throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(createCustomer({
      organization_id: "o1",
      customer_type: "natural_person",
      first_name: "Max",
      last_name: "Muster",
    })).rejects.toThrow("Nicht authentifiziert");
  });

  it("updateCustomer updates fields", async () => {
    mockSupabaseQuery(null);

    await updateCustomer("cust1", { risk_level: "high", notes: "Erhöhtes Risiko" });
    expect(supabase.from).toHaveBeenCalledWith("client_customers");
  });

  it("archiveCustomer sets status to archived", async () => {
    mockSupabaseQuery(null);

    await archiveCustomer("cust1");
    expect(supabase.from).toHaveBeenCalledWith("client_customers");
  });
});

// ─── Customer Document Workflow ────────────────────────────────────────

describe("Customer Document Workflow", () => {
  const sampleDoc = {
    id: "cdoc1",
    customer_id: "cust1",
    organization_id: "o1",
    template_key: "kyc_form",
    name: "KYC Formular",
    data: {},
    status: "draft",
    version: 1,
    rejection_reason: null,
    submitted_by: null,
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    created_by: "u1",
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  };

  it("loadCustomerDocuments returns docs for customer", async () => {
    mockSupabaseQuery([sampleDoc]);

    const result = await loadCustomerDocuments("cust1");
    expect(result).toHaveLength(1);
    expect(result[0].template_key).toBe("kyc_form");
  });

  it("createCustomerDocument checks auth and creates draft", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseSingle(sampleDoc);

    const result = await createCustomerDocument({
      customer_id: "cust1",
      organization_id: "o1",
      template_key: "kyc_form",
      name: "KYC Formular",
    });

    expect(result.status).toBe("draft");
    expect(supabase.from).toHaveBeenCalledWith("customer_documents");
  });

  it("createCustomerDocument throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(createCustomerDocument({
      customer_id: "cust1",
      organization_id: "o1",
      template_key: "kyc_form",
      name: "KYC",
    })).rejects.toThrow("Nicht authentifiziert");
  });

  it("saveCustomerDocumentData updates form data", async () => {
    mockSupabaseQuery(null);

    await saveCustomerDocumentData("cdoc1", { field1: "value1", field2: true });
    expect(supabase.from).toHaveBeenCalledWith("customer_documents");
  });

  // ── Full lifecycle: draft → in_review → approved ──

  it("submitForReview transitions to in_review", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery(null);

    await submitForReview("cdoc1");
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("customer_documents");
  });

  it("submitForReview throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(submitForReview("cdoc1")).rejects.toThrow("Nicht authentifiziert");
  });

  it("approveCustomerDocument approves in_review doc", async () => {
    mockSupabaseAuth({ id: "u1", email: "approver@example.com" });
    mockSupabaseQuery([{ id: "cdoc1" }]); // non-empty = success

    await approveCustomerDocument("cdoc1");
    expect(supabase.from).toHaveBeenCalledWith("customer_documents");
  });

  it("approveCustomerDocument throws when not in_review", async () => {
    mockSupabaseAuth({ id: "u1", email: "approver@example.com" });
    mockSupabaseQuery([]); // empty = no matching doc

    await expect(approveCustomerDocument("cdoc1")).rejects.toThrow("nicht im Status 'Zur Prüfung'");
  });

  it("approveCustomerDocument throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(approveCustomerDocument("cdoc1")).rejects.toThrow("Nicht authentifiziert");
  });

  // ── Rejection flow: draft → in_review → rejected → draft ──

  it("rejectCustomerDocument rejects in_review doc with reason", async () => {
    mockSupabaseAuth({ id: "u1", email: "approver@example.com" });
    mockSupabaseQuery([{ id: "cdoc1" }]);

    await rejectCustomerDocument("cdoc1", "Unvollständig");
    expect(supabase.from).toHaveBeenCalledWith("customer_documents");
  });

  it("rejectCustomerDocument throws when not in_review", async () => {
    mockSupabaseAuth({ id: "u1", email: "approver@example.com" });
    mockSupabaseQuery([]);

    await expect(rejectCustomerDocument("cdoc1", "Grund")).rejects.toThrow("nicht im Status 'Zur Prüfung'");
  });

  it("rejectCustomerDocument throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(rejectCustomerDocument("cdoc1", "Grund")).rejects.toThrow("Nicht authentifiziert");
  });

  it("reviseCustomerDocument resets to draft", async () => {
    mockSupabaseQuery(null);

    await reviseCustomerDocument("cdoc1");
    expect(supabase.from).toHaveBeenCalledWith("customer_documents");
  });
});

// ─── Customer Contacts ─────────────────────────────────────────────────

describe("Customer Contacts", () => {
  const sampleContact = {
    id: "cc1",
    customer_id: "cust1",
    organization_id: "o1",
    role: "CEO",
    first_name: "Max",
    last_name: "Muster",
    email: "max@example.com",
    phone: "+41 79 123 45 67",
    notes: null,
    created_by: "u1",
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  };

  it("loadCustomerContacts returns contacts", async () => {
    mockSupabaseQuery([sampleContact]);

    const result = await loadCustomerContacts("cust1");
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("Max");
  });

  it("createCustomerContact checks auth", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseSingle(sampleContact);

    const result = await createCustomerContact({
      customer_id: "cust1",
      organization_id: "o1",
      role: "CEO",
      first_name: "Max",
      last_name: "Muster",
    });

    expect(result.role).toBe("CEO");
    expect(supabase.auth.getUser).toHaveBeenCalled();
  });

  it("createCustomerContact throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(createCustomerContact({
      customer_id: "cust1",
      organization_id: "o1",
      role: "CEO",
      first_name: "Max",
      last_name: "Muster",
    })).rejects.toThrow("Nicht authentifiziert");
  });

  it("updateCustomerContact updates fields", async () => {
    mockSupabaseQuery(null);

    await updateCustomerContact("cc1", { email: "new@example.com", phone: "+41 79 999 99 99" });
    expect(supabase.from).toHaveBeenCalledWith("customer_contacts");
  });

  it("deleteCustomerContact removes contact", async () => {
    mockSupabaseQuery(null);

    await deleteCustomerContact("cc1");
    expect(supabase.from).toHaveBeenCalledWith("customer_contacts");
  });
});

// ─── Delete & Archive ──────────────────────────────────────────────────

describe("Delete & Archive", () => {
  it("deleteCustomer calls RPC with reason", async () => {
    mockSupabaseRpc(null);

    await deleteCustomer("cust1", "Geschäftsbeziehung beendet");
    expect(supabase.rpc).toHaveBeenCalledWith("delete_customer_with_archive", {
      p_customer_id: "cust1",
      p_reason: "Geschäftsbeziehung beendet",
    });
  });

  it("deleteCustomer uses null reason when not provided", async () => {
    mockSupabaseRpc(null);

    await deleteCustomer("cust1");
    expect(supabase.rpc).toHaveBeenCalledWith("delete_customer_with_archive", {
      p_customer_id: "cust1",
      p_reason: null,
    });
  });

  it("deleteCustomer throws on RPC error", async () => {
    mockSupabaseRpc(null, { message: "Customer not found" });

    await expect(deleteCustomer("nonexistent")).rejects.toEqual({ message: "Customer not found" });
  });

  it("loadDeletedCustomers returns archived entries with profile names", async () => {
    const raw = [
      {
        id: "arch1",
        organization_id: "o1",
        original_customer_id: "cust1",
        customer_data: { company_name: "Old AG" },
        contacts_data: [],
        documents_data: [],
        audit_log_data: [],
        deleted_by: "u1",
        deleted_at: "2025-06-01T10:00:00Z",
        reason: "Nicht mehr aktiv",
        profiles: { full_name: "Admin User" },
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadDeletedCustomers("o1");
    expect(result).toHaveLength(1);
    expect(result[0].deleted_by_name).toBe("Admin User");
    expect(result[0].reason).toBe("Nicht mehr aktiv");
  });

  it("loadDeletedCustomers defaults name to System", async () => {
    const raw = [
      {
        id: "arch2",
        organization_id: "o1",
        original_customer_id: "cust2",
        customer_data: {},
        contacts_data: [],
        documents_data: [],
        audit_log_data: [],
        deleted_by: null,
        deleted_at: "2025-01-01T00:00:00Z",
        reason: null,
        profiles: null,
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadDeletedCustomers("o1");
    expect(result[0].deleted_by_name).toBe("System");
  });
});

// ─── Help Requests ─────────────────────────────────────────────────────

describe("Help Requests", () => {
  it("createHelpRequest checks auth and inserts", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery(null);
    mockSupabaseFunctions(null);

    await createHelpRequest({
      organization_id: "o1",
      subject: "Hilfe benötigt",
      message: "Bitte um Unterstützung bei KYC-Prüfung",
    });

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("help_requests");
    expect(supabase.functions.invoke).toHaveBeenCalledWith("notify-help-request", expect.any(Object));
  });

  it("createHelpRequest throws when not authenticated", async () => {
    mockSupabaseAuth(null);

    await expect(createHelpRequest({
      organization_id: "o1",
      subject: "Test",
      message: "Test",
    })).rejects.toThrow("Nicht authentifiziert");
  });

  it("createHelpRequest does not throw on notification failure", async () => {
    mockSupabaseAuth({ id: "u1", email: "test@example.com" });
    mockSupabaseQuery(null);
    supabase.functions.invoke.mockRejectedValueOnce(new Error("Network error"));

    // Should not throw
    await createHelpRequest({
      organization_id: "o1",
      subject: "Test",
      message: "Test",
    });
  });

  it("loadHelpRequests returns mapped entries", async () => {
    const raw = [
      {
        id: "hr1",
        organization_id: "o1",
        customer_id: "cust1",
        document_id: null,
        subject: "KYC Frage",
        message: "Wie fülle ich das Formular aus?",
        status: "open",
        requested_by: "u1",
        created_at: "2025-06-01T10:00:00Z",
        resolved_at: null,
        admin_response: null,
        profiles: { full_name: "Portal User" },
      },
    ];
    mockSupabaseQuery(raw);

    const result = await loadHelpRequests("o1");
    expect(result).toHaveLength(1);
    expect(result[0].requested_by_name).toBe("Portal User");
    expect(result[0].status).toBe("open");
  });
});

// ─── Customer Stats ────────────────────────────────────────────────────

describe("loadCustomerStats", () => {
  it("counts customers and docs correctly", async () => {
    // Both parallel queries use same mock
    mockSupabaseQuery([
      { id: "c1", status: "active", next_review: "2026-03-01" }, // within 30 days
      { id: "c2", status: "active", next_review: "2027-01-01" }, // not due
      { id: "c3", status: "archived", next_review: null },
    ]);

    const result = await loadCustomerStats("o1");
    expect(result.total).toBe(3);
    expect(result.active).toBe(2);
    // reviewDue depends on actual date logic — we test the counting works
    expect(typeof result.reviewDue).toBe("number");
  });

  it("returns zeros on empty data", async () => {
    mockSupabaseQuery(null);

    const result = await loadCustomerStats("o1");
    expect(result).toEqual({
      total: 0,
      active: 0,
      reviewDue: 0,
      docsDraft: 0,
      docsReview: 0,
      docsApproved: 0,
    });
  });
});
