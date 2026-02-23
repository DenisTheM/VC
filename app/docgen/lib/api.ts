import { supabase } from "@shared/lib/supabase";

// ─── Company Profile ───────────────────────────────────────────────

/** Get or create a company profile for an organization */
export async function loadCompanyProfile(organizationId: string) {
  const { data, error } = await supabase
    .from("company_profiles")
    .select("id, data, completed, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveCompanyProfile(
  organizationId: string,
  profileData: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const now = new Date().toISOString();
  // Upsert: update if exists, insert if not
  const existing = await loadCompanyProfile(organizationId);

  if (existing) {
    const { error } = await supabase
      .from("company_profiles")
      .update({
        data: profileData,
        updated_at: now,
        updated_by: userId,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("company_profiles").insert({
      organization_id: organizationId,
      data: profileData,
      updated_by: userId,
    });
    if (error) throw error;
  }
  return now;
}

// ─── Organizations ─────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  industry: string | null;
  sro: string | null;
  contact_name: string | null;
  contact_role: string | null;
  created_at: string;
}

export async function loadOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, short_name, industry, sro, contact_name, contact_role, created_at")
    .order("name");

  if (error) throw error;
  return (data ?? []) as Organization[];
}

export async function createOrganization(org: {
  name: string;
  short_name?: string;
  industry?: string;
  sro?: string;
  contact_name?: string;
  contact_role?: string;
}): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .insert(org)
    .select("id, name, short_name, industry, sro, contact_name, contact_role, created_at")
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function deleteOrganization(orgId: string): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (error) throw error;
}

// ─── Regulatory Alerts ─────────────────────────────────────────────

export interface DbAlert {
  id: string;
  title: string;
  source: string | null;
  jurisdiction: string;
  date: string | null;
  severity: "critical" | "high" | "medium" | "info";
  status: "draft" | "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed";
  category: string | null;
  summary: string | null;
  legal_basis: string | null;
  deadline: string | null;
  elena_comment: string | null;
  action_items: DbActionItem[];
  affected_clients: DbAffectedClient[];
  // AI-prepared fields (for drafts)
  feed_entry_id: string | null;
  auto_summary: string | null;
  ai_legal_basis: string | null;
  ai_severity: string | null;
  ai_category: string | null;
  ai_comment: string | null;
  source_url: string | null;
}

export interface DbActionItem {
  id: string;
  text: string;
  priority: string;
  due: string | null;
  status: string;
}

export interface DbAffectedClient {
  id: string;
  organization_id: string;
  reason: string | null;
  risk: string;
  elena_comment: string | null;
  organizations: { name: string } | null;
  // AI-prepared fields (for drafts)
  ai_risk: string | null;
  ai_reason: string | null;
  ai_elena_comment: string | null;
  // Notification tracking
  notified_at: string | null;
  notification_status: "sent" | "partial" | "failed" | null;
}

export async function loadAlerts(): Promise<DbAlert[]> {
  const { data, error } = await supabase
    .from("regulatory_alerts")
    .select(`
      *,
      action_items:alert_action_items(*),
      affected_clients:alert_affected_clients(*, organizations(name))
    `)
    .in("status", ["new", "acknowledged", "in_progress", "resolved"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbAlert[];
}

// ─── Draft & Dismissed Alert Management ───────────────────────────────────

export async function loadDraftAlerts(): Promise<DbAlert[]> {
  const { data, error } = await supabase
    .from("regulatory_alerts")
    .select(`
      *,
      action_items:alert_action_items(*),
      affected_clients:alert_affected_clients(*, organizations(name))
    `)
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbAlert[];
}

export async function loadDismissedAlerts(): Promise<DbAlert[]> {
  const { data, error } = await supabase
    .from("regulatory_alerts")
    .select(`
      *,
      action_items:alert_action_items(*),
      affected_clients:alert_affected_clients(*, organizations(name))
    `)
    .eq("status", "dismissed")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbAlert[];
}

export async function saveDraftAlert(
  alertId: string,
  updates: {
    severity?: string;
    category?: string;
    legal_basis?: string;
    deadline?: string;
    elena_comment?: string;
    summary?: string;
    jurisdiction?: string;
  },
  affectedClients: {
    id?: string;
    organization_id: string;
    risk: string;
    reason: string;
    elena_comment: string;
  }[],
): Promise<void> {
  // Update the alert itself
  const { error: alertErr } = await supabase
    .from("regulatory_alerts")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (alertErr) throw alertErr;

  // Delete existing affected clients and re-insert
  const { error: delErr } = await supabase
    .from("alert_affected_clients")
    .delete()
    .eq("alert_id", alertId);

  if (delErr) throw delErr;

  if (affectedClients.length > 0) {
    const rows = affectedClients.map((c) => ({
      alert_id: alertId,
      organization_id: c.organization_id,
      risk: c.risk,
      reason: c.reason,
      elena_comment: c.elena_comment,
      ai_risk: c.risk,
      ai_reason: c.reason,
      ai_elena_comment: c.elena_comment,
    }));

    const { error: insErr } = await supabase
      .from("alert_affected_clients")
      .insert(rows);

    if (insErr) throw insErr;
  }
}

export async function publishAlert(
  alertId: string,
  updates: {
    severity: string;
    category: string;
    legal_basis: string;
    deadline: string;
    elena_comment: string;
    summary: string;
  },
  affectedClients: {
    organization_id: string;
    risk: string;
    reason: string;
    elena_comment: string;
  }[],
): Promise<{ sent: number; errors: number } | undefined> {
  // Update alert to 'new' status with final values
  const { error: alertErr } = await supabase
    .from("regulatory_alerts")
    .update({
      ...updates,
      status: "new",
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (alertErr) throw alertErr;

  // Replace affected clients with final values
  const { error: delErr } = await supabase
    .from("alert_affected_clients")
    .delete()
    .eq("alert_id", alertId);

  if (delErr) throw delErr;

  if (affectedClients.length > 0) {
    const rows = affectedClients.map((c) => ({
      alert_id: alertId,
      organization_id: c.organization_id,
      risk: c.risk,
      reason: c.reason,
      elena_comment: c.elena_comment,
    }));

    const { error: insErr } = await supabase
      .from("alert_affected_clients")
      .insert(rows);

    if (insErr) throw insErr;
  }

  // Trigger email notification via Edge Function
  let emailResult: { sent: number; errors: number } | undefined;
  try {
    const { data } = await supabase.functions.invoke("notify-alert", {
      body: { alert_id: alertId },
    });
    emailResult = data as { sent: number; errors: number };
  } catch (notifyErr) {
    console.error("Failed to send alert notifications:", notifyErr);
    // Don't throw — the alert is already published
  }
  return emailResult;
}

export async function dismissAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from("regulatory_alerts")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) throw error;
}

export async function restoreAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from("regulatory_alerts")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) throw error;
}

// ─── Alert CRUD ─────────────────────────────────────────────────────

export async function createAlert(data: {
  title: string;
  source?: string;
  jurisdiction?: string;
  date?: string;
  severity?: string;
  category?: string;
  summary?: string;
  legal_basis?: string;
  deadline?: string;
  elena_comment?: string;
}): Promise<DbAlert> {
  const row = {
    ...data,
    status: "draft" as const,
    jurisdiction: data.jurisdiction || "CH",
    severity: data.severity || "medium",
  };

  // Step 1: Insert and get all columns back (no joins — they fail on insert)
  const { data: inserted, error: insertErr } = await supabase
    .from("regulatory_alerts")
    .insert(row)
    .select("*")
    .single();

  if (insertErr) throw insertErr;

  // Return with empty relations (new alert has none yet)
  return { ...inserted, action_items: [], affected_clients: [] } as unknown as DbAlert;
}

export async function updateAlertStatus(
  alertId: string,
  newStatus: "new" | "acknowledged" | "in_progress" | "resolved" | "draft",
): Promise<void> {
  const { error } = await supabase
    .from("regulatory_alerts")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) throw error;
}

// ─── Action Items ───────────────────────────────────────────────────

export async function addActionItem(
  alertId: string,
  item: { text: string; priority?: string; due?: string },
): Promise<DbActionItem> {
  const { data, error } = await supabase
    .from("alert_action_items")
    .insert({
      alert_id: alertId,
      text: item.text,
      priority: item.priority || "medium",
      due: item.due || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbActionItem;
}

export async function updateActionItem(
  itemId: string,
  updates: { status?: string; text?: string; priority?: string; due?: string },
): Promise<void> {
  const { error } = await supabase
    .from("alert_action_items")
    .update(updates)
    .eq("id", itemId);

  if (error) throw error;
}

export async function deleteActionItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("alert_action_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}

// ─── Client Actions (Admin View) ────────────────────────────────────

export interface ClientActionGroup {
  affectedClientId: string;
  orgName: string;
  actions: { id: string; text: string; due: string | null; status: string }[];
}

export async function loadClientActionsForAlert(
  alertId: string,
): Promise<ClientActionGroup[]> {
  const { data, error } = await supabase
    .from("alert_affected_clients")
    .select(`
      id,
      organizations(name),
      client_alert_actions(id, text, due, status)
    `)
    .eq("alert_id", alertId);

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    affectedClientId: row.id,
    orgName: row.organizations?.name ?? "Unbekannt",
    actions: (row.client_alert_actions ?? []).map((a: any) => ({
      id: a.id,
      text: a.text,
      due: a.due,
      status: a.status,
    })),
  }));
}

export async function addClientAction(
  affectedClientId: string,
  action: { text: string; due?: string; due_date?: string },
): Promise<void> {
  const { error } = await supabase
    .from("client_alert_actions")
    .insert({
      alert_affected_client_id: affectedClientId,
      text: action.text,
      due: action.due || null,
      due_date: action.due_date || null,
      status: "offen",
    });

  if (error) throw error;
}

export async function updateClientAction(
  actionId: string,
  updates: { status?: string; text?: string; due?: string },
): Promise<void> {
  const { error } = await supabase
    .from("client_alert_actions")
    .update(updates)
    .eq("id", actionId);

  if (error) throw error;
}

// ─── Documents ─────────────────────────────────────────────────────

export interface DbDocument {
  id: string;
  organization_id: string;
  doc_type: string;
  name: string;
  content: string | null;
  jurisdiction: string;
  version: string;
  status: "draft" | "review" | "current" | "outdated";
  format: string;
  pages: number | null;
  legal_basis: string | null;
  wizard_answers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  organizations?: { name: string; short_name: string | null } | null;
}

export async function loadDocuments(): Promise<DbDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*, organizations(name, short_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbDocument[];
}

export async function loadDocumentsByOrg(organizationId: string): Promise<DbDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*, organizations(name, short_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbDocument[];
}

export async function loadDocCountsByOrg(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("documents")
    .select("organization_id");

  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { organization_id: string }) => {
    counts[row.organization_id] = (counts[row.organization_id] || 0) + 1;
  });
  return counts;
}

export async function updateDocumentStatus(
  docId: string,
  newStatus: "draft" | "review" | "current" | "outdated",
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw error;
}

export async function bulkUpdateDocumentStatus(
  docIds: string[],
  newStatus: "draft" | "review" | "current" | "outdated",
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in("id", docIds);

  if (error) throw error;
}

// ─── Zefix (Handelsregister) ────────────────────────────────────────

export interface ZefixResult {
  name: string;
  uid: string;
  legalForm: string;
  legalSeat: string;
  address: string;
  foundingYear: number | null;
  purpose: string | null;
}

export interface ZefixResponse {
  results: ZefixResult[];
  hint: string | null;
}

export async function searchZefix(query: string): Promise<ZefixResponse> {
  const { data, error } = await supabase.functions.invoke("zefix-lookup", {
    body: { query },
  });

  if (error) {
    console.error("Zefix lookup failed:", error);
    return { results: [], hint: "Zefix-Abfrage fehlgeschlagen." };
  }

  return data as ZefixResponse;
}

// ─── Document Audit Log ─────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  action: "created" | "updated" | "status_changed" | "approved";
  oldStatus: string | null;
  newStatus: string | null;
  changedAt: string;
  changedBy: string;
  details: string | null;
}

function formatAuditDate(dateStr: string): string {
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

export async function loadDocumentAuditLog(docId: string): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("document_audit_log")
    .select("id, action, old_status, new_status, changed_by, changed_at, details, profiles:changed_by(full_name)")
    .eq("document_id", docId)
    .order("changed_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((e: any) => ({
    id: e.id,
    action: e.action,
    oldStatus: e.old_status,
    newStatus: e.new_status,
    changedAt: formatAuditDate(e.changed_at),
    changedBy: e.profiles?.full_name ?? "System",
    details: e.details,
  }));
}

// ─── Notification Tracking ─────────────────────────────────────────

export interface NotificationLogEntry {
  id: string;
  organization_id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: "sent" | "failed";
  error_message: string | null;
  sent_at: string;
  org_name?: string;
}

export async function loadNotificationLog(alertId: string): Promise<NotificationLogEntry[]> {
  const { data, error } = await supabase
    .from("alert_notification_log")
    .select("*, organizations(name)")
    .eq("alert_id", alertId)
    .order("sent_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((e: any) => ({
    id: e.id,
    organization_id: e.organization_id,
    recipient_email: e.recipient_email,
    recipient_name: e.recipient_name,
    status: e.status,
    error_message: e.error_message,
    sent_at: e.sent_at,
    org_name: e.organizations?.name ?? "Unbekannt",
  }));
}

export async function resendAlertNotification(alertId: string): Promise<{ sent: number; errors: number }> {
  const { data, error } = await supabase.functions.invoke("notify-alert", {
    body: { alert_id: alertId },
  });

  if (error) throw error;
  return data as { sent: number; errors: number };
}

// ─── Dashboard Stats ───────────────────────────────────────────────

export async function loadDashboardStats() {
  const [docsRes, activeAlertsRes, draftAlertsRes] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("regulatory_alerts")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "acknowledged", "in_progress", "resolved"]),
    supabase
      .from("regulatory_alerts")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
  ]);

  return {
    documentCount: docsRes.count ?? 0,
    alertCount: activeAlertsRes.count ?? 0,
    draftAlertCount: draftAlertsRes.count ?? 0,
  };
}
