import { supabase } from "@shared/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  organization_id: string;
  customer_type: "natural_person" | "legal_entity";
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  company_name: string | null;
  uid_number: string | null;
  legal_form: string | null;
  legal_seat: string | null;
  purpose: string | null;
  address: string | null;
  risk_level: "low" | "standard" | "elevated" | "high";
  status: "active" | "inactive" | "archived";
  notes: string | null;
  next_review: string | null;
  zefix_data: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  doc_count?: number;
}

export interface CustomerDocument {
  id: string;
  customer_id: string;
  organization_id: string;
  template_key: string;
  name: string;
  data: Record<string, unknown>;
  status: "draft" | "in_review" | "approved" | "rejected" | "outdated";
  version: number;
  rejection_reason: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

export interface CustomerDocAuditEntry {
  id: string;
  document_id: string;
  customer_id: string;
  action: "created" | "updated" | "submitted" | "approved" | "rejected" | "outdated";
  old_status: string | null;
  new_status: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  details: string | null;
}

export interface CustomerAuditEntry {
  id: string;
  customer_id: string;
  action: "created" | "updated" | "status_changed" | "archived" | "deleted" | "contact_added" | "contact_updated" | "contact_removed";
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  details: string | null;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  organization_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeletedCustomerArchive {
  id: string;
  organization_id: string;
  original_customer_id: string;
  customer_data: Record<string, unknown>;
  contacts_data: Record<string, unknown>[];
  documents_data: Record<string, unknown>[];
  audit_log_data: Record<string, unknown>[];
  deleted_by: string | null;
  deleted_by_name: string | null;
  deleted_at: string;
  reason: string | null;
}

export interface HelpRequest {
  id: string;
  organization_id: string;
  customer_id: string | null;
  document_id: string | null;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  requested_by: string | null;
  requested_by_name: string | null;
  created_at: string;
  resolved_at: string | null;
  admin_response: string | null;
}

export interface CustomerStats {
  total: number;
  active: number;
  reviewDue: number;
  docsDraft: number;
  docsReview: number;
  docsApproved: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("de-CH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function customerDisplayName(c: { customer_type: string; first_name?: string | null; last_name?: string | null; company_name?: string | null }): string {
  if (c.customer_type === "natural_person") {
    return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unbekannt";
  }
  return c.company_name || "Unbekannt";
}

// ─── Customer CRUD ──────────────────────────────────────────────────

export async function loadCustomers(orgId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("client_customers")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Load doc counts per customer
  const customerIds = (data ?? []).map((c: { id: string }) => c.id);
  let docCounts: Record<string, number> = {};
  if (customerIds.length > 0) {
    const { data: docs } = await supabase
      .from("customer_documents")
      .select("customer_id")
      .in("customer_id", customerIds);

    (docs ?? []).forEach((d: { customer_id: string }) => {
      docCounts[d.customer_id] = (docCounts[d.customer_id] || 0) + 1;
    });
  }

  return (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    doc_count: docCounts[c.id as string] || 0,
  })) as Customer[];
}

export async function loadCustomer(customerId: string): Promise<Customer> {
  const { data, error } = await supabase
    .from("client_customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error) throw error;
  return data as Customer;
}

export async function createCustomer(input: {
  organization_id: string;
  customer_type: "natural_person" | "legal_entity";
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  nationality?: string;
  company_name?: string;
  uid_number?: string;
  legal_form?: string;
  legal_seat?: string;
  purpose?: string;
  address?: string;
  zefix_data?: Record<string, unknown>;
}): Promise<Customer> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("client_customers")
    .insert({
      ...input,
      risk_level: "standard",
      status: "active",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, "id" | "organization_id" | "created_by" | "created_at">>,
): Promise<void> {
  const { error } = await supabase
    .from("client_customers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function archiveCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from("client_customers")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// ─── Customer Documents ─────────────────────────────────────────────

export async function loadCustomerDocuments(customerId: string): Promise<CustomerDocument[]> {
  const { data, error } = await supabase
    .from("customer_documents")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CustomerDocument[];
}

export async function loadAllOrgCustomerDocs(orgId: string): Promise<CustomerDocument[]> {
  const { data, error } = await supabase
    .from("customer_documents")
    .select("*, client_customers(customer_type, first_name, last_name, company_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((d: any) => ({
    ...d,
    customer_name: d.client_customers ? customerDisplayName(d.client_customers) : undefined,
    client_customers: undefined,
  })) as CustomerDocument[];
}

export async function createCustomerDocument(input: {
  customer_id: string;
  organization_id: string;
  template_key: string;
  name: string;
}): Promise<CustomerDocument> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("customer_documents")
    .insert({
      ...input,
      data: {},
      status: "draft",
      version: 1,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CustomerDocument;
}

export async function saveCustomerDocumentData(
  docId: string,
  formData: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("customer_documents")
    .update({ data: formData, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw error;
}

export async function submitForReview(docId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { error } = await supabase
    .from("customer_documents")
    .update({
      status: "in_review",
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId);

  if (error) throw error;
}

export async function approveCustomerDocument(docId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("customer_documents")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("status", "in_review")
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Freigabe nicht möglich — Dokument ist nicht im Status 'Zur Prüfung'.");
  }
}

export async function rejectCustomerDocument(docId: string, reason: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("customer_documents")
    .update({
      status: "rejected",
      rejection_reason: reason,
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("status", "in_review")
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Ablehnung nicht möglich — Dokument ist nicht im Status 'Zur Prüfung'.");
  }
}

export async function reviseCustomerDocument(docId: string): Promise<void> {
  const { error } = await supabase
    .from("customer_documents")
    .update({
      status: "draft",
      rejection_reason: null,
      version: undefined, // will be incremented by trigger if needed
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId);

  if (error) throw error;
}

// ─── Audit Logs ─────────────────────────────────────────────────────

export async function loadCustomerDocAuditLog(docId: string): Promise<CustomerDocAuditEntry[]> {
  const { data, error } = await supabase
    .from("customer_document_audit_log")
    .select("id, document_id, customer_id, action, old_status, new_status, changed_by, changed_at, details, profiles:changed_by(full_name)")
    .eq("document_id", docId)
    .order("changed_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((e: any) => ({
    id: e.id,
    document_id: e.document_id,
    customer_id: e.customer_id,
    action: e.action,
    old_status: e.old_status,
    new_status: e.new_status,
    changed_by: e.changed_by,
    changed_by_name: e.profiles?.full_name ?? "System",
    changed_at: formatDate(e.changed_at),
    details: e.details,
  }));
}

export async function loadCustomerAuditLog(customerId: string): Promise<CustomerAuditEntry[]> {
  const { data, error } = await supabase
    .from("customer_audit_log")
    .select("id, customer_id, action, changed_by, changed_at, details, profiles:changed_by(full_name)")
    .eq("customer_id", customerId)
    .order("changed_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((e: any) => ({
    id: e.id,
    customer_id: e.customer_id,
    action: e.action,
    changed_by: e.changed_by,
    changed_by_name: e.profiles?.full_name ?? "System",
    changed_at: formatDate(e.changed_at),
    details: e.details,
  }));
}

// ─── Help Requests ──────────────────────────────────────────────────

export async function createHelpRequest(input: {
  organization_id: string;
  customer_id?: string;
  document_id?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { error } = await supabase
    .from("help_requests")
    .insert({
      ...input,
      requested_by: user.id,
    });

  if (error) throw error;

  // Trigger notification to admin (fire and forget)
  try {
    await supabase.functions.invoke("notify-help-request", {
      body: { organization_id: input.organization_id, subject: input.subject },
    });
  } catch {
    // Non-critical — help request already saved
  }
}

export async function loadHelpRequests(orgId: string): Promise<HelpRequest[]> {
  const { data, error } = await supabase
    .from("help_requests")
    .select("*, profiles:requested_by(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    organization_id: r.organization_id,
    customer_id: r.customer_id,
    document_id: r.document_id,
    subject: r.subject,
    message: r.message,
    status: r.status,
    requested_by: r.requested_by,
    requested_by_name: r.profiles?.full_name ?? "Unbekannt",
    created_at: formatDate(r.created_at),
    resolved_at: r.resolved_at ? formatDate(r.resolved_at) : null,
    admin_response: r.admin_response,
  }));
}

// ─── Customer Contacts ──────────────────────────────────────────────

export async function loadCustomerContacts(customerId: string): Promise<CustomerContact[]> {
  const { data, error } = await supabase
    .from("customer_contacts")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CustomerContact[];
}

export async function createCustomerContact(input: {
  customer_id: string;
  organization_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<CustomerContact> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("customer_contacts")
    .insert({ ...input, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data as CustomerContact;
}

export async function updateCustomerContact(
  id: string,
  updates: Partial<Pick<CustomerContact, "role" | "first_name" | "last_name" | "email" | "phone" | "notes">>,
): Promise<void> {
  const { error } = await supabase
    .from("customer_contacts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCustomerContact(id: string): Promise<void> {
  const { error } = await supabase
    .from("customer_contacts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Customer Delete ────────────────────────────────────────────────

export async function deleteCustomer(customerId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("delete_customer_with_archive", {
    p_customer_id: customerId,
    p_reason: reason || null,
  });

  if (error) throw error;
}

// ─── Deleted Customers Archive ──────────────────────────────────────

export async function loadDeletedCustomers(orgId: string): Promise<DeletedCustomerArchive[]> {
  const { data, error } = await supabase
    .from("deleted_customers_archive")
    .select("*, profiles:deleted_by(full_name)")
    .eq("organization_id", orgId)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((d: any) => ({
    id: d.id,
    organization_id: d.organization_id,
    original_customer_id: d.original_customer_id,
    customer_data: d.customer_data,
    contacts_data: d.contacts_data,
    documents_data: d.documents_data,
    audit_log_data: d.audit_log_data,
    deleted_by: d.deleted_by,
    deleted_by_name: d.profiles?.full_name ?? "System",
    deleted_at: formatDate(d.deleted_at),
    reason: d.reason,
  }));
}

// ─── Stats ──────────────────────────────────────────────────────────

export async function loadCustomerStats(orgId: string): Promise<CustomerStats> {
  const today = new Date().toISOString().split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [customersRes, docsRes] = await Promise.all([
    supabase
      .from("client_customers")
      .select("id, status, next_review")
      .eq("organization_id", orgId),
    supabase
      .from("customer_documents")
      .select("id, status")
      .eq("organization_id", orgId),
  ]);

  const customers = customersRes.data ?? [];
  const docs = docsRes.data ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = customers.filter((c: any) => c.status === "active").length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewDue = customers.filter((c: any) =>
    c.status === "active" && c.next_review && c.next_review <= in30Days,
  ).length;

  return {
    total: customers.length,
    active,
    reviewDue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    docsDraft: docs.filter((d: any) => d.status === "draft").length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    docsReview: docs.filter((d: any) => d.status === "in_review").length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    docsApproved: docs.filter((d: any) => d.status === "approved").length,
  };
}
