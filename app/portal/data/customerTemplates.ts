import type { FieldDef } from "@shared/components/Field";
import { icons } from "@shared/components/Icon";

export interface CustomerTemplate {
  key: string;
  name: string;
  desc: string;
  icon: string;
  customerType: "natural_person" | "legal_entity" | "both";
  legalBasis: string;
  reviewIntervalDays: number;
  sections: { title: string; fields: FieldDef[] }[];
}

export const CUSTOMER_TEMPLATES: Record<string, CustomerTemplate> = {
  risk_classification: {
    key: "risk_classification",
    name: "Risikoklassifizierung",
    desc: "Kundenrisiko-Bewertung nach FINMA-Vorgaben",
    icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    customerType: "both",
    legalBasis: "Art. 13 AMLO-FINMA",
    reviewIntervalDays: 365,
    sections: [
      {
        title: "Kundeninformationen",
        fields: [
          { id: "domicile_country", label: "Domizilland", type: "select", options: ["Schweiz", "EU/EWR", "USA/UK", "Hochrisikoland (FATF)", "Sonstiges Drittland"], hint: "Art. 13 Abs. 2 lit. a AMLO-FINMA" },
          { id: "pep_status", label: "PEP-Status", type: "select", options: ["Keine PEP", "Inländische PEP", "Ausländische PEP", "PEP internationaler Organisation", "Nahestehende Person"], hint: "Art. 2a AMLA" },
          { id: "business_purpose", label: "Geschäftszweck / Herkunft der Mittel", type: "textarea", placeholder: "Beschreibung der Geschäftstätigkeit und Mittelherkunft", hint: "Art. 6 AMLA" },
          { id: "complex_structure", label: "Komplexe Firmenstruktur?", type: "toggle", hint: "Art. 13 Abs. 2 lit. h AMLO-FINMA" },
        ],
      },
      {
        title: "Risikoeinschätzung",
        fields: [
          { id: "inherent_risk", label: "Inhärentes Risiko", type: "select", options: ["Niedrig", "Standard", "Erhöht", "Hoch"], hint: "Art. 13 AMLO-FINMA" },
          { id: "risk_factors", label: "Erhöhte Risikofaktoren", type: "multi", options: ["Hochrisikoland", "PEP", "Barzahlungen", "Komplexe Struktur", "Hohe Transaktionsvolumen", "Adverse Media", "Sanktionsnähe"], hint: "Art. 13 Abs. 2 AMLO-FINMA" },
          { id: "mitigating_factors", label: "Risikomindernde Faktoren", type: "multi", options: ["Langjährige Kundenbeziehung", "Reguliertes Unternehmen", "Transparente Struktur", "Niedrige Transaktionsvolumen", "Vor-Ort-Identifikation"], hint: "Kontrollumfeld" },
          { id: "overall_risk", label: "Gesamtrisiko (Nettorisiko)", type: "select", options: ["Niedrig", "Standard", "Erhöht", "Hoch"], hint: "Art. 13 AMLO-FINMA — Gesamtbewertung" },
        ],
      },
      {
        title: "Massnahmen & Überprüfung",
        fields: [
          { id: "monitoring_level", label: "Monitoring-Intensität", type: "select", options: ["Standard", "Erhöht", "Intensiv"], hint: "Art. 20 AMLO-FINMA" },
          { id: "edd_required", label: "Enhanced Due Diligence erforderlich?", type: "toggle", hint: "Art. 15 AMLO-FINMA" },
          { id: "notes", label: "Bemerkungen zur Risikoeinstufung", type: "textarea", placeholder: "Begründung und zusätzliche Informationen" },
        ],
      },
    ],
  },

  kyc_natural_person: {
    key: "kyc_natural_person",
    name: "KYC Natürliche Person",
    desc: "Sorgfaltspflicht-Checkliste für natürliche Personen",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    customerType: "natural_person",
    legalBasis: "Art. 3-5 AMLA, VSB 20",
    reviewIntervalDays: 365,
    sections: [
      {
        title: "Identifikation",
        fields: [
          { id: "id_document_type", label: "Ausweisart", type: "select", options: ["Pass", "Identitätskarte", "Aufenthaltsbewilligung", "Führerschein (nur ergänzend)"], hint: "Art. 3 AMLA, VSB Art. 1" },
          { id: "id_document_number", label: "Ausweisnummer", type: "text", placeholder: "z.B. X1234567" },
          { id: "id_expiry", label: "Gültig bis", type: "date", hint: "Abgelaufene Ausweise nicht akzeptieren" },
          { id: "id_verification_method", label: "Identifikationsmethode", type: "select", options: ["Face-to-face", "Video-Identifikation", "Digital (Sumsub o.ä.)", "Kopie + Bestätigung"], hint: "Art. 3 Abs. 1-4 AMLA" },
          { id: "id_verified", label: "Identität verifiziert?", type: "toggle", hint: "VSB Art. 1-5" },
        ],
      },
      {
        title: "Wirtschaftlich Berechtigter",
        fields: [
          { id: "is_beneficial_owner", label: "Kunde ist selbst wirtschaftlich Berechtigter?", type: "toggle", hint: "Art. 4 AMLA" },
          { id: "bo_name", label: "Name des wirtschaftlich Berechtigten (falls abweichend)", type: "text", placeholder: "Vorname Nachname", hint: "VSB Art. 20-23 (Formular K)" },
          { id: "bo_relationship", label: "Beziehung zum wirtschaftlich Berechtigten", type: "select", options: ["Identisch", "Familienangehöriger", "Treuhänder", "Bevollmächtigter", "Sonstige"], hint: "Art. 4 Abs. 1 AMLA" },
        ],
      },
      {
        title: "Geschäftsprofil",
        fields: [
          { id: "occupation", label: "Beruf / Tätigkeit", type: "text", placeholder: "z.B. Unternehmer, Ärztin" },
          { id: "source_of_funds", label: "Herkunft der Vermögenswerte", type: "select", options: ["Erwerbseinkommen", "Erbschaft", "Kapitalgewinn", "Verkauf Unternehmen", "Sonstige"], hint: "Art. 6 AMLA" },
          { id: "expected_tx_volume", label: "Erwartetes Transaktionsvolumen (jährlich)", type: "select", options: ["< CHF 25'000", "CHF 25'000-100'000", "CHF 100'000-500'000", "> CHF 500'000"], hint: "Art. 13 AMLO-FINMA" },
          { id: "purpose_of_relationship", label: "Zweck der Geschäftsbeziehung", type: "textarea", placeholder: "Beschreibung", hint: "Art. 6 Abs. 1 AMLA" },
        ],
      },
    ],
  },

  kyc_legal_entity: {
    key: "kyc_legal_entity",
    name: "KYC Juristische Person",
    desc: "Sorgfaltspflicht-Checkliste für juristische Personen",
    icon: icons.building,
    customerType: "legal_entity",
    legalBasis: "Art. 3-5 AMLA, VSB 20",
    reviewIntervalDays: 365,
    sections: [
      {
        title: "Firmenidentifikation",
        fields: [
          { id: "register_verified", label: "Handelsregistereintrag verifiziert?", type: "toggle", hint: "Art. 3 AMLA — Auszug Handelsregister" },
          { id: "register_date", label: "Datum des HR-Auszugs", type: "date" },
          { id: "statutes_available", label: "Statuten / Gesellschaftsvertrag vorhanden?", type: "toggle", hint: "VSB Art. 1" },
          { id: "operating_status", label: "Operative Tätigkeit", type: "select", options: ["Operativ tätig", "Holdinggesellschaft", "Sitzgesellschaft", "In Gründung", "In Liquidation"], hint: "Art. 13 Abs. 2 lit. h AMLO-FINMA" },
        ],
      },
      {
        title: "Kontrollstruktur & wirtschaftlich Berechtigte",
        fields: [
          { id: "bo_identified", label: "Wirtschaftlich Berechtigte identifiziert?", type: "toggle", hint: "Art. 4 AMLA, VSB Art. 20" },
          { id: "bo_names", label: "Wirtschaftlich Berechtigte (Namen)", type: "textarea", placeholder: "Name(n) und Anteil(e)", hint: "VSB Formular A (>= 25%)" },
          { id: "control_structure", label: "Kontrollstruktur transparent?", type: "toggle", hint: "Art. 4 Abs. 2 AMLA" },
          { id: "nominee_shareholders", label: "Nominee-Aktionäre vorhanden?", type: "toggle", hint: "VSB Art. 21" },
          { id: "authorized_signatories", label: "Zeichnungsberechtigte Personen", type: "textarea", placeholder: "Name(n) und Funktion(en)" },
        ],
      },
      {
        title: "Geschäftsprofil",
        fields: [
          { id: "business_activity", label: "Geschäftstätigkeit", type: "textarea", placeholder: "Beschreibung der Haupttätigkeit", hint: "Art. 6 AMLA" },
          { id: "source_of_funds", label: "Herkunft der Vermögenswerte", type: "select", options: ["Geschäftstätigkeit", "Kapitaleinlagen", "Darlehen", "Verkaufserlöse", "Sonstige"], hint: "Art. 6 AMLA" },
          { id: "expected_tx_volume", label: "Erwartetes Transaktionsvolumen (jährlich)", type: "select", options: ["< CHF 100'000", "CHF 100'000-500'000", "CHF 500'000-5 Mio.", "> CHF 5 Mio."], hint: "Art. 13 AMLO-FINMA" },
        ],
      },
    ],
  },

  aml_checklist: {
    key: "aml_checklist",
    name: "AML-Checkliste",
    desc: "Geldwäscherei-Prüfung nach AMLA",
    icon: icons.shield,
    customerType: "both",
    legalBasis: "Art. 6-10 AMLA",
    reviewIntervalDays: 365,
    sections: [
      {
        title: "Sorgfaltspflichten",
        fields: [
          { id: "cdd_completed", label: "CDD vollständig durchgeführt?", type: "toggle", hint: "Art. 3-5 AMLA" },
          { id: "bo_declaration", label: "Erklärung zum wirtschaftlich Berechtigten eingeholt?", type: "toggle", hint: "Art. 4 AMLA" },
          { id: "purpose_verified", label: "Zweck der Geschäftsbeziehung geklärt?", type: "toggle", hint: "Art. 6 Abs. 1 AMLA" },
          { id: "source_of_funds_verified", label: "Herkunft der Vermögenswerte abgeklärt?", type: "toggle", hint: "Art. 6 Abs. 2 AMLA" },
        ],
      },
      {
        title: "Screening & Überwachung",
        fields: [
          { id: "sanction_screening", label: "Sanktionslisten-Screening durchgeführt?", type: "toggle", hint: "SECO / EU / OFAC / UN" },
          { id: "sanction_result", label: "Ergebnis Sanktionsprüfung", type: "select", options: ["Kein Treffer", "Treffer — abgeklärt (False Positive)", "Treffer — eskaliert"], hint: "Sanktionsprüfung" },
          { id: "pep_screening", label: "PEP-Screening durchgeführt?", type: "toggle", hint: "Art. 2a AMLA" },
          { id: "adverse_media", label: "Adverse-Media-Prüfung", type: "select", options: ["Keine negativen Befunde", "Befunde — abgeklärt", "Befunde — eskaliert"], hint: "Enhanced Due Diligence" },
          { id: "ongoing_monitoring", label: "Laufende Überwachung eingerichtet?", type: "toggle", hint: "Art. 20 AMLO-FINMA" },
        ],
      },
      {
        title: "Dokumentation",
        fields: [
          { id: "file_complete", label: "Kundendossier vollständig?", type: "toggle", hint: "Art. 7 AMLA — Dokumentationspflicht" },
          { id: "missing_docs", label: "Fehlende Unterlagen", type: "textarea", placeholder: "Falls unvollständig: welche Unterlagen fehlen?" },
          { id: "compliance_assessment", label: "Compliance-Beurteilung", type: "select", options: ["Geschäftsbeziehung unbedenklich", "Erhöhte Aufmerksamkeit erforderlich", "Geschäftsbeziehung problematisch", "MROS-Meldepflicht prüfen"], hint: "Art. 9 AMLA" },
        ],
      },
    ],
  },

  formular_a_k: {
    key: "formular_a_k",
    name: "Formular A/K (WB-Erklärung)",
    desc: "Feststellung des wirtschaftlich Berechtigten",
    icon: icons.doc,
    customerType: "both",
    legalBasis: "VSB Art. 20-23",
    reviewIntervalDays: 730,
    sections: [
      {
        title: "Vertragspartei",
        fields: [
          { id: "contracting_party", label: "Vertragspartei (Kunde)", type: "text", hint: "Name gemäss Ausweisdokument / HR-Eintrag" },
          { id: "account_relationship", label: "Art der Geschäftsbeziehung", type: "select", options: ["Konto/Depot", "Vermögensverwaltung", "Zahlungsverkehr", "Kreditgeschäft", "Sonstige"], hint: "VSB Art. 20" },
        ],
      },
      {
        title: "Wirtschaftlich Berechtigter (Formular A)",
        fields: [
          { id: "bo_declaration_type", label: "Erklärung gemäss", type: "select", options: ["Formular A (natürliche Person)", "Formular K (Kontrollinhaber)", "Formular I (Gründer Trust/Stiftung)", "Formular S (Ermessens-/Begünstigte Trust)"], hint: "VSB Art. 20-23" },
          { id: "bo_full_name", label: "Name des wirtschaftlich Berechtigten", type: "text", placeholder: "Vorname Nachname", hint: "VSB Art. 20 Abs. 1" },
          { id: "bo_address", label: "Adresse des wirtschaftlich Berechtigten", type: "textarea", placeholder: "Vollständige Adresse" },
          { id: "bo_nationality", label: "Nationalität", type: "text", placeholder: "z.B. Schweiz" },
          { id: "bo_ownership_percentage", label: "Beteiligungsanteil (%)", type: "number", placeholder: "z.B. 100", hint: "VSB Art. 20 — >= 25%" },
        ],
      },
      {
        title: "Bestätigung",
        fields: [
          { id: "declaration_signed", label: "Erklärung unterschrieben?", type: "toggle", hint: "VSB Art. 20 Abs. 3" },
          { id: "declaration_date", label: "Datum der Erklärung", type: "date" },
          { id: "changes_since_last", label: "Änderungen seit letzter Erklärung?", type: "toggle", hint: "VSB Art. 23" },
          { id: "change_details", label: "Details zu Änderungen", type: "textarea", placeholder: "Falls ja: was hat sich geändert?" },
        ],
      },
    ],
  },

  pep_screening: {
    key: "pep_screening",
    name: "PEP-Screening",
    desc: "Prüfung auf politisch exponierte Personen",
    icon: icons.search,
    customerType: "both",
    legalBasis: "Art. 2a AMLA",
    reviewIntervalDays: 365,
    sections: [
      {
        title: "PEP-Prüfung",
        fields: [
          { id: "screening_date", label: "Datum des Screenings", type: "date" },
          { id: "screening_tool", label: "Screening-Tool / Datenbank", type: "select", options: ["World-Check (Refinitiv)", "Dow Jones Risk & Compliance", "LexisNexis", "Manuelle Prüfung", "Sonstige"], hint: "PEP-Datenbank" },
          { id: "pep_result", label: "Screening-Ergebnis", type: "select", options: ["Kein PEP", "PEP identifiziert", "Nahestehende Person identifiziert", "Unklar — weitere Abklärung nötig"], hint: "Art. 2a AMLA" },
          { id: "pep_type", label: "PEP-Kategorie (falls zutreffend)", type: "select", options: ["Nicht zutreffend", "Inländische PEP", "Ausländische PEP", "PEP internationaler Organisation"], hint: "Art. 2a Abs. 1 AMLA" },
        ],
      },
      {
        title: "PEP-Details (falls identifiziert)",
        fields: [
          { id: "pep_function", label: "Öffentliche Funktion", type: "text", placeholder: "z.B. Parlamentsmitglied, Minister" },
          { id: "pep_country", label: "Land der Funktion", type: "text", placeholder: "z.B. Schweiz, Deutschland" },
          { id: "pep_since", label: "PEP seit / Funktion seit", type: "date" },
          { id: "relationship_to_pep", label: "Beziehung zur PEP (falls nahestehend)", type: "select", options: ["Nicht zutreffend", "Ehepartner/Lebenspartner", "Kind", "Elternteil", "Geschäftspartner", "Sonstige nahestehende Person"], hint: "Art. 2a Abs. 2 AMLA" },
        ],
      },
      {
        title: "Massnahmen",
        fields: [
          { id: "gl_approval", label: "Genehmigung Geschäftsleitung eingeholt?", type: "toggle", hint: "Art. 13 Abs. 3 AMLO-FINMA" },
          { id: "edd_measures", label: "EDD-Massnahmen", type: "multi", options: ["Erhöhtes Monitoring", "Herkunft Vermögen abgeklärt", "GL-Genehmigung", "Periodische Überprüfung (6 Monate)", "Zusätzliche Dokumentation"], hint: "Art. 15 AMLO-FINMA" },
          { id: "assessment_notes", label: "Beurteilung / Begründung", type: "textarea", placeholder: "Dokumentation der Risikobeurteilung", hint: "Art. 7 AMLA" },
        ],
      },
    ],
  },

  transaction_monitoring: {
    key: "transaction_monitoring",
    name: "Transaktionsüberwachung",
    desc: "Überwachung und Dokumentation von Transaktionen",
    icon: icons.search,
    customerType: "both",
    legalBasis: "Art. 20 AMLO-FINMA",
    reviewIntervalDays: 180,
    sections: [
      {
        title: "Monitoring-Konfiguration",
        fields: [
          { id: "monitoring_frequency", label: "Überwachungsfrequenz", type: "select", options: ["Echtzeit", "Täglich", "Wöchentlich", "Monatlich"], hint: "Art. 20 AMLO-FINMA" },
          { id: "monitoring_type", label: "Monitoring-Art", type: "select", options: ["Regelbasiert", "Manuell", "KI-gestützt", "Kombiniert"], hint: "Art. 20 AMLO-FINMA" },
          { id: "alert_threshold", label: "Alert-Schwellenwert (CHF)", type: "select", options: ["5'000", "10'000", "15'000", "25'000", "100'000", "Individuell"], hint: "Art. 14 AMLO-FINMA" },
          { id: "tx_types_monitored", label: "Überwachte Transaktionstypen", type: "multi", options: ["Banküberweisungen", "Barzahlungen", "Kreditkarten", "Crypto-Transaktionen", "Internationale Transfers", "Wertpapier-Transaktionen"], hint: "Regelsets" },
        ],
      },
      {
        title: "Überprüfung aktueller Periode",
        fields: [
          { id: "review_period", label: "Überprüfungszeitraum", type: "text", placeholder: "z.B. Q1 2026" },
          { id: "total_transactions", label: "Anzahl Transaktionen (Periode)", type: "number", placeholder: "z.B. 47" },
          { id: "total_volume", label: "Gesamtvolumen (CHF)", type: "text", placeholder: "z.B. 250'000" },
          { id: "alerts_generated", label: "Generierte Alerts", type: "number", placeholder: "z.B. 3" },
          { id: "alerts_cleared", label: "Abgeklärte Alerts (kein Verdacht)", type: "number" },
          { id: "suspicious_activity", label: "Verdächtige Aktivitäten festgestellt?", type: "toggle", hint: "Art. 9 AMLA — Meldepflicht" },
        ],
      },
      {
        title: "Beurteilung",
        fields: [
          { id: "unusual_patterns", label: "Ungewöhnliche Transaktionsmuster", type: "textarea", placeholder: "Beschreibung falls vorhanden" },
          { id: "mros_reporting", label: "MROS-Meldung erforderlich?", type: "select", options: ["Nein", "Prüfung läuft", "Ja — Meldung erstellt", "Ja — Meldung eingereicht"], hint: "Art. 9 AMLA" },
          { id: "next_actions", label: "Nächste Schritte / Massnahmen", type: "textarea", placeholder: "Geplante Massnahmen" },
        ],
      },
    ],
  },
};

/** Get templates applicable to a given customer type */
export function getTemplatesForType(customerType: "natural_person" | "legal_entity"): CustomerTemplate[] {
  return Object.values(CUSTOMER_TEMPLATES).filter(
    (t) => t.customerType === "both" || t.customerType === customerType,
  );
}
