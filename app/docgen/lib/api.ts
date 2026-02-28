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
  digest_opt_out: boolean;
  created_at: string;
}

export async function loadOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, short_name, industry, sro, country, contact_name, contact_role, contact_email, digest_opt_out, created_at")
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
    .select("id, name, short_name, industry, sro, country, contact_name, contact_role, contact_email, digest_opt_out, created_at")
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(
  orgId: string,
  updates: { contact_email?: string | null; digest_opt_out?: boolean },
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
  next_review: string | null;
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

export async function loadDocumentVersionCounts(docIds: string[]): Promise<Record<string, number>> {
  if (docIds.length === 0) return {};
  const { data, error } = await supabase
    .from("document_versions")
    .select("document_id")
    .in("document_id", docIds);

  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { document_id: string }) => {
    counts[row.document_id] = (counts[row.document_id] || 0) + 1;
  });
  return counts;
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

// ─── Document Review Date ────────────────────────────────────────────

export async function updateDocumentReviewDate(
  docId: string,
  nextReview: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ next_review: nextReview, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw error;
}

// ─── Company Profiles (Batch) ───────────────────────────────────────

export async function loadAllCompanyProfiles(): Promise<Map<string, Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("company_profiles")
    .select("organization_id, data");

  if (error) throw error;
  const map = new Map<string, Record<string, unknown>>();
  (data ?? []).forEach((row: { organization_id: string; data: unknown }) => {
    if (row.data && typeof row.data === "object") {
      map.set(row.organization_id, row.data as Record<string, unknown>);
    }
  });
  return map;
}

// ─── Audit Score ────────────────────────────────────────────────────

export interface OrgAuditData {
  orgId: string;
  documents: { doc_type: string; status: string; next_review: string | null }[];
  openActionCount: number;
  overdueActionCount: number;
}

export async function loadAllAuditData(): Promise<OrgAuditData[]> {
  // Batch-load documents and actions for all orgs
  const [docsRes, actionsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("organization_id, doc_type, status, next_review"),
    supabase
      .from("client_alert_actions")
      .select("status, due_date, alert_affected_clients!inner(organization_id)")
      .eq("status", "offen"),
  ]);

  if (docsRes.error) throw docsRes.error;
  if (actionsRes.error) throw actionsRes.error;

  // Group by org
  const orgDocs = new Map<string, { doc_type: string; status: string; next_review: string | null }[]>();
  for (const doc of docsRes.data ?? []) {
    const arr = orgDocs.get(doc.organization_id) ?? [];
    arr.push({ doc_type: doc.doc_type, status: doc.status, next_review: doc.next_review });
    orgDocs.set(doc.organization_id, arr);
  }

  const orgActions = new Map<string, { open: number; overdue: number }>();
  const today = new Date().toISOString().split("T")[0];
  for (const action of actionsRes.data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgId = (action as any).alert_affected_clients?.organization_id;
    if (!orgId) continue;
    const current = orgActions.get(orgId) ?? { open: 0, overdue: 0 };
    current.open++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((action as any).due_date && (action as any).due_date < today) current.overdue++;
    orgActions.set(orgId, current);
  }

  // Combine all org IDs
  const allOrgIds = new Set([...orgDocs.keys(), ...orgActions.keys()]);
  return [...allOrgIds].map((orgId) => ({
    orgId,
    documents: orgDocs.get(orgId) ?? [],
    openActionCount: orgActions.get(orgId)?.open ?? 0,
    overdueActionCount: orgActions.get(orgId)?.overdue ?? 0,
  }));
}

export async function cacheAuditScore(orgId: string, score: number, scoreData: unknown): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({
      audit_score: Math.round(score),
      audit_score_data: scoreData,
      audit_score_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) throw error;
}

// ─── Risk Scoring ──────────────────────────────────────────────────

export interface RiskScoringProfile {
  id: string;
  sro: string;
  name: string;
  weights: Record<string, number>;
  country_risk_map: Record<string, number>;
  created_at: string;
}

export async function loadRiskScoringProfiles(): Promise<RiskScoringProfile[]> {
  const { data, error } = await supabase
    .from("risk_scoring_profiles")
    .select("*")
    .order("sro");

  if (error) throw error;
  return (data ?? []) as RiskScoringProfile[];
}

export async function saveRiskScoringProfile(
  id: string,
  updates: { weights?: Record<string, number>; country_risk_map?: Record<string, number> },
): Promise<void> {
  const { error } = await supabase
    .from("risk_scoring_profiles")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export interface CustomerRiskScore {
  id: string;
  customer_id: string;
  organization_id: string;
  overall_score: number;
  risk_level: string;
  factors: Record<string, number>;
  calculated_at: string;
  customer_name?: string;
}

export async function loadCustomerRiskScores(orgId: string): Promise<CustomerRiskScore[]> {
  const { data, error } = await supabase
    .from("customer_risk_scores")
    .select("*, client_customers(name)")
    .eq("organization_id", orgId)
    .order("overall_score", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    customer_name: r.client_customers?.name ?? "Unbekannt",
  }));
}

// ─── Sanctions Screening ───────────────────────────────────────────

export interface ScreeningResult {
  id: string;
  customer_id: string;
  organization_id: string;
  screening_type: string;
  query_name: string;
  status: string;
  matches: unknown[];
  screened_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  customer_name?: string;
}

export async function loadScreeningResults(orgId?: string): Promise<ScreeningResult[]> {
  let query = supabase
    .from("screening_results")
    .select("*, client_customers(name)")
    .order("screened_at", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    customer_name: r.client_customers?.name ?? "Unbekannt",
  }));
}

export async function saveScreeningReview(
  resultId: string,
  updates: { status: string; notes?: string },
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("screening_results")
    .update({
      status: updates.status,
      notes: updates.notes ?? null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", resultId);

  if (error) throw error;
}

// ─── KYC Cases ─────────────────────────────────────────────────────

export interface KycCase {
  id: string;
  organization_id: string;
  customer_id: string | null;
  case_type: string;
  status: string;
  form_data: Record<string, unknown>;
  risk_category: string | null;
  created_at: string;
  org_name?: string;
}

export async function loadKycCases(orgId?: string): Promise<KycCase[]> {
  let query = supabase
    .from("kyc_cases")
    .select("*, organizations(name)")
    .order("created_at", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    org_name: r.organizations?.name ?? "Unbekannt",
  }));
}

// ─── SAR Reports ───────────────────────────────────────────────────

export interface SarReportSummary {
  id: string;
  organization_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  reference_number: string | null;
  org_name?: string;
}

export async function loadSarReports(orgId?: string): Promise<SarReportSummary[]> {
  let query = supabase
    .from("sar_reports")
    .select("id, organization_id, status, created_at, submitted_at, reference_number, organizations(name)")
    .order("created_at", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    org_name: r.organizations?.name ?? "Unbekannt",
  }));
}

// ─── SRO Compliance Packages ───────────────────────────────────────

export interface SroPackage {
  id: string;
  sro: string;
  name: string;
  description: string | null;
  checklist: { id: string; text: string; category: string; required: boolean }[];
  document_templates: string[];
  review_cycle_months: number;
}

export async function loadSroPackages(): Promise<SroPackage[]> {
  const { data, error } = await supabase
    .from("sro_compliance_packages")
    .select("*")
    .order("sro");

  if (error) throw error;
  return (data ?? []) as SroPackage[];
}

export async function loadChecklistProgress(orgId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("organization_checklist_progress")
    .select("checklist_status")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return (data?.checklist_status as Record<string, boolean>) ?? {};
}

// ─── pKYC Triggers ─────────────────────────────────────────────────

export interface PkycTrigger {
  id: string;
  customer_id: string;
  organization_id: string;
  trigger_type: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
  customer_name?: string;
  org_name?: string;
}

export async function loadPkycTriggers(orgId?: string): Promise<PkycTrigger[]> {
  let query = supabase
    .from("pkyc_triggers")
    .select("*, client_customers(name), organizations(name)")
    .order("created_at", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    customer_name: r.client_customers?.name ?? "Unbekannt",
    org_name: r.organizations?.name ?? "Unbekannt",
  }));
}

export async function loadPkycConfig(orgId: string) {
  const { data, error } = await supabase
    .from("pkyc_monitoring_config")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ─── UBO / LETA ────────────────────────────────────────────────────

export interface UboDeclaration {
  id: string;
  customer_id: string;
  organization_id: string;
  ubo_data: unknown[];
  leta_status: string;
  leta_check_date: string | null;
  created_at: string;
  customer_name?: string;
  org_name?: string;
}

export async function loadUboDeclarations(orgId?: string): Promise<UboDeclaration[]> {
  let query = supabase
    .from("ubo_declarations")
    .select("*, client_customers(name), organizations(name)")
    .order("created_at", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    customer_name: r.client_customers?.name ?? "Unbekannt",
    org_name: r.organizations?.name ?? "Unbekannt",
  }));
}

// ─── Training / E-Learning ─────────────────────────────────────────

export interface TrainingStatus {
  user_id: string;
  user_name: string;
  organization_id: string;
  org_name: string;
  module_id: string;
  module_title: string;
  status: string;
  score: number | null;
  completed_at: string | null;
}

export async function loadTrainingStatus(orgId?: string): Promise<TrainingStatus[]> {
  let query = supabase
    .from("elearning_progress")
    .select("*, elearning_modules(title), organizations(name), profiles:user_id(full_name)")
    .order("completed_at", { ascending: false });

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    user_id: r.user_id,
    user_name: r.profiles?.full_name ?? "Unbekannt",
    organization_id: r.organization_id,
    org_name: r.organizations?.name ?? "Unbekannt",
    module_id: r.module_id,
    module_title: r.elearning_modules?.title ?? "Unbekannt",
    status: r.status,
    score: r.score,
    completed_at: r.completed_at,
  }));
}

export async function loadElearningModules() {
  const { data, error } = await supabase
    .from("elearning_modules")
    .select("id, title, description, category, duration_minutes, passing_score")
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}

// ─── AI Regulatory Interpretation ──────────────────────────────────

export async function triggerInterpretation(alertId: string, orgId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("interpret-regulation", {
    body: { alert_id: alertId, organization_id: orgId },
  });

  if (error) throw error;
}

export async function loadInterpretation(alertId: string) {
  const { data, error } = await supabase
    .from("regulatory_alerts")
    .select("ai_interpretation, interpretation_model, interpreted_at")
    .eq("id", alertId)
    .single();

  if (error) throw error;
  return data;
}

// ─── Dashboard Stats ───────────────────────────────────────────────

export async function loadDashboardStats() {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [docsRes, activeAlertsRes, draftAlertsRes, expiringRes] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("regulatory_alerts")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "acknowledged", "in_progress", "resolved"]),
    supabase
      .from("regulatory_alerts")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "current")
      .not("next_review", "is", null)
      .lte("next_review", thirtyDaysFromNow),
  ]);

  return {
    documentCount: docsRes.count ?? 0,
    alertCount: activeAlertsRes.count ?? 0,
    draftAlertCount: draftAlertsRes.count ?? 0,
    expiringDocCount: expiringRes.count ?? 0,
  };
}
