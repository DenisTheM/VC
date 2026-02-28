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

  const { error } = await supabase
    .from("company_profiles")
    .upsert(
      {
        organization_id: organizationId,
        data: profileData,
        updated_at: now,
        updated_by: userId,
      },
      { onConflict: "organization_id" },
    );

  if (error) throw error;
  return now;
}

// ─── Organizations ─────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  industry: string | null;
  sro: string | null;
  country: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  created_at: string;
}

export async function loadOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, short_name, industry, sro, country, contact_name, contact_role, contact_email, created_at")
    .order("name");

  if (error) throw error;
  return (data ?? []) as Organization[];
}

export async function createOrganization(org: {
  name: string;
  short_name?: string;
  industry?: string;
  sro?: string;
  country?: string;
  contact_name?: string;
  contact_role?: string;
  contact_email?: string;
}): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .insert(org)
    .select("id, name, short_name, industry, sro, country, contact_name, contact_role, contact_email, created_at")
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(
  orgId: string,
  updates: { contact_email?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", orgId);

  if (error) throw error;
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
  // Validate required fields before publishing
  const missing: string[] = [];
  if (!updates.severity) missing.push("Schweregrad");
  if (!updates.category) missing.push("Kategorie");
  if (!updates.summary?.trim()) missing.push("Zusammenfassung");
  if (affectedClients.length === 0) missing.push("Betroffene Kunden");
  if (missing.length > 0) {
    throw new Error(`Pflichtfelder fehlen: ${missing.join(", ")}`);
  }

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

export async function loadActionCommentCounts(actionIds: string[]): Promise<Record<string, number>> {
  if (actionIds.length === 0) return {};
  const { data, error } = await supabase
    .from("action_comments")
    .select("action_id")
    .in("action_id", actionIds);

  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { action_id: string }) => {
    counts[row.action_id] = (counts[row.action_id] || 0) + 1;
  });
  return counts;
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

export async function updateDocumentContent(
  docId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ content, updated_at: new Date().toISOString() })
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

// ─── Approval Notification ──────────────────────────────────────────────

export async function notifyApproval(
  docId: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke("notify-approval", {
    body: { document_id: docId, organization_id: orgId },
  });

  if (error) {
    const msg = typeof error === "object" && "message" in error ? error.message : String(error);
    return { success: false, message: msg };
  }

  return {
    success: true,
    message: data?.message ?? "Benachrichtigung versendet.",
  };
}

// ─── Organization Members (Multi-User) ────────────────────────────────

export type OrgRole = "viewer" | "editor" | "approver";

export interface OrgMember {
  id: string;
  user_id: string;
  role: OrgRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export async function loadOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at, profiles(full_name)")
    .eq("organization_id", orgId)
    .order("created_at");

  if (error) throw error;

  // We need to look up emails via auth admin — but from client side we can't.
  // Instead we'll use the profiles table (full_name) and show user_id as fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role as OrgRole,
    full_name: m.profiles?.full_name ?? null,
    email: null, // email not available via profiles; shown as user_id in UI
    created_at: m.created_at,
  }));
}

export async function updateOrgMemberRole(
  memberId: string,
  newRole: OrgRole,
): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) throw error;
}

export async function removeOrgMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}

export async function addOrgMember(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: orgId,
      user_id: userId,
      role,
    });

  if (error) throw error;
}

export async function inviteMember(
  orgId: string,
  email: string,
  fullName: string,
  role: OrgRole,
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke("invite-member", {
    body: { email, full_name: fullName, org_id: orgId, role },
  });

  if (error) {
    // Supabase FunctionsHttpError wraps the actual response in error.context
    const ctx = (error as unknown as { context?: unknown }).context;
    const ctxError = typeof ctx === "object" && ctx !== null && "error" in ctx ? (ctx as { error: string }).error : null;
    const msg = ctxError || (typeof error === "object" && "message" in error ? error.message : String(error));
    return { success: false, message: msg };
  }

  if (data?.error) {
    return { success: false, message: data.error };
  }

  return {
    success: true,
    message: data?.message ?? "Einladung versendet.",
  };
}

// ─── Zefix (Handelsregister) ────────────────────────────────────────
// Re-exported from shared module for backwards compatibility
export { searchZefix, type ZefixResult, type ZefixResponse } from "@shared/lib/zefix";

// ─── Document Versions ──────────────────────────────────────────────

export interface DocVersion {
  id: string;
  version: string;
  name: string;
  content: string | null;
  created_at: string;
}

export async function loadDocumentVersions(docId: string): Promise<DocVersion[]> {
  const { data, error } = await supabase
    .from("document_versions")
    .select("id, version, name, content, created_at")
    .eq("document_id", docId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocVersion[];
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

// ─── Admin Messages ─────────────────────────────────────────────────

export async function sendClientMessage(
  organizationId: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; sent: number; message?: string }> {
  const { data, error } = await supabase.functions.invoke("send-client-message", {
    body: { organization_id: organizationId, subject, body },
  });

  if (error) {
    const msg = typeof error === "object" && "message" in error ? error.message : String(error);
    return { success: false, sent: 0, message: msg };
  }

  return {
    success: data?.success ?? true,
    sent: data?.sent ?? 0,
    message: data?.message,
  };
}

export async function loadAdminMessages(organizationId: string) {
  const { data, error } = await supabase
    .from("admin_messages")
    .select("id, subject, body, sent_by, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
