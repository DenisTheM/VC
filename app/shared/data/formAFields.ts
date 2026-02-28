// Form A — KYC for natural persons (VSB Art. 3)
// Sorgfaltspflichten bei der Aufnahme von Geschäftsbeziehungen

export interface FormField {
  id: string;
  label: string;
  type: "text" | "date" | "select" | "textarea" | "toggle";
  section: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export const FORM_A_FIELDS: FormField[] = [
  // Section 1: Identifikation
  { id: "last_name", label: "Nachname", type: "text", section: "Identifikation", required: true, placeholder: "Müller" },
  { id: "first_name", label: "Vorname", type: "text", section: "Identifikation", required: true, placeholder: "Hans" },
  { id: "date_of_birth", label: "Geburtsdatum", type: "date", section: "Identifikation", required: true },
  { id: "nationality", label: "Nationalität", type: "text", section: "Identifikation", required: true, placeholder: "CH" },
  { id: "residence_address", label: "Wohnsitzadresse", type: "textarea", section: "Identifikation", required: true, placeholder: "Musterstrasse 1, 8001 Zürich" },
  { id: "residence_country", label: "Wohnsitzland", type: "text", section: "Identifikation", required: true, placeholder: "CH" },

  // Section 2: Ausweisdokument
  { id: "id_type", label: "Ausweistyp", type: "select", section: "Ausweisdokument", required: true, options: ["Pass", "Identitätskarte", "Ausländerausweis", "Anderes"] },
  { id: "id_number", label: "Ausweisnummer", type: "text", section: "Ausweisdokument", required: true },
  { id: "id_issuing_authority", label: "Ausstellende Behörde", type: "text", section: "Ausweisdokument", required: true },
  { id: "id_issue_date", label: "Ausstellungsdatum", type: "date", section: "Ausweisdokument", required: true },
  { id: "id_expiry_date", label: "Ablaufdatum", type: "date", section: "Ausweisdokument", required: true },

  // Section 3: Wirtschaftlich Berechtigter
  { id: "is_beneficial_owner", label: "Handelt auf eigene Rechnung?", type: "toggle", section: "Wirtschaftlich Berechtigter", required: true, helpText: "Ist die identifizierte Person der wirtschaftlich Berechtigte?" },
  { id: "bo_name", label: "Name des wirtschaftlich Berechtigten", type: "text", section: "Wirtschaftlich Berechtigter", required: false, placeholder: "Nur ausfüllen wenn abweichend" },
  { id: "bo_address", label: "Adresse des wirtschaftlich Berechtigten", type: "textarea", section: "Wirtschaftlich Berechtigter", required: false },
  { id: "bo_relationship", label: "Beziehung zum Vertragspartner", type: "text", section: "Wirtschaftlich Berechtigter", required: false },

  // Section 4: Geschäftszweck
  { id: "business_purpose", label: "Zweck der Geschäftsbeziehung", type: "textarea", section: "Geschäftszweck & Mittelherkunft", required: true, placeholder: "Beschreibung des geplanten Geschäftszwecks" },
  { id: "source_of_funds", label: "Herkunft der Vermögenswerte", type: "select", section: "Geschäftszweck & Mittelherkunft", required: true, options: ["Gehalt/Lohn", "Geschäftstätigkeit", "Erbschaft", "Immobilienverkauf", "Investitionsertrag", "Schenkung", "Krypto/Mining", "Andere"] },
  { id: "source_of_funds_detail", label: "Details zur Mittelherkunft", type: "textarea", section: "Geschäftszweck & Mittelherkunft", required: false },
  { id: "expected_volume", label: "Erwartetes Transaktionsvolumen (jährlich)", type: "select", section: "Geschäftszweck & Mittelherkunft", required: true, options: ["< CHF 100'000", "CHF 100'000 – 500'000", "CHF 500'000 – 1 Mio", "CHF 1 – 5 Mio", "> CHF 5 Mio"] },

  // Section 5: PEP-Status
  { id: "is_pep", label: "Politisch exponierte Person (PEP)?", type: "toggle", section: "PEP-Status", required: true, helpText: "Ist der Kunde oder ein naher Angehöriger eine PEP?" },
  { id: "pep_function", label: "PEP-Funktion", type: "text", section: "PEP-Status", required: false, placeholder: "Nur ausfüllen bei PEP" },
  { id: "pep_country", label: "PEP-Land", type: "text", section: "PEP-Status", required: false },
];

export const FORM_A_SECTIONS = [
  "Identifikation",
  "Ausweisdokument",
  "Wirtschaftlich Berechtigter",
  "Geschäftszweck & Mittelherkunft",
  "PEP-Status",
];
