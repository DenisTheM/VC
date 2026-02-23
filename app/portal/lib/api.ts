import { supabase } from "@shared/lib/supabase";

// ─── Organization ───────────────────────────────────────────────────

export interface ClientOrg {
  id: string;
  name: string;
  short_name: string | null;
  industry: string | null;
  sro: string | null;
}

export async function loadUserOrganization(userId: string): Promise<ClientOrg | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organizations(id, name, short_name, industry, sro)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.organizations) return null;
  return data.organizations as unknown as ClientOrg;
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
}

export async function loadClientAlerts(organizationId: string): Promise<PortalAlert[]> {
  const { data, error } = await supabase
    .from("alert_affected_clients")
    .select(`
      id,
      reason,
      risk,
      elena_comment,
      regulatory_alerts(
        id, title, source, date, severity, status,
        category, summary, legal_basis, deadline
      ),
      client_alert_actions(id, text, due, status),
      alert_related_documents(name, type, date)
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).filter((row: any) => {
    // Exclude draft and dismissed alerts from client portal
    const status = row.regulatory_alerts?.status;
    return status && status !== "draft" && status !== "dismissed";
  }).map((row: any) => {
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
    };
  });
}

export async function updateClientActionStatus(
  actionId: string,
  newStatus: "offen" | "erledigt",
): Promise<void> {
  const { error } = await supabase
    .from("client_alert_actions")
    .update({ status: newStatus })
    .eq("id", actionId);

  if (error) throw error;
}

// ─── Client Documents ───────────────────────────────────────────────

export interface PortalDoc {
  id: string;
  category: string;
  name: string;
  desc: string;
  version: string;
  status: "current" | "review" | "draft" | "outdated";
  updatedBy: string;
  updatedAt: string;
  approvedAt: string | null;
  format: "DOCX" | "PDF" | "PPTX" | "XLSX";
  pages: number;
  legalBasis: string;
  alert: string | null;
  content: string | null;
}

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

// ─── Dashboard Stats ────────────────────────────────────────────────

export async function loadPortalStats(organizationId: string) {
  const [alertsRes, docsRes] = await Promise.all([
    supabase
      .from("alert_affected_clients")
      .select("id, risk, regulatory_alerts!inner(status)")
      .eq("organization_id", organizationId),
    supabase
      .from("documents")
      .select("id, status")
      .eq("organization_id", organizationId),
  ]);

  const docs = docsRes.data ?? [];
  // Exclude draft and dismissed alerts from portal stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alerts = (alertsRes.data ?? []).filter((a: any) => {
    const status = a.regulatory_alerts?.status;
    return status && status !== "draft" && status !== "dismissed";
  });

  return {
    totalAlerts: alerts.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newAlerts: alerts.filter((a: any) => a.regulatory_alerts?.status === "new").length,
    totalDocs: docs.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentDocs: docs.filter((d: any) => d.status === "current").length,
  };
}
