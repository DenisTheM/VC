import type { FieldDef } from "@shared/components/Field";

export interface ProfileFieldDef extends FieldDef {
  section: string;
}

export const PROFILE_FIELDS: ProfileFieldDef[] = [
  { id: "company_name", label: "Firmenname (rechtlich)", type: "text", required: true, section: "Stammdaten", hint: "Identifikation des Finanzintermediärs", placeholder: "z.B. Muster Finanz AG" },
  { id: "legal_form", label: "Rechtsform", type: "select", options: ["AG", "GmbH", "Einzelfirma", "Genossenschaft", "Stiftung", "Verein"], required: true, section: "Stammdaten" },
  { id: "uid", label: "UID / Handelsregisternummer", type: "text", required: true, section: "Stammdaten", hint: "Eindeutige Identifikation", placeholder: "CHE-000.000.000" },
  { id: "address", label: "Sitz / Geschäftsadresse", type: "text", required: true, section: "Stammdaten", placeholder: "Strasse Nr., PLZ Ort" },
  { id: "founding_year", label: "Gründungsjahr", type: "number", required: true, section: "Stammdaten", placeholder: "z.B. 2019" },
  { id: "industry", label: "Branche / Geschäftsfeld", type: "select", options: ["Crypto / DLT", "Effektenhandel", "Family Office", "Fintech", "Investmentgesellschaft", "Leasing / Finanzierung", "Venture Capital", "Vermögensverwaltung", "Versicherung", "Zahlungsverkehr", "Andere"], required: true, section: "Geschäftstätigkeit" },
  { id: "business_detail", label: "Detaillierte Geschäftstätigkeit", type: "textarea", required: true, section: "Geschäftstätigkeit", placeholder: "Beschreiben Sie Ihre Haupttätigkeit ..." },
  { id: "employees", label: "Anzahl Mitarbeitende", type: "number", required: true, section: "Organisation", placeholder: "z.B. 12" },
  { id: "geschaeftsleitung", label: "Geschäftsleitung", type: "text", required: true, section: "Organisation", placeholder: "z.B. Max Muster (CEO), Anna Beispiel (CFO)" },
  { id: "verwaltungsrat", label: "Verwaltungsrat (VR)", type: "text", required: true, section: "Organisation", placeholder: "z.B. Peter Keller (Präsident), Lisa Meier" },
  { id: "compliance_officer", label: "Compliance Officer", type: "text", required: true, section: "Organisation", hint: "Art. 24 AMLO-FINMA", placeholder: "Name (intern/extern)" },
  { id: "sro", label: "SRO-Mitgliedschaft", type: "select", options: ["VQF", "PolyReg", "SO-FIT", "ARIF", "OAR-G", "SRO SAV/SNV", "SRO Treuhand Suisse", "SRO Leasingverband", "SRO SVV", "Keine / In Bearbeitung"], required: true, section: "Regulierung" },
  { id: "sro_status", label: "SRO-Status", type: "select", options: ["Aktives Mitglied", "Aufnahme beantragt", "In Vorbereitung", "Nicht erforderlich"], required: true, section: "Regulierung" },
  { id: "finma_license", label: "FINMA-Lizenz", type: "select", options: ["Keine", "Fintech-Lizenz", "Banklizenz", "Effektenhändler", "Vermögensverwalter"], required: false, section: "Regulierung" },
  { id: "tx_volume", label: "Transaktionsvolumen (jährl.)", type: "select", options: ["< CHF 1 Mio.", "CHF 1-10 Mio.", "CHF 10-50 Mio.", "CHF 50-100 Mio.", "> CHF 100 Mio."], required: true, section: "Risikoprofil" },
  { id: "client_types", label: "Kundentypen", type: "multi", options: ["B2B (Unternehmen)", "B2C (Privatkunden)", "Institutionelle Kunden", "NPOs / Vereine"], required: true, section: "Risikoprofil" },
  { id: "geo_focus", label: "Geogr. Fokus der Kunden", type: "multi", options: ["Schweiz", "EU/EWR", "USA/UK", "Asien", "Naher Osten", "Afrika", "Lateinamerika"], required: true, section: "Risikoprofil" },
  { id: "products", label: "Produkte & Dienstleistungen", type: "multi", options: ["Zahlungsabwicklung", "Kreditvergabe / Leasing", "Vermögensverwaltung", "Custody / Verwahrung", "Crypto-Exchange", "Tokenisierung", "Beratung", "Crowdfunding", "Investment / Fondsmanagement"], required: true, section: "Risikoprofil" },
  { id: "crypto", label: "Crypto/DLT-Bezug", type: "toggle", required: true, section: "Risikoprofil" },
  { id: "cross_border", label: "Grenzüberschreitende Tätigkeit", type: "toggle", required: true, section: "Risikoprofil" },
  { id: "existing_infra", label: "Bestehende Compliance-Infrastruktur", type: "multi", options: ["KYC-Software", "Transaktionsmonitoring", "Sanktionslisten-Screening", "Schulungsplattform", "DMS", "Keine"], required: false, section: "Risikoprofil" },
];
