import { supabase } from "@shared/lib/supabase";
import { formatDate } from "@shared/lib/format";

// ─── Organization ───────────────────────────────────────────────────

export type OrgRole = "viewer" | "editor" | "approver";

export interface ClientOrg {
  id: string;
  name: string;
  short_name: string | null;
  industry: string | null;
  sro: string | null;
  contact_name: string | null;
  contact_salutation: string | null;
  userRole: OrgRole;
}

export async function loadUserOrganization(userId: string): Promise<ClientOrg | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, short_name, industry, sro, contact_name, contact_salutation)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.organizations) return null;
  const org = data.organizations as unknown as Omit<ClientOrg, "userRole">;
  return { ...org, userRole: (data.role as OrgRole) || "viewer" };
}

// ─── Client Profile ─────────────────────────────────────────────────

export async function loadClientProfile(orgId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("company_profiles")
    .select("data")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.data || typeof data.data !== "object") return null;
  return data.data as Record<string, unknown>;
}

// ─── Client Messages ────────────────────────────────────────────────

export interface ClientMessage {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

export async function loadClientMessages(orgId: string): Promise<ClientMessage[]> {
  const { data: messages, error } = await supabase
    .from("admin_messages")
    .select("id, subject, body, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  // Load read status for current user (RLS filters to auth.uid())
  const { data: reads, error: readsError } = await supabase
    .from("admin_message_reads")
    .select("message_id")
    .in("message_id", messages.map((m: { id: string }) => m.id));

  if (readsError) console.error("Failed to load read status:", readsError);

  const readSet = new Set((reads ?? []).map((r: { message_id: string }) => r.message_id));

  return messages.map((m: { id: string; subject: string; body: string; created_at: string }) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    created_at: m.created_at,
    is_read: readSet.has(m.id),
  }));
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("admin_message_reads")
    .upsert(
      { message_id: messageId, user_id: user.id },
      { onConflict: "message_id,user_id" },
    );

  if (error) console.error("Failed to mark message as read:", error);
}

// ─── Client Alerts ──────────────────────────────────────────────────

export interface PortalAlert {
  id: string;
  title: string;
  source: string;
  date: string;
  severity: "critical" | "high" | "medium" | "info";
  category: string;
  isNew: boolean;
  summary: string;
  impact: "high" | "medium" | "low" | "none";
  impactText: string;
  legalBasis: string;
  deadline: string;
  elenaComment: string;
  actions: { id: string; text: string; due: string; status: string }[];
  relatedDocs: { name: string; type: string; date: string }[];
  aiInterpretation?: {
    summary: string;
    impact_areas: string[];
    action_items: string[];
    affected_articles: string[];
    deadline?: string;
  } | null;
  interpretedAt?: string | null;
}

export async function loadClientAlerts(organizationId: string): Promise<PortalAlert[]> {
  const { data, error } = await supabase
    .from("alert_affected_clients")
    .select(`
      id,
      reason,
      risk,
      elena_comment,
      regulatory_alerts!inner(
        id, title, source, date, severity, status,
        category, summary, legal_basis, deadline,
        ai_interpretation, interpreted_at
      ),
      client_alert_actions(id, text, due, status),
      alert_related_documents(name, type, date)
    `)
    .eq("organization_id", organizationId)
    .neq("regulatory_alerts.status", "draft")
    .neq("regulatory_alerts.status", "dismissed")
    .order("created_at", { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const alert = row.regulatory_alerts;
    return {
      id: row.id,
      title: alert?.title ?? "",
      source: alert?.source ?? "",
      date: alert?.date ?? "",
      severity: alert?.severity ?? "info",
      category: alert?.category ?? "",
      isNew: alert?.status === "new",
      summary: alert?.summary ?? "",
      impact: row.risk ?? "medium",
      impactText: row.reason ?? "",
      legalBasis: alert?.legal_basis ?? "",
      deadline: alert?.deadline ?? "",
      elenaComment: row.elena_comment ?? "",
      actions: (row.client_alert_actions ?? []).map((a: any) => ({
        id: a.id,
        text: a.text,
        due: a.due ?? "",
        status: a.status ?? "offen",
      })),
      relatedDocs: (row.alert_related_documents ?? []).map((d: any) => ({
        name: d.name,
        type: d.type ?? "PDF",
        date: d.date ?? "",
      })),
      aiInterpretation: alert?.ai_interpretation ?? null,
      interpretedAt: alert?.interpreted_at ?? null,
    };
  });
}

export async function updateClientActionStatus(
  actionId: string,
  newStatus: "offen" | "in_arbeit" | "erledigt",
): Promise<void> {
  const { error } = await supabase
    .from("client_alert_actions")
    .update({ status: newStatus })
    .eq("id", actionId);

  if (error) throw error;

  // Log status change as comment for audit trail
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("action_comments").insert({
        action_id: actionId,
        user_id: user.id,
        text: `Status geändert auf „${newStatus}"`,
      });
    }
  } catch {
    // Non-critical — status update already saved
  }
}

// ─── Action Comments ─────────────────────────────────────────────────

export interface ActionComment {
  id: string;
  action_id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

export async function loadActionComments(actionId: string): Promise<ActionComment[]> {
  const { data, error } = await supabase
    .from("action_comments")
    .select("id, action_id, user_id, text, created_at, profiles:user_id(full_name)")
    .eq("action_id", actionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((c: any) => ({
    id: c.id,
    action_id: c.action_id,
    user_id: c.user_id,
    user_name: c.profiles?.full_name ?? "Unbekannt",
    text: c.text,
    created_at: c.created_at,
  }));
}

export async function addActionComment(actionId: string, text: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { error } = await supabase
    .from("action_comments")
    .insert({ action_id: actionId, user_id: user.id, text });

  if (error) throw error;
}

export async function deleteActionComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("action_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}

// ─── Client Documents ───────────────────────────────────────────────

export interface PortalDoc {
  id: string;
  category: string;
  docType: string;
  name: string;
  desc: string;
  version: string;
  status: "current" | "review" | "draft" | "outdated";
  updatedBy: string;
  updatedAt: string;
  approvedAt: string | null;
  nextReview: string | null;
  format: "DOCX" | "PDF" | "PPTX" | "XLSX";
  pages: number;
  legalBasis: string;
  alert: string | null;
  content: string | null;
}


export async function loadClientDocuments(organizationId: string): Promise<PortalDoc[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("category")
    .order("name");

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((doc: any) => ({
    id: doc.id,
    category: doc.category ?? doc.doc_type ?? "Allgemein",
    docType: doc.doc_type ?? "",
    name: doc.name,
    desc: doc.description ?? "",
    version: doc.version ?? "v1.0",
    status: doc.status ?? "draft",
    updatedBy: doc.updated_by_name ?? "Virtue Compliance",
    updatedAt: formatDate(doc.updated_at),
    format: (doc.format ?? "DOCX") as PortalDoc["format"],
    pages: doc.pages ?? 0,
    legalBasis: doc.legal_basis ?? "",
    alert: doc.alert_notice ?? null,
    content: doc.content ?? null,
    approvedAt: doc.approved_at ? formatDate(doc.approved_at) : null,
    nextReview: doc.next_review ?? null,
  }));
}

export async function approveDocument(docId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "current",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("status", "review")
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Freigabe nicht möglich — Dokument ist nicht im Status 'Review'.");
  }
}

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
    changedAt: formatDate(e.changed_at),
    changedBy: e.profiles?.full_name ?? "System",
    details: e.details,
  }));
}

// ─── Dashboard Stats ────────────────────────────────────────────────

export async function loadPortalStats(organizationId: string) {
  const [alertsRes, docsRes] = await Promise.all([
    supabase
      .from("alert_affected_clients")
      .select("id, risk, regulatory_alerts!inner(status)")
      .eq("organization_id", organizationId)
      .neq("regulatory_alerts.status", "draft")
      .neq("regulatory_alerts.status", "dismissed"),
    supabase
      .from("documents")
      .select("id, status")
      .eq("organization_id", organizationId),
  ]);

  const docs = docsRes.data ?? [];
  const alerts = alertsRes.data ?? [];

  return {
    totalAlerts: alerts.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newAlerts: alerts.filter((a: any) => a.regulatory_alerts?.status === "new").length,
    totalDocs: docs.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentDocs: docs.filter((d: any) => d.status === "current").length,
  };
}

// ─── KYC Onboarding ────────────────────────────────────────────────

export interface KycCase {
  id: string;
  case_type: string;
  status: string;
  form_data: Record<string, unknown>;
  risk_category: string | null;
  created_at: string;
  updated_at: string;
}

export async function loadKycCases(orgId: string): Promise<KycCase[]> {
  const { data, error } = await supabase
    .from("kyc_cases")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as KycCase[];
}

export async function createKycCase(
  orgId: string,
  caseType: "form_a" | "form_k",
): Promise<KycCase> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("kyc_cases")
    .insert({
      organization_id: orgId,
      case_type: caseType,
      status: "draft",
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as KycCase;
}

export async function updateKycCase(
  caseId: string,
  updates: { form_data?: Record<string, unknown>; status?: string; risk_category?: string },
): Promise<void> {
  const { error } = await supabase
    .from("kyc_cases")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", caseId);

  if (error) throw error;
}

// ─── MROS / SAR Reports ───────────────────────────────────────────

export interface SarReport {
  id: string;
  status: string;
  report_data: Record<string, unknown>;
  goaml_xml: string | null;
  submitted_at: string | null;
  reference_number: string | null;
  created_at: string;
}

export async function loadSarReports(orgId: string): Promise<SarReport[]> {
  const { data, error } = await supabase
    .from("sar_reports")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SarReport[];
}

export async function createSarReport(orgId: string): Promise<SarReport> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("sar_reports")
    .insert({
      organization_id: orgId,
      status: "draft",
      submitted_by: user?.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SarReport;
}

export async function updateSarReport(
  reportId: string,
  updates: { report_data?: Record<string, unknown>; goaml_xml?: string; status?: string },
): Promise<void> {
  const { error } = await supabase
    .from("sar_reports")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) throw error;
}

// ─── Compliance Checklist ──────────────────────────────────────────

export async function loadMyChecklist(orgId: string) {
  const [pkgRes, progressRes] = await Promise.all([
    supabase.from("sro_compliance_packages").select("*").order("sro"),
    supabase.from("organization_checklist_progress").select("*").eq("organization_id", orgId),
  ]);

  if (pkgRes.error) throw pkgRes.error;
  if (progressRes.error) throw progressRes.error;

  return {
    packages: pkgRes.data ?? [],
    progress: progressRes.data ?? [],
  };
}

export async function updateChecklistItem(
  orgId: string,
  packageId: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  // Load current progress
  const { data: existing } = await supabase
    .from("organization_checklist_progress")
    .select("checklist_status")
    .eq("organization_id", orgId)
    .eq("package_id", packageId)
    .maybeSingle();

  const status = (existing?.checklist_status as Record<string, boolean>) ?? {};
  status[itemId] = checked;

  const { error } = await supabase
    .from("organization_checklist_progress")
    .upsert(
      {
        organization_id: orgId,
        package_id: packageId,
        checklist_status: status,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "organization_id,package_id" },
    );

  if (error) throw error;
}

// ─── pKYC Monitoring ───────────────────────────────────────────────

export interface PkycTrigger {
  id: string;
  customer_id: string;
  trigger_type: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
  customer_name?: string;
}

export async function loadMyTriggers(orgId: string): Promise<PkycTrigger[]> {
  const { data, error } = await supabase
    .from("pkyc_triggers")
    .select("*, client_customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    customer_name: r.client_customers?.name ?? "Unbekannt",
  }));
}

export async function resolveTrigger(
  triggerId: string,
  status: "resolved" | "dismissed",
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("pkyc_triggers")
    .update({
      status,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", triggerId);

  if (error) throw error;
}

export async function updatePkycConfig(
  orgId: string,
  config: {
    sanctions_monitoring?: boolean;
    adverse_media_monitoring?: boolean;
    registry_monitoring?: boolean;
    review_cycle_months?: number;
    auto_screening_interval_days?: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from("pkyc_monitoring_config")
    .upsert(
      { organization_id: orgId, ...config, updated_at: new Date().toISOString() },
      { onConflict: "organization_id" },
    );

  if (error) throw error;
}

// ─── UBO / LETA ────────────────────────────────────────────────────

export interface UboEntry {
  id: string;
  name: string;
  birth_date: string | null;
  nationality: string | null;
  share_percent: number | null;
  control_type: string | null;
  leta_status: string;
  discrepancy_detected_at: string | null;
}

export async function loadUboDeclaration(orgId: string, customerId?: string): Promise<UboEntry[]> {
  let query = supabase
    .from("ubo_declarations")
    .select("*")
    .eq("organization_id", orgId);

  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: (d.ubo_data as unknown[])?.[0] && typeof d.ubo_data[0] === "object" ? (d.ubo_data[0] as Record<string, string>).name ?? "" : "",
    birth_date: d.ubo_data?.[0]?.birthDate ?? null,
    nationality: d.ubo_data?.[0]?.nationality ?? null,
    share_percent: d.ubo_data?.[0]?.share_percent ?? null,
    control_type: d.ubo_data?.[0]?.control_type ?? null,
    leta_status: d.leta_status ?? "not_checked",
    discrepancy_detected_at: d.leta_status === "discrepancy" ? d.updated_at : null,
  }));
}

export async function saveUboDeclaration(
  orgId: string,
  customerId: string | null,
  uboData: unknown[],
): Promise<void> {
  const { error } = await supabase
    .from("ubo_declarations")
    .upsert(
      {
        organization_id: orgId,
        customer_id: customerId,
        ubo_data: uboData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id" },
    );

  if (error) throw error;
}

// ─── E-Learning ────────────────────────────────────────────────────

export async function loadMyProgress(orgId: string) {
  const { data, error } = await supabase
    .from("elearning_progress")
    .select("*")
    .eq("organization_id", orgId);

  if (error) throw error;
  return data ?? [];
}

export async function updateElearningProgress(
  orgId: string,
  moduleId: string,
  updates: { status?: string; score?: number; completed_at?: string },
): Promise<void> {
  const { error } = await supabase
    .from("elearning_progress")
    .upsert(
      {
        organization_id: orgId,
        module_id: moduleId,
        ...updates,
        started_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,module_id" },
    );

  if (error) throw error;
}

// ─── Sanctions Screening ───────────────────────────────────────────

export async function triggerScreening(params: {
  customer_id: string;
  organization_id: string;
  name: string;
  date_of_birth?: string | null;
  nationality?: string | null;
  screening_type?: "sanctions" | "pep" | "adverse_media";
}): Promise<{ status: string; match_count: number; matches: unknown[] }> {
  const { data, error } = await supabase.functions.invoke("sanctions-screening", {
    body: params,
  });

  if (error) throw error;
  return data;
}

export async function loadCustomerScreenings(orgId: string, customerId?: string) {
  let query = supabase
    .from("screening_results")
    .select("*")
    .eq("organization_id", orgId)
    .order("screened_at", { ascending: false });

  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─── Document ↔ Alert Links ──────────────────────────────────────────

export interface LinkedAlert {
  id: string;
  title: string;
  severity: string;
  date: string;
}

export async function loadDocAlerts(docName: string, orgId: string): Promise<LinkedAlert[]> {
  const { data, error } = await supabase
    .from("alert_related_documents")
    .select(`
      alert_affected_clients!inner(
        id,
        organization_id,
        regulatory_alerts!inner(title, severity, date, status)
      )
    `)
    .eq("name", docName)
    .eq("alert_affected_clients.organization_id", orgId);

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? [])
    .filter((row: any) => {
      const status = row.alert_affected_clients?.regulatory_alerts?.status;
      return status && status !== "draft" && status !== "dismissed";
    })
    .map((row: any) => ({
      id: row.alert_affected_clients.id,
      title: row.alert_affected_clients.regulatory_alerts.title,
      severity: row.alert_affected_clients.regulatory_alerts.severity,
      date: row.alert_affected_clients.regulatory_alerts.date,
    }));
}
