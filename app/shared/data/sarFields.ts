// SAR (Suspicious Activity Report) fields — goAML v5 Schema
// Used by MROS Verdachtsmeldungs-Wizard

import type { FormField } from "./formAFields";

export const SAR_FIELDS: FormField[] = [
  // Step 1: Verdachtsgrund
  { id: "suspicion_type", label: "Art des Verdachts", type: "select", section: "Verdachtsgrund", required: true, options: ["Geldwäscherei", "Terrorismusfinanzierung", "Organisierte Kriminalität", "Betrug", "Korruption", "Steuerhinterziehung", "Andere Vortat"] },
  { id: "suspicion_indicators", label: "Verdachtsindikatoren", type: "textarea", section: "Verdachtsgrund", required: true, placeholder: "Welche konkreten Anhaltspunkte liegen vor?" },
  { id: "urgency", label: "Dringlichkeit", type: "select", section: "Verdachtsgrund", required: true, options: ["Normal", "Erhöht", "Sofort (Vermögenssperre)"] },

  // Step 2: Betroffene Person/Firma
  { id: "subject_type", label: "Betroffener Typ", type: "select", section: "Betroffene Person/Firma", required: true, options: ["Natürliche Person", "Juristische Person"] },
  { id: "subject_name", label: "Name / Firma", type: "text", section: "Betroffene Person/Firma", required: true },
  { id: "subject_dob", label: "Geburtsdatum / Gründungsdatum", type: "date", section: "Betroffene Person/Firma", required: false },
  { id: "subject_nationality", label: "Nationalität / Sitz", type: "text", section: "Betroffene Person/Firma", required: false },
  { id: "subject_address", label: "Adresse", type: "textarea", section: "Betroffene Person/Firma", required: false },
  { id: "subject_id_number", label: "Ausweis-/UID-Nummer", type: "text", section: "Betroffene Person/Firma", required: false },
  { id: "account_number", label: "Kontonummer / IBAN", type: "text", section: "Betroffene Person/Firma", required: false },

  // Step 3: Transaktionen
  { id: "tx_description", label: "Beschreibung der verdächtigen Transaktionen", type: "textarea", section: "Verdächtige Transaktionen", required: true, placeholder: "Chronologische Beschreibung der relevanten Transaktionen" },
  { id: "tx_total_amount", label: "Gesamtbetrag (CHF)", type: "text", section: "Verdächtige Transaktionen", required: true, placeholder: "z.B. 150'000" },
  { id: "tx_currency", label: "Währung", type: "select", section: "Verdächtige Transaktionen", required: true, options: ["CHF", "EUR", "USD", "GBP", "BTC", "ETH", "Andere"] },
  { id: "tx_period_from", label: "Zeitraum von", type: "date", section: "Verdächtige Transaktionen", required: true },
  { id: "tx_period_to", label: "Zeitraum bis", type: "date", section: "Verdächtige Transaktionen", required: true },
  { id: "tx_counterparties", label: "Gegenparteien", type: "textarea", section: "Verdächtige Transaktionen", required: false, placeholder: "Beteiligte Dritte, Begünstigte" },

  // Step 4: Begründung
  { id: "narrative", label: "Ausführliche Begründung", type: "textarea", section: "Begründung", required: true, placeholder: "Detaillierte Darstellung des Sachverhalts und der Verdachtsmomente" },
  { id: "measures_taken", label: "Bereits ergriffene Massnahmen", type: "textarea", section: "Begründung", required: false, placeholder: "z.B. Geschäftsbeziehung eingefroren, Vermögenssperre" },
  { id: "asset_freeze", label: "Vermögenssperre veranlasst?", type: "toggle", section: "Begründung", required: true },
  { id: "frozen_amount", label: "Gesperrter Betrag (CHF)", type: "text", section: "Begründung", required: false },
];

export const SAR_SECTIONS = [
  "Verdachtsgrund",
  "Betroffene Person/Firma",
  "Verdächtige Transaktionen",
  "Begründung",
];

export const SAR_WIZARD_STEPS = [
  { id: 1, label: "Verdachtsgrund", section: "Verdachtsgrund" },
  { id: 2, label: "Betroffene Person", section: "Betroffene Person/Firma" },
  { id: 3, label: "Transaktionen", section: "Verdächtige Transaktionen" },
  { id: 4, label: "Begründung", section: "Begründung" },
  { id: 5, label: "Vorschau & Export", section: "preview" },
];
