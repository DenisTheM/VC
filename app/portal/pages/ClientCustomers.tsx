import { useState, useEffect, useCallback } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { Field } from "@shared/components/Field";
import { SectionLabel } from "@shared/components/SectionLabel";
import { useAuthContext } from "@shared/components/AuthContext";
import { searchZefix, type ZefixResult } from "@shared/lib/zefix";
import { exportCustomerDocumentAsPdf } from "@shared/lib/pdfExport";
import type { ClientOrg } from "../lib/api";
import {
  loadCustomers, loadCustomer, createCustomer, updateCustomer, archiveCustomer,
  loadCustomerDocuments, createCustomerDocument, saveCustomerDocumentData,
  submitForReview, approveCustomerDocument, rejectCustomerDocument, reviseCustomerDocument,
  loadCustomerDocAuditLog, loadCustomerAuditLog,
  type Customer, type CustomerDocument, type CustomerDocAuditEntry, type CustomerAuditEntry,
} from "../lib/customerApi";
import { CUSTOMER_DOC_STATUS, RISK_LEVEL, CUSTOMER_STATUS, CUSTOMER_TYPE } from "../data/statusConfig";
import { CUSTOMER_TEMPLATES, getTemplatesForType, type CustomerTemplate } from "../data/customerTemplates";

// ─── Props ──────────────────────────────────────────────────────────

interface Props {
  org: ClientOrg | null;
  onNav: (id: string) => void;
}

type SubView =
  | { view: "list" }
  | { view: "detail"; customerId: string }
  | { view: "document"; customerId: string; docId: string };

// ─── Helpers ────────────────────────────────────────────────────────

function customerName(c: Customer): string {
  return c.customer_type === "natural_person"
    ? [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unbekannt"
    : c.company_name || "Unbekannt";
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
      background: bg, color, fontFamily: T.sans, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function canEdit(role?: string) { return role === "editor" || role === "approver"; }
function canApprove(role?: string) { return role === "approver"; }

// =================================================================
//  Main Component
// =================================================================

export function ClientCustomers({ org, onNav }: Props) {
  const { profile: authProfile } = useAuthContext();
  const [subView, setSubView] = useState<SubView>({ view: "list" });
  const role = org?.userRole;

  if (!org) {
    return <div style={{ padding: "40px 48px", color: T.ink3, fontFamily: T.sans }}>Organisation wird geladen...</div>;
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1000, fontFamily: T.sans }}>
      {subView.view === "list" && (
        <CustomerList org={org} role={role} onSelect={(id) => setSubView({ view: "detail", customerId: id })} />
      )}
      {subView.view === "detail" && (
        <CustomerDetail
          org={org}
          role={role}
          customerId={subView.customerId}
          onBack={() => setSubView({ view: "list" })}
          onOpenDoc={(docId) => setSubView({ view: "document", customerId: subView.customerId, docId })}
        />
      )}
      {subView.view === "document" && (
        <DocumentForm
          org={org}
          role={role}
          docId={subView.docId}
          customerId={subView.customerId}
          onBack={() => setSubView({ view: "detail", customerId: subView.customerId })}
        />
      )}
    </div>
  );
}

// =================================================================
//  Sub-View 1: Customer List
// =================================================================

function CustomerList({ org, role, onSelect }: { org: ClientOrg; role?: string; onSelect: (id: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    loadCustomers(org.id)
      .then(setCustomers)
      .catch((err) => console.error("Load customers:", err))
      .finally(() => setLoading(false));
  }, [org.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) => {
    const name = customerName(c).toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !(c.uid_number ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterRisk !== "all" && c.risk_level !== filterRisk) return false;
    if (filterType !== "all" && c.customer_type !== filterType) return false;
    return true;
  });

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center", color: T.ink3 }}>Kunden werden geladen...</div>;
  }

  return (
    <>
      <SectionLabel text="Kundenportal" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Kunden</h1>
          <p style={{ fontSize: 15, color: T.ink3, margin: 0 }}>
            Endkunden-Verwaltung und Compliance-Dokumentation
          </p>
        </div>
        {canEdit(role) && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
              background: T.accent, color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
            }}
          >
            <Icon d={icons.plus} size={15} color="#fff" />
            Neuer Kunde
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche nach Name oder UID..."
          style={{
            flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 8,
            border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, outline: "none",
          }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={filterStyle}>
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option value="archived">Archiviert</option>
        </select>
        <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} style={filterStyle}>
          <option value="all">Alle Risikostufen</option>
          <option value="low">Niedrig</option>
          <option value="standard">Standard</option>
          <option value="elevated">Erhöht</option>
          <option value="high">Hoch</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={filterStyle}>
          <option value="all">Alle Typen</option>
          <option value="natural_person">Natürliche Person</option>
          <option value="legal_entity">Juristische Person</option>
        </select>
      </div>

      {/* Customer Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.ink3, fontSize: 14 }}>
          {customers.length === 0 ? "Noch keine Kunden erfasst." : "Keine Kunden gefunden."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((c) => {
            const risk = RISK_LEVEL[c.risk_level] ?? RISK_LEVEL.standard;
            const status = CUSTOMER_STATUS[c.status] ?? CUSTOMER_STATUS.active;
            const type = CUSTOMER_TYPE[c.customer_type];
            const reviewSoon = c.next_review && new Date(c.next_review) <= new Date(Date.now() + 30 * 86400000);
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                style={{
                  background: "#fff", borderRadius: T.rLg, padding: "18px 20px",
                  border: `1px solid ${T.border}`, boxShadow: T.shSm, cursor: "pointer",
                  transition: "box-shadow 0.15s, transform 0.15s",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Badge label={type.short} bg={T.s2} color={T.ink3} />
                  <Badge label={risk.label} bg={risk.bg} color={risk.color} />
                  <Badge label={status.label} bg={status.bg} color={status.color} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6, lineHeight: 1.3 }}>
                  {customerName(c)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.ink4 }}>
                  <span>{c.doc_count || 0} Dokument{(c.doc_count || 0) !== 1 ? "e" : ""}</span>
                  {c.next_review && (
                    <span style={{ color: reviewSoon ? "#d97706" : T.ink4 }}>
                      {reviewSoon ? "Prüfung fällig" : `Prüfung: ${c.next_review}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateCustomerModal
          org={org}
          onClose={() => setShowCreate(false)}
          onCreate={() => { setShowCreate(false); load(); }}
        />
      )}
    </>
  );
}

const filterStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: T.sans, cursor: "pointer", background: "#fff",
};

// =================================================================
//  Create Customer Modal
// =================================================================

function CreateCustomerModal({ org, onClose, onCreate }: { org: ClientOrg; onClose: () => void; onCreate: () => void }) {
  const [step, setStep] = useState<"type" | "form">("type");
  const [customerType, setCustomerType] = useState<"natural_person" | "legal_entity">("natural_person");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Zefix
  const [zefixQuery, setZefixQuery] = useState("");
  const [zefixResults, setZefixResults] = useState<ZefixResult[]>([]);
  const [zefixSearching, setZefixSearching] = useState(false);

  const handleZefixSearch = async () => {
    if (!zefixQuery.trim()) return;
    setZefixSearching(true);
    const res = await searchZefix(zefixQuery);
    setZefixResults(res.results);
    setZefixSearching(false);
  };

  const selectZefix = (r: ZefixResult) => {
    setForm({
      company_name: r.name,
      uid_number: r.uid,
      legal_form: r.legalForm,
      legal_seat: r.legalSeat,
      address: r.address,
      purpose: r.purpose || "",
    });
    setZefixResults([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createCustomer({
        organization_id: org.id,
        customer_type: customerType,
        ...(customerType === "natural_person" ? {
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: form.date_of_birth || undefined,
          nationality: form.nationality,
          address: form.address,
        } : {
          company_name: form.company_name,
          uid_number: form.uid_number,
          legal_form: form.legal_form,
          legal_seat: form.legal_seat,
          purpose: form.purpose,
          address: form.address,
          zefix_data: form.uid_number ? { uid: form.uid_number } : undefined,
        }),
      });
      onCreate();
    } catch (err) {
      console.error("Create customer:", err);
      alert("Fehler beim Erstellen des Kunden.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: T.shLg }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.ink, margin: 0 }}>Neuer Kunde</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink3 }}>
            <Icon d="M6 18L18 6M6 6l12 12" size={20} color={T.ink3} />
          </button>
        </div>

        {step === "type" && (
          <>
            <p style={{ fontSize: 14, color: T.ink3, margin: "0 0 20px" }}>Welchen Kundentyp möchten Sie erfassen?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(["natural_person", "legal_entity"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setCustomerType(t); setStep("form"); }}
                  style={{
                    padding: "24px 16px", border: `1px solid ${T.border}`, borderRadius: 12,
                    background: "#fff", cursor: "pointer", textAlign: "center",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.accent; (e.currentTarget as HTMLButtonElement).style.boxShadow = T.shMd; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
                >
                  <Icon d={t === "natural_person" ? "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" : icons.building} size={28} color={T.accent} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginTop: 10, fontFamily: T.sans }}>
                    {CUSTOMER_TYPE[t].label}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "form" && customerType === "legal_entity" && (
          <>
            <button onClick={() => setStep("type")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: T.accent, fontWeight: 600, fontFamily: T.sans, marginBottom: 16, padding: 0 }}>
              <Icon d={icons.back} size={14} color={T.accent} /> Zurück
            </button>

            {/* Zefix search */}
            <div style={{ marginBottom: 20, padding: 16, background: T.s1, borderRadius: 10, border: `1px solid ${T.borderL}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Zefix-Suche (Handelsregister)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={zefixQuery}
                  onChange={(e) => setZefixQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleZefixSearch()}
                  placeholder="Firmenname oder UID eingeben..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, outline: "none" }}
                />
                <button
                  onClick={handleZefixSearch}
                  disabled={zefixSearching}
                  style={{ padding: "8px 14px", background: T.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.sans, opacity: zefixSearching ? 0.6 : 1 }}
                >
                  {zefixSearching ? "..." : "Suchen"}
                </button>
              </div>
              {zefixResults.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflow: "auto" }}>
                  {zefixResults.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => selectZefix(r)}
                      style={{ padding: "10px 12px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13 }}
                      onMouseOver={(e) => (e.currentTarget.style.borderColor = T.accent)}
                      onMouseOut={(e) => (e.currentTarget.style.borderColor = T.border)}
                    >
                      <div style={{ fontWeight: 600, color: T.ink }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: T.ink4 }}>{r.uid} &middot; {r.legalForm} &middot; {r.legalSeat}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormInput label="Firmenname *" value={form.company_name} onChange={(v) => setField("company_name", v)} />
              <FormInput label="UID-Nummer" value={form.uid_number} onChange={(v) => setField("uid_number", v)} placeholder="CHE-123.456.789" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormInput label="Rechtsform" value={form.legal_form} onChange={(v) => setField("legal_form", v)} />
                <FormInput label="Sitz" value={form.legal_seat} onChange={(v) => setField("legal_seat", v)} />
              </div>
              <FormInput label="Adresse" value={form.address} onChange={(v) => setField("address", v)} />
              <FormInput label="Zweck" value={form.purpose} onChange={(v) => setField("purpose", v)} multiline />
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={btnSecondary}>Abbrechen</button>
              <button onClick={handleSave} disabled={saving || !form.company_name} style={{ ...btnPrimary, opacity: saving || !form.company_name ? 0.5 : 1 }}>
                {saving ? "Speichern..." : "Kunde anlegen"}
              </button>
            </div>
          </>
        )}

        {step === "form" && customerType === "natural_person" && (
          <>
            <button onClick={() => setStep("type")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: T.accent, fontWeight: 600, fontFamily: T.sans, marginBottom: 16, padding: 0 }}>
              <Icon d={icons.back} size={14} color={T.accent} /> Zurück
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormInput label="Vorname *" value={form.first_name} onChange={(v) => setField("first_name", v)} />
                <FormInput label="Nachname *" value={form.last_name} onChange={(v) => setField("last_name", v)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormInput label="Geburtsdatum" value={form.date_of_birth} onChange={(v) => setField("date_of_birth", v)} type="date" />
                <FormInput label="Nationalität" value={form.nationality} onChange={(v) => setField("nationality", v)} placeholder="z.B. Schweiz" />
              </div>
              <FormInput label="Adresse" value={form.address} onChange={(v) => setField("address", v)} />
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={btnSecondary}>Abbrechen</button>
              <button onClick={handleSave} disabled={saving || !form.first_name || !form.last_name} style={{ ...btnPrimary, opacity: saving || !form.first_name || !form.last_name ? 0.5 : 1 }}>
                {saving ? "Speichern..." : "Kunde anlegen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text", multiline }: {
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string; type?: string; multiline?: boolean;
}) {
  const style: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
    fontSize: 13, fontFamily: T.sans, outline: "none", boxSizing: "border-box",
  };
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4, fontFamily: T.sans }}>{label}</label>
      {multiline
        ? <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...style, resize: "vertical" }} />
        : <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />
      }
    </div>
  );
}

// =================================================================
//  Sub-View 2: Customer Detail
// =================================================================

function CustomerDetail({ org, role, customerId, onBack, onOpenDoc }: {
  org: ClientOrg; role?: string; customerId: string; onBack: () => void;
  onOpenDoc: (docId: string) => void;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<CustomerDocument[]>([]);
  const [auditCustomer, setAuditCustomer] = useState<CustomerAuditEntry[]>([]);
  const [auditDocs, setAuditDocs] = useState<CustomerDocAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"docs" | "profile" | "history">("docs");
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cust, custDocs] = await Promise.all([
        loadCustomer(customerId),
        loadCustomerDocuments(customerId),
      ]);
      setCustomer(cust);
      setDocs(custDocs);
    } catch (err) {
      console.error("Load customer detail:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  // Lazy load audit logs when tab switches
  useEffect(() => {
    if (tab === "history" && auditCustomer.length === 0) {
      Promise.all([
        loadCustomerAuditLog(customerId),
        ...docs.map((d) => loadCustomerDocAuditLog(d.id)),
      ]).then(([custAudit, ...docAudits]) => {
        setAuditCustomer(custAudit);
        setAuditDocs(docAudits.flat());
      }).catch((err) => console.error("Load audit:", err));
    }
  }, [tab, customerId, docs]);

  if (loading || !customer) {
    return <div style={{ padding: 20, textAlign: "center", color: T.ink3 }}>Wird geladen...</div>;
  }

  const risk = RISK_LEVEL[customer.risk_level] ?? RISK_LEVEL.standard;
  const status = CUSTOMER_STATUS[customer.status] ?? CUSTOMER_STATUS.active;
  const type = CUSTOMER_TYPE[customer.customer_type];
  const templates = getTemplatesForType(customer.customer_type);

  const handleArchive = async () => {
    if (!confirm("Kunde wirklich archivieren?")) return;
    await archiveCustomer(customer.id);
    onBack();
  };

  const handleEditSave = async () => {
    try {
      await updateCustomer(customer.id, {
        ...(customer.customer_type === "natural_person" ? {
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          nationality: editForm.nationality,
          address: editForm.address,
        } : {
          company_name: editForm.company_name,
          address: editForm.address,
        }),
        notes: editForm.notes,
        risk_level: (editForm.risk_level as Customer["risk_level"]) || customer.risk_level,
      });
      setEditing(false);
      load();
    } catch (err) {
      console.error("Update customer:", err);
      alert("Fehler beim Speichern.");
    }
  };

  const handleCreateDoc = async (tpl: CustomerTemplate) => {
    try {
      const doc = await createCustomerDocument({
        customer_id: customer.id,
        organization_id: org.id,
        template_key: tpl.key,
        name: tpl.name,
      });
      setShowTemplateSelect(false);
      onOpenDoc(doc.id);
    } catch (err) {
      console.error("Create doc:", err);
      alert("Fehler beim Erstellen des Dokuments.");
    }
  };

  return (
    <>
      {/* Back + Header */}
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: T.accent, fontWeight: 600, fontFamily: T.sans, marginBottom: 16, padding: 0 }}>
        <Icon d={icons.back} size={14} color={T.accent} /> Alle Kunden
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Badge label={type.label} bg={T.s2} color={T.ink3} />
            <Badge label={risk.label} bg={risk.bg} color={risk.color} />
            <Badge label={status.label} bg={status.bg} color={status.color} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, margin: 0 }}>{customerName(customer)}</h1>
          {customer.uid_number && <p style={{ fontSize: 13, color: T.ink4, margin: "2px 0 0" }}>{customer.uid_number}</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit(role) && (
            <button onClick={() => { setEditing(true); setTab("profile"); setEditForm(customer as unknown as Record<string, string>); }} style={btnSecondary}>
              Bearbeiten
            </button>
          )}
          {canApprove(role) && customer.status !== "archived" && (
            <button onClick={handleArchive} style={{ ...btnSecondary, color: "#dc2626", borderColor: "#dc2626" }}>
              Archivieren
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
        {(["docs", "profile", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? T.accent : T.ink3, background: "none", fontFamily: T.sans,
              borderBottom: tab === t ? `2px solid ${T.accent}` : "2px solid transparent", marginBottom: -1,
            }}
          >
            {t === "docs" ? "Dokumente" : t === "profile" ? "Stammdaten" : "Verlauf"}
          </button>
        ))}
      </div>

      {/* Tab: Dokumente */}
      {tab === "docs" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>Kundendokumente</h3>
            {canEdit(role) && (
              <button onClick={() => setShowTemplateSelect(true)} style={{ ...btnPrimary, fontSize: 12, padding: "8px 14px" }}>
                <Icon d={icons.plus} size={13} color="#fff" /> Neues Dokument
              </button>
            )}
          </div>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: T.ink3, fontSize: 14, background: T.s1, borderRadius: 10 }}>
              Noch keine Dokumente erstellt.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map((d) => {
                const ds = CUSTOMER_DOC_STATUS[d.status] ?? CUSTOMER_DOC_STATUS.draft;
                return (
                  <div
                    key={d.id}
                    onClick={() => onOpenDoc(d.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", background: "#fff", borderRadius: T.r,
                      border: `1px solid ${T.border}`, cursor: "pointer", transition: "box-shadow 0.15s",
                    }}
                    onMouseOver={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd)}
                    onMouseOut={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>
                        v{d.version} &middot; {CUSTOMER_TEMPLATES[d.template_key]?.legalBasis ?? ""}
                      </div>
                    </div>
                    <Badge label={ds.label} bg={ds.bg} color={ds.color} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Template selection */}
          {showTemplateSelect && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTemplateSelect(false)}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560, maxHeight: "80vh", overflow: "auto", boxShadow: T.shLg }} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: "0 0 8px" }}>Template auswählen</h2>
                <p style={{ fontSize: 13, color: T.ink3, margin: "0 0 20px" }}>Welches Compliance-Dokument möchten Sie erstellen?</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {templates.map((tpl) => (
                    <div
                      key={tpl.key}
                      onClick={() => handleCreateDoc(tpl)}
                      style={{
                        padding: "16px", background: T.s1, borderRadius: 10,
                        border: `1px solid ${T.borderL}`, cursor: "pointer", transition: "border-color 0.15s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.borderColor = T.accent)}
                      onMouseOut={(e) => (e.currentTarget.style.borderColor = T.borderL)}
                    >
                      <Icon d={tpl.icon} size={22} color={T.accent} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 8 }}>{tpl.name}</div>
                      <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 2 }}>{tpl.desc}</div>
                      <div style={{ fontSize: 10.5, color: T.ink4, marginTop: 4 }}>{tpl.legalBasis}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Stammdaten */}
      {tab === "profile" && (
        <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: 24 }}>
          {editing ? (
            <>
              {customer.customer_type === "natural_person" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FormInput label="Vorname" value={editForm.first_name} onChange={(v) => setEditForm((p) => ({ ...p, first_name: v }))} />
                  <FormInput label="Nachname" value={editForm.last_name} onChange={(v) => setEditForm((p) => ({ ...p, last_name: v }))} />
                  <FormInput label="Nationalität" value={editForm.nationality} onChange={(v) => setEditForm((p) => ({ ...p, nationality: v }))} />
                  <FormInput label="Adresse" value={editForm.address} onChange={(v) => setEditForm((p) => ({ ...p, address: v }))} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FormInput label="Firmenname" value={editForm.company_name} onChange={(v) => setEditForm((p) => ({ ...p, company_name: v }))} />
                  <FormInput label="Adresse" value={editForm.address} onChange={(v) => setEditForm((p) => ({ ...p, address: v }))} />
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: T.ink2, display: "block", marginBottom: 4 }}>Risikostufe</label>
                <select value={editForm.risk_level || customer.risk_level} onChange={(e) => setEditForm((p) => ({ ...p, risk_level: e.target.value }))} style={filterStyle}>
                  <option value="low">Niedrig</option>
                  <option value="standard">Standard</option>
                  <option value="elevated">Erhöht</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
              <FormInput label="Notizen" value={editForm.notes} onChange={(v) => setEditForm((p) => ({ ...p, notes: v }))} multiline />
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button onClick={() => setEditing(false)} style={btnSecondary}>Abbrechen</button>
                <button onClick={handleEditSave} style={btnPrimary}>Speichern</button>
              </div>
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
              {customer.customer_type === "natural_person" ? (
                <>
                  <ProfileField label="Vorname" value={customer.first_name} />
                  <ProfileField label="Nachname" value={customer.last_name} />
                  <ProfileField label="Geburtsdatum" value={customer.date_of_birth} />
                  <ProfileField label="Nationalität" value={customer.nationality} />
                </>
              ) : (
                <>
                  <ProfileField label="Firmenname" value={customer.company_name} />
                  <ProfileField label="UID-Nummer" value={customer.uid_number} />
                  <ProfileField label="Rechtsform" value={customer.legal_form} />
                  <ProfileField label="Sitz" value={customer.legal_seat} />
                  <ProfileField label="Zweck" value={customer.purpose} span2 />
                </>
              )}
              <ProfileField label="Adresse" value={customer.address} span2 />
              <ProfileField label="Risikostufe" value={risk.label} />
              <ProfileField label="Nächste Überprüfung" value={customer.next_review} />
              <ProfileField label="Notizen" value={customer.notes} span2 />
              <ProfileField label="Erstellt am" value={new Date(customer.created_at).toLocaleDateString("de-CH")} />
            </div>
          )}
        </div>
      )}

      {/* Tab: Verlauf */}
      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ...auditCustomer.map((a) => ({ ...a, type: "customer" as const, date: a.changed_at })),
            ...auditDocs.map((a) => ({ ...a, type: "document" as const, date: a.changed_at })),
          ]
            .sort((a, b) => (a.date > b.date ? -1 : 1))
            .map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: T.r, border: `1px solid ${T.borderL}` }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                  background: entry.action === "approved" ? T.accent : entry.action === "rejected" ? "#dc2626" : entry.action === "submitted" ? "#d97706" : "#3b82f6",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{entry.details}</div>
                  <div style={{ fontSize: 12, color: T.ink4, marginTop: 2 }}>
                    {"changed_by_name" in entry ? entry.changed_by_name : "System"} &middot; {entry.date}
                  </div>
                </div>
              </div>
            ))}
          {auditCustomer.length === 0 && auditDocs.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: T.ink3, fontSize: 14 }}>Keine Einträge.</div>
          )}
        </div>
      )}
    </>
  );
}

function ProfileField({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: "1 / -1" } : {}}>
      <div style={{ fontSize: 11.5, color: T.ink4, fontFamily: T.sans, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: value ? T.ink : T.ink4, fontFamily: T.sans }}>{value || "—"}</div>
    </div>
  );
}

// =================================================================
//  Sub-View 3: Document Form
// =================================================================

function DocumentForm({ org, role, docId, customerId, onBack }: {
  org: ClientOrg; role?: string; docId: string; customerId: string; onBack: () => void;
}) {
  const [doc, setDoc] = useState<CustomerDocument | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [audit, setAudit] = useState<CustomerDocAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadCustomerDocuments(customerId).then((docs) => docs.find((d) => d.id === docId) || null),
      loadCustomer(customerId),
    ]).then(([d, c]) => {
      setDoc(d);
      setCustomer(c);
      if (d) setFormData(d.data || {});
    }).catch((err) => console.error("Load doc:", err))
      .finally(() => setLoading(false));
  }, [docId, customerId]);

  useEffect(() => {
    if (showAudit && audit.length === 0) {
      loadCustomerDocAuditLog(docId).then(setAudit).catch(() => {});
    }
  }, [showAudit, docId]);

  if (loading || !doc || !customer) {
    return <div style={{ padding: 20, textAlign: "center", color: T.ink3 }}>Wird geladen...</div>;
  }

  const template = CUSTOMER_TEMPLATES[doc.template_key];
  if (!template) {
    return <div style={{ padding: 20, color: T.ink3 }}>Template nicht gefunden: {doc.template_key}</div>;
  }

  const ds = CUSTOMER_DOC_STATUS[doc.status] ?? CUSTOMER_DOC_STATUS.draft;
  const isReadOnly = doc.status === "approved" || doc.status === "outdated" || (doc.status === "in_review" && !canApprove(role));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCustomerDocumentData(docId, formData);
      alert("Gespeichert.");
    } catch (err) {
      console.error("Save:", err);
      alert("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm("Dokument zur Prüfung einreichen?")) return;
    setSaving(true);
    try {
      await saveCustomerDocumentData(docId, formData);
      await submitForReview(docId);
      const updated = await loadCustomerDocuments(customerId);
      setDoc(updated.find((d) => d.id === docId) || null);
    } catch (err) {
      console.error("Submit:", err);
      alert("Fehler beim Einreichen.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Dokument freigeben?")) return;
    setSaving(true);
    try {
      await approveCustomerDocument(docId);
      const updated = await loadCustomerDocuments(customerId);
      setDoc(updated.find((d) => d.id === docId) || null);
    } catch (err) {
      console.error("Approve:", err);
      alert("Fehler bei der Freigabe.");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert("Bitte Begründung angeben."); return; }
    setSaving(true);
    try {
      await rejectCustomerDocument(docId, rejectReason);
      const updated = await loadCustomerDocuments(customerId);
      setDoc(updated.find((d) => d.id === docId) || null);
      setShowReject(false);
    } catch (err) {
      console.error("Reject:", err);
      alert("Fehler bei der Ablehnung.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevise = async () => {
    setSaving(true);
    try {
      await reviseCustomerDocument(docId);
      const updated = await loadCustomerDocuments(customerId);
      setDoc(updated.find((d) => d.id === docId) || null);
    } catch (err) {
      console.error("Revise:", err);
      alert("Fehler.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    exportCustomerDocumentAsPdf({
      templateName: template.name,
      customerName: customerName(customer),
      version: `v${doc.version}`,
      status: ds.label,
      legalBasis: template.legalBasis,
      orgName: org.name,
      approvedAt: doc.approved_at || undefined,
      sections: template.sections,
      data: formData,
    });
  };

  const setFieldValue = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  return (
    <>
      {/* Back */}
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: T.accent, fontWeight: 600, fontFamily: T.sans, marginBottom: 16, padding: 0 }}>
        <Icon d={icons.back} size={14} color={T.accent} /> Zurück zu {customerName(customer)}
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>{doc.name}</h1>
            <Badge label={ds.label} bg={ds.bg} color={ds.color} />
          </div>
          <p style={{ fontSize: 13, color: T.ink4, margin: 0 }}>
            {customerName(customer)} &middot; v{doc.version} &middot; {template.legalBasis}
          </p>
        </div>
      </div>

      {/* Rejection reason */}
      {doc.status === "rejected" && doc.rejection_reason && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", marginBottom: 4 }}>Ablehnungsgrund</div>
          <div style={{ fontSize: 13, color: "#991b1b" }}>{doc.rejection_reason}</div>
        </div>
      )}

      {/* Form sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
        {template.sections.map((section, si) => (
          <div key={si} style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, padding: "20px 24px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>{section.title}</h3>
            {section.fields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={formData[field.id]}
                onChange={(val) => isReadOnly ? undefined : setFieldValue(field.id, val)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {doc.status === "draft" && canEdit(role) && (
          <>
            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "..." : "Speichern"}
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{ ...btnSecondary, color: T.accent, borderColor: T.accent }}>
              Zur Prüfung einreichen
            </button>
          </>
        )}
        {doc.status === "in_review" && canApprove(role) && (
          <>
            <button onClick={handleApprove} disabled={saving} style={{ ...btnPrimary, background: T.accent }}>
              Freigeben
            </button>
            <button onClick={() => setShowReject(true)} style={{ ...btnSecondary, color: "#dc2626", borderColor: "#dc2626" }}>
              Ablehnen
            </button>
          </>
        )}
        {doc.status === "rejected" && canEdit(role) && (
          <button onClick={handleRevise} disabled={saving} style={btnPrimary}>
            Überarbeiten (zurück zu Entwurf)
          </button>
        )}
        {doc.status === "approved" && (
          <button onClick={handleExportPdf} style={btnPrimary}>
            <Icon d={icons.download} size={14} color="#fff" /> PDF exportieren
          </button>
        )}
        <button onClick={() => setShowAudit(!showAudit)} style={btnSecondary}>
          {showAudit ? "Verlauf ausblenden" : "Verlauf anzeigen"}
        </button>
      </div>

      {/* Reject modal */}
      {showReject && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowReject(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, boxShadow: T.shLg }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: "0 0 12px" }}>Dokument ablehnen</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Begründung für die Ablehnung..."
              rows={4}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.sans, outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowReject(false)} style={btnSecondary}>Abbrechen</button>
              <button onClick={handleReject} disabled={saving} style={{ ...btnPrimary, background: "#dc2626" }}>Ablehnen</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit log */}
      {showAudit && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 12 }}>Verlauf</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {audit.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "#fff", borderRadius: T.r, border: `1px solid ${T.borderL}` }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: a.action === "approved" ? T.accent : a.action === "rejected" ? "#dc2626" : a.action === "submitted" ? "#d97706" : "#3b82f6",
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{a.details}</div>
                  <div style={{ fontSize: 11.5, color: T.ink4 }}>{a.changed_by_name} &middot; {a.changed_at}</div>
                </div>
              </div>
            ))}
            {audit.length === 0 && <div style={{ fontSize: 13, color: T.ink4 }}>Keine Einträge.</div>}
          </div>
        </div>
      )}
    </>
  );
}

// =================================================================
//  Shared button styles
// =================================================================

const btnPrimary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
  background: T.accent, color: "#fff", border: "none", borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 18px", background: "#fff", color: T.ink2,
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.sans,
};
