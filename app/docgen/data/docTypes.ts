import type { FieldDef } from "@shared/components/Field";

export interface DocType {
  icon: string;
  name: string;
  desc: string;
  time: string;
  complexity: string;
  jurisdictions: string[];
  legal: string;
  chapters: string[];
  fields: FieldDef[];
}

export const DOC_TYPES: Record<string, DocType> = {
  aml_policy: {
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    name: "AML-Richtlinie",
    desc: "Interne Geldwäschereirichtlinie nach GwG/AMLA",
    time: "3-4 Min",
    complexity: "Hoch",
    jurisdictions: ["CH", "DE"],
    legal: "Art. 24-26 AMLO-FINMA, Art. 3-11a AMLA",
    chapters: ["Zweck & Geltungsbereich", "Organisatorische Zuständigkeiten", "Risikokategorisierung", "Identifikation Vertragspartei", "Wirtschaftlich Berechtigte", "Erhöhte Sorgfaltspflicht", "Transaktionsüberwachung", "Meldepflicht (MROS)", "Schulung", "Aufbewahrung", "Revision"],
    fields: [
      { id: "id_method", label: "Wie identifizieren Sie Ihre Kunden?", type: "multi", options: ["Face-to-face", "Video-Identifikation", "Digital (z.B. Sumsub)", "Post-Ident"], hint: "Art. 3-5 AMLA" },
      { id: "highrisk_approval", label: "Wer genehmigt Hochrisiko-Geschäftsbeziehungen?", type: "select", options: ["Compliance Officer", "Geschäftsleitung", "Verwaltungsrat", "4-Augen-Prinzip (CO + GL)"], hint: "Art. 19 AMLO-FINMA" },
      { id: "auto_monitoring", label: "Automatisiertes Transaktionsmonitoring?", type: "toggle", hint: "Art. 20 AMLO-FINMA" },
      { id: "sanction_lists", label: "Welche Sanktionslisten prüfen Sie?", type: "multi", options: ["SECO (Schweiz)", "EU-Sanktionsliste", "OFAC (USA)", "UN-Sanktionsliste"], hint: "Sanktionsprüfung" },
      { id: "training_freq", label: "Schulungsfrequenz Mitarbeitende", type: "select", options: ["Jährlich", "Halbjährlich", "Quartalsweise", "Bei Eintritt + jährlich"], hint: "Art. 26 AMLO-FINMA" },
      { id: "deputy_co", label: "Stellvertretender Compliance Officer", type: "text", hint: "Art. 24 AMLO-FINMA" },
      { id: "pep_relations", label: "Geschäftsbeziehungen mit PEPs?", type: "toggle", hint: "Art. 2a AMLA" },
      { id: "correspondent_banks", label: "Nutzung von Korrespondenzbanken?", type: "toggle", hint: "Art. 13 Abs. 2 lit. g AMLO-FINMA" },
      { id: "cash_over_15k", label: "Barzahlungen über CHF 15'000?", type: "toggle", hint: "Art. 3 Abs. 5 AMLA" },
      { id: "risk_appetite", label: "Risikoappetit", type: "select", options: ["Konservativ", "Moderat", "Erhöht"], hint: "Art. 25 AMLO-FINMA" },
    ],
  },
  kyc_checklist: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    name: "KYC-Checkliste",
    desc: "Kundenidentifikation & Sorgfaltspflichten",
    time: "2-3 Min",
    complexity: "Mittel",
    jurisdictions: ["CH", "DE"],
    legal: "Art. 3-5 AMLA, VSB/CDB 20",
    chapters: ["Vertragspartei-Identifikation", "Wirtschaftlich Berechtigte", "Kontrollinhaber", "PEP-Screening", "Sanktionslisten", "Adverse Media", "Risikokategorie"],
    fields: [
      { id: "client_type", label: "Kundentyp", type: "select", options: ["Natürliche Person", "Juristische Person (AG/GmbH)", "Trust / Stiftung", "Verein / NPO"], hint: "CDD-Anforderungen pro Typ" },
      { id: "onboard_channel", label: "Onboarding-Kanal", type: "select", options: ["Vor Ort (physisch)", "Remote / Video-Identifikation", "Rein digital", "Kombiniert"], hint: "Art. 3 Abs. 1-4 AMLA" },
      { id: "expected_volume", label: "Erwartetes Transaktionsvolumen", type: "select", options: ["< CHF 25'000/Jahr", "CHF 25'000-100'000", "CHF 100'000-1 Mio.", "> CHF 1 Mio./Jahr"], hint: "Art. 13 AMLO-FINMA" },
      { id: "highrisk_country", label: "Kunde in Hochrisikoland?", type: "toggle", hint: "Art. 13 Abs. 2 AMLO-FINMA" },
      { id: "complex_structure", label: "Komplexe Firmenstruktur?", type: "toggle", hint: "Art. 13 Abs. 2 lit. h AMLO-FINMA" },
      { id: "crypto_client", label: "Kunde im Crypto/DLT-Bereich?", type: "toggle", hint: "FINMA Guidance 02/2019" },
      { id: "edd_fields", label: "Enhanced Due Diligence inkludieren?", type: "toggle", hint: "Art. 15 AMLO-FINMA" },
    ],
  },
  risk_assessment: {
    icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    name: "Risikoklassifizierung",
    desc: "Risikokategorisierung nach FINMA",
    time: "2-3 Min",
    complexity: "Mittel",
    jurisdictions: ["CH", "DE"],
    legal: "Art. 25 Abs. 2 AMLO-FINMA, Aufsichtsmitteilung 05/2023",
    chapters: ["Geografische Präsenz", "Kundendomizile", "Kundensegmente", "Produkte", "Inhärentes Risiko", "Kontrollmassnahmen", "Nettorisiko"],
    fields: [
      { id: "client_domicile_dist", label: "Verteilung Kundendomizile", type: "select", options: ["Überwiegend Schweiz (>80%)", "Schweiz + EU (>60% CH)", "International gemischt", "Überwiegend Drittstaaten"], hint: "Inhärentes geogr. Risiko" },
      { id: "pep_share", label: "Anteil PEPs im Portfolio", type: "select", options: ["Keine PEPs", "< 5%", "5-20%", "> 20%"], hint: "Art. 13 Abs. 2 AMLO-FINMA" },
      { id: "domiciliary_share", label: "Anteil Sitzgesellschaften", type: "select", options: ["Keine", "< 10%", "10-30%", "> 30%"], hint: "Art. 13 Abs. 2 lit. h" },
      { id: "max_tx_value", label: "Höchster Transaktionswert (Ø)", type: "select", options: ["< CHF 10'000", "CHF 10'000-100'000", "CHF 100'000-1 Mio.", "> CHF 1 Mio."], hint: "Art. 14 AMLO-FINMA" },
      { id: "cash_share", label: "Anteil Barzahlungen", type: "select", options: ["Keine", "< 10%", "10-30%", "> 30%"], hint: "Art. 14 Abs. 3" },
      { id: "controls", label: "Bestehende Kontrollmassnahmen", type: "multi", options: ["Automatisiertes Monitoring", "Schulungen", "4-Augen-Prinzip", "Externe Audits", "Sanktionslisten-Screening", "PEP-Screening"], hint: "Kontrollrisiko" },
    ],
  },
  audit_prep: {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    name: "Audit-Vorbereitung",
    desc: "Checkliste für SRO-Jahresprüfung",
    time: "3-4 Min",
    complexity: "Mittel",
    jurisdictions: ["CH"],
    legal: "Art. 24-28 AMLA, SRO-Reglemente",
    chapters: ["Organisation", "KYC-Dossiers", "Monitoring", "Schulungen", "Risikoanalyse", "MROS", "Offene Punkte"],
    fields: [
      { id: "audit_date", label: "Nächstes Audit-Datum", type: "date", hint: "Zeitplanung" },
      { id: "auditor", label: "Prüfgesellschaft / SRO-Prüfer", type: "text", hint: "Kontaktdaten" },
      { id: "audit_type", label: "Art der Prüfung", type: "select", options: ["Ordentliche Prüfung", "Ausserordentliche Prüfung", "Erstprüfung"], hint: "Prüfungsumfang" },
      { id: "prev_findings", label: "Beanstandungen letzte Prüfung?", type: "toggle", hint: "Nachverfolgung" },
      { id: "mros_reports", label: "MROS-Meldungen eingereicht?", type: "toggle", hint: "Dokumentationspflicht" },
      { id: "new_highrisk", label: "Neue Hochrisiko-Beziehungen?", type: "toggle", hint: "Prüferfokus" },
      { id: "trainings_documented", label: "Alle Schulungen dokumentiert?", type: "toggle", hint: "Art. 26 AMLO-FINMA" },
      { id: "controls_of_controls", label: "Controls of Controls durchgeführt?", type: "toggle", hint: "FINMA 05/2023" },
    ],
  },
  kyt_policy: {
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    name: "Transaktionsüberwachung",
    desc: "KYT-Monitoring Policy",
    time: "3-4 Min",
    complexity: "Hoch",
    jurisdictions: ["CH", "DE"],
    legal: "Art. 20 AMLO-FINMA, Art. 6 & 9 AMLA",
    chapters: ["Monitoring-Ansatz", "Regelsets", "Schwellenwerte", "Eskalation", "False Positives", "Dokumentation"],
    fields: [
      { id: "monitoring_type", label: "Art des Monitorings", type: "select", options: ["Manuell", "Regelbasiert", "KI-gestützt", "Kombiniert"], hint: "Art. 20 AMLO-FINMA" },
      { id: "tx_types", label: "Überwachte Transaktionstypen", type: "multi", options: ["Banküberweisungen", "Kartenzahlungen", "Crypto", "Bargeld", "Leasingraten", "Internationale Transfers"], hint: "Regelsets" },
      { id: "alert_thresholds", label: "Alert-Schwellenwert (CHF)", type: "select", options: ["5'000", "10'000", "15'000", "25'000", "100'000"], hint: "Art. 14 AMLO-FINMA" },
      { id: "escalation_levels", label: "Eskalationsstufen", type: "multi", options: ["Analyst prüft", "CO entscheidet", "GL informiert", "MROS-Meldung"], hint: "Art. 25-26 AMLO-FINMA" },
      { id: "rule_review", label: "Review-Frequenz", type: "select", options: ["Monatlich", "Quartalsweise", "Halbjährlich", "Jährlich"], hint: "Angemessenheitsprüfung" },
      { id: "crypto_rules", label: "Crypto-spezifische Regeln?", type: "toggle", hint: "FINMA Guidance 02/2019" },
      { id: "travel_rule", label: "Travel Rule Compliance?", type: "toggle", hint: "AMLO-FINMA Art. 10" },
    ],
  },
  annual_report: {
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    name: "Compliance-Jahresbericht",
    desc: "Jährlicher Statusbericht",
    time: "5-7 Min",
    complexity: "Hoch",
    jurisdictions: ["CH"],
    legal: "Art. 25 AMLO-FINMA, Art. 6 Abs. 1 AMLO-FINMA",
    chapters: ["Zusammenfassung", "Kundenbasis", "Transaktionen", "Meldungen", "Schulungen", "Kontrollen", "Massnahmenplan"],
    fields: [
      { id: "report_year", label: "Berichtsjahr", type: "select", options: ["2025", "2024", "2023"], hint: "Referenzperiode" },
      { id: "new_clients_normal", label: "Neukunden – Normales Risiko", type: "number", hint: "Quantitative Analyse" },
      { id: "new_clients_elevated", label: "Neukunden – Erhöhtes Risiko", type: "number", hint: "Quantitative Analyse" },
      { id: "terminated_relations", label: "Beendete Geschäftsbeziehungen", type: "number" },
      { id: "mros_count", label: "MROS-Meldungen eingereicht", type: "number", hint: "Art. 9 AMLA" },
      { id: "tx_alerts", label: "Transaktions-Alerts total", type: "number", hint: "Effektivität Monitoring" },
      { id: "false_positive_rate", label: "False-Positive-Rate (%)", type: "number" },
      { id: "trainings_done", label: "Durchgeführte Schulungen (Details)", type: "textarea", hint: "Art. 26 AMLO-FINMA" },
      { id: "planned_measures", label: "Geplante Massnahmen Folgejahr", type: "textarea", hint: "Vorausschauende Planung" },
    ],
  },
};
