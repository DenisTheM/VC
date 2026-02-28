// Form K — KYC for legal entities (VSB Art. 4)
// Sorgfaltspflichten bei juristischen Personen

import type { FormField } from "./formAFields";

export const FORM_K_FIELDS: FormField[] = [
  // Section 1: Firmenangaben
  { id: "company_name", label: "Firmenname", type: "text", section: "Firmenangaben", required: true, placeholder: "Muster AG" },
  { id: "uid_number", label: "UID-Nummer", type: "text", section: "Firmenangaben", required: true, placeholder: "CHE-123.456.789" },
  { id: "legal_form", label: "Rechtsform", type: "select", section: "Firmenangaben", required: true, options: ["AG", "GmbH", "Genossenschaft", "Stiftung", "Verein", "Einzelfirma", "KmG", "Andere"] },
  { id: "registered_seat", label: "Sitz (Ort)", type: "text", section: "Firmenangaben", required: true, placeholder: "Zürich" },
  { id: "registered_address", label: "Geschäftsadresse", type: "textarea", section: "Firmenangaben", required: true },
  { id: "registration_date", label: "Gründungsdatum", type: "date", section: "Firmenangaben", required: false },
  { id: "hr_entry", label: "Handelsregister-Eintrag", type: "text", section: "Firmenangaben", required: true, placeholder: "HR des Kantons Zürich" },

  // Section 2: Zeichnungsberechtigte & Organe
  { id: "authorized_signatories", label: "Zeichnungsberechtigte Personen", type: "textarea", section: "Organe & Zeichnungsberechtigte", required: true, placeholder: "Name, Funktion, Unterschriftsart (z.B. Kollektiv zu zweit)" },
  { id: "board_members", label: "Verwaltungsrat / Stiftungsrat", type: "textarea", section: "Organe & Zeichnungsberechtigte", required: true, placeholder: "Namen und Funktionen" },
  { id: "management", label: "Geschäftsleitung", type: "textarea", section: "Organe & Zeichnungsberechtigte", required: false, placeholder: "Namen und Funktionen" },

  // Section 3: Kontrollinhaber / UBO
  { id: "ubo_type", label: "Art der Kontrolle", type: "select", section: "Kontrollinhaber (UBO)", required: true, options: ["Beteiligung ≥25%", "Stimmrecht ≥25%", "Anderweitige Kontrolle", "Keine identifizierbaren Kontrollinhaber"] },
  { id: "ubo_persons", label: "Kontrollinhaber / wirtschaftlich Berechtigte", type: "textarea", section: "Kontrollinhaber (UBO)", required: true, helpText: "Name, Geburtsdatum, Nationalität, Anteil/Art der Kontrolle für jeden UBO", placeholder: "Hans Müller, 01.01.1970, CH, 50% Aktien\nAnna Schmidt, 15.03.1980, DE, 30% Aktien" },
  { id: "ubo_chain", label: "Beteiligungskette", type: "textarea", section: "Kontrollinhaber (UBO)", required: false, helpText: "Bei indirekter Kontrolle: Beteiligungs-/Kontrollkette bis zum wirtschaftlich Berechtigten" },

  // Section 4: Geschäftstätigkeit
  { id: "business_activity", label: "Geschäftstätigkeit", type: "textarea", section: "Geschäftstätigkeit", required: true, placeholder: "Beschreibung der Haupttätigkeit" },
  { id: "industry", label: "Branche", type: "text", section: "Geschäftstätigkeit", required: true },
  { id: "source_of_funds", label: "Herkunft der Mittel", type: "select", section: "Geschäftstätigkeit", required: true, options: ["Geschäftstätigkeit/Umsatz", "Investitionsertrag", "Kapitaleinlage", "Darlehen", "Andere"] },
  { id: "source_of_funds_detail", label: "Details zur Mittelherkunft", type: "textarea", section: "Geschäftstätigkeit", required: false },
  { id: "expected_volume", label: "Erwartetes Transaktionsvolumen (jährlich)", type: "select", section: "Geschäftstätigkeit", required: true, options: ["< CHF 100'000", "CHF 100'000 – 500'000", "CHF 500'000 – 1 Mio", "CHF 1 – 5 Mio", "> CHF 5 Mio"] },

  // Section 5: Geo-Fokus & Risiko
  { id: "geo_focus", label: "Geographischer Geschäftsfokus", type: "text", section: "Geo-Fokus & Risiko", required: true, placeholder: "CH, DE, AT" },
  { id: "cross_border", label: "Grenzüberschreitende Geschäfte?", type: "toggle", section: "Geo-Fokus & Risiko", required: true },
  { id: "sanctions_exposure", label: "Sanktions-Exposition", type: "select", section: "Geo-Fokus & Risiko", required: false, options: ["Keine", "Gering", "Mittel", "Hoch"] },
];

export const FORM_K_SECTIONS = [
  "Firmenangaben",
  "Organe & Zeichnungsberechtigte",
  "Kontrollinhaber (UBO)",
  "Geschäftstätigkeit",
  "Geo-Fokus & Risiko",
];
