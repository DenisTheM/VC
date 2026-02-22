import type { FieldDef } from "@shared/components/Field";

export interface ProfileFieldDef extends FieldDef {
  section: string;
}

export const PROFILE_FIELDS: ProfileFieldDef[] = [
  { id: "company_name", label: "Firmenname (rechtlich)", type: "text", required: true, section: "Stammdaten", hint: "Identifikation des Finanzintermediärs", default: "Align Technology Switzerland GmbH" },
  { id: "legal_form", label: "Rechtsform", type: "select", options: ["AG", "GmbH", "Einzelfirma", "Genossenschaft", "Stiftung", "Verein"], required: true, section: "Stammdaten", default: "GmbH" },
  { id: "uid", label: "UID / Handelsregisternummer", type: "text", required: true, section: "Stammdaten", hint: "Eindeutige Identifikation", default: "CHE-123.456.789" },
  { id: "address", label: "Sitz / Geschäftsadresse", type: "text", required: true, section: "Stammdaten", default: "Suurstoffi 22, 6343 Rotkreuz" },
  { id: "founding_year", label: "Gründungsjahr", type: "number", required: true, section: "Stammdaten", default: "2019" },
  { id: "industry", label: "Branche / Geschäftsfeld", type: "select", options: ["Fintech", "Crypto / DLT", "Vermögensverwaltung", "Zahlungsverkehr", "Leasing / Finanzierung", "Versicherung", "Andere"], required: true, section: "Geschäftstätigkeit", default: "Leasing / Finanzierung" },
  { id: "business_detail", label: "Detaillierte Geschäftstätigkeit", type: "textarea", required: true, section: "Geschäftstätigkeit", default: "36-monatige Operating-Leases für medizinische Intraoralscanner" },
  { id: "employees", label: "Anzahl Mitarbeitende", type: "number", required: true, section: "Organisation", default: "45" },
  { id: "management", label: "Geschäftsleitung / VR-Mitglieder", type: "text", required: true, section: "Organisation", default: "Daniel Müller (CEO), Sarah Fischer (CFO)" },
  { id: "compliance_officer", label: "Compliance Officer", type: "text", required: true, section: "Organisation", hint: "Art. 24 AMLO-FINMA", default: "Elena Scheller (extern, Virtue Compliance)" },
  { id: "sro", label: "SRO-Mitgliedschaft", type: "select", options: ["VQF", "PolyReg", "SO-FIT", "ARIF", "OAR-G", "Keine / In Bearbeitung"], required: true, section: "Regulierung", default: "VQF" },
  { id: "sro_status", label: "SRO-Status", type: "select", options: ["Aktives Mitglied", "Aufnahme beantragt", "In Vorbereitung", "Nicht erforderlich"], required: true, section: "Regulierung", default: "Aufnahme beantragt" },
  { id: "finma_license", label: "FINMA-Lizenz", type: "select", options: ["Keine", "Fintech-Lizenz", "Banklizenz", "Effektenhändler", "Vermögensverwalter"], required: false, section: "Regulierung", default: "Keine" },
  { id: "tx_volume", label: "Transaktionsvolumen (jährl.)", type: "select", options: ["< CHF 1 Mio.", "CHF 1-10 Mio.", "CHF 10-50 Mio.", "CHF 50-100 Mio.", "> CHF 100 Mio."], required: true, section: "Risikoprofil", default: "CHF 1-10 Mio." },
  { id: "client_types", label: "Kundentypen", type: "multi", options: ["B2B (Unternehmen)", "B2C (Privatkunden)", "Institutionelle Kunden", "NPOs / Vereine"], required: true, section: "Risikoprofil", default: ["B2B (Unternehmen)"] },
  { id: "geo_focus", label: "Geogr. Fokus der Kunden", type: "multi", options: ["Schweiz", "EU/EWR", "USA/UK", "Asien", "Naher Osten", "Afrika", "Lateinamerika"], required: true, section: "Risikoprofil", default: ["Schweiz", "EU/EWR"] },
  { id: "products", label: "Produkte & Dienstleistungen", type: "multi", options: ["Zahlungsabwicklung", "Kreditvergabe / Leasing", "Vermögensverwaltung", "Custody / Verwahrung", "Crypto-Exchange", "Tokenisierung", "Beratung"], required: true, section: "Risikoprofil", default: ["Kreditvergabe / Leasing"] },
  { id: "crypto", label: "Crypto/DLT-Bezug", type: "toggle", required: true, section: "Risikoprofil", default: false },
  { id: "cross_border", label: "Grenzüberschreitende Tätigkeit", type: "toggle", required: true, section: "Risikoprofil", default: true },
  { id: "existing_infra", label: "Bestehende Compliance-Infrastruktur", type: "multi", options: ["KYC-Software", "Transaktionsmonitoring", "Sanktionslisten-Screening", "Schulungsplattform", "DMS", "Keine"], required: false, section: "Risikoprofil", default: [] },
];
