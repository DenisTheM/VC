// goAML v5 XML Generator for MROS Verdachtsmeldungen
// Generates XSD-conformant XML for submission to MROS (Swiss FIU)

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | undefined | null, indent = "    "): string {
  if (value === undefined || value === null || value === "") return "";
  return `${indent}<${name}>${esc(value)}</${name}>\n`;
}

export interface SarFormData {
  // Verdachtsgrund
  suspicion_type?: string;
  suspicion_indicators?: string;
  urgency?: string;
  // Betroffene Person
  subject_type?: string;
  subject_name?: string;
  subject_dob?: string;
  subject_nationality?: string;
  subject_address?: string;
  subject_id_number?: string;
  account_number?: string;
  // Transaktionen
  tx_description?: string;
  tx_total_amount?: string;
  tx_currency?: string;
  tx_period_from?: string;
  tx_period_to?: string;
  tx_counterparties?: string;
  // Begründung
  narrative?: string;
  measures_taken?: string;
  asset_freeze?: boolean;
  frozen_amount?: string;
}

export interface ReportingEntity {
  name: string;
  uid?: string;
  sro?: string;
  contact_name?: string;
  contact_email?: string;
}

/**
 * Generate goAML v5 XML from SAR form data
 */
export function generateGoamlXml(
  data: SarFormData,
  entity: ReportingEntity,
  referenceId?: string,
): string {
  const now = new Date().toISOString().split("T")[0];
  const ref = referenceId ?? `SAR-${Date.now()}`;

  const suspicionCode = mapSuspicionType(data.suspicion_type);
  const isEntity = data.subject_type === "Juristische Person";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<goAMLReport xmlns="http://www.fatf-gafi.org/goAML" version="5.0">\n`;
  xml += `  <reportIndicator>STR</reportIndicator>\n`;
  xml += `  <reportCode>${esc(ref)}</reportCode>\n`;
  xml += `  <reportDate>${now}</reportDate>\n`;
  xml += `  <reportingPriority>${data.urgency === "Sofort (Vermögenssperre)" ? "HIGH" : data.urgency === "Erhöht" ? "MEDIUM" : "NORMAL"}</reportingPriority>\n`;

  // Reporting Entity
  xml += `  <reportingEntity>\n`;
  xml += tag("name", entity.name, "    ");
  xml += tag("identifier", entity.uid, "    ");
  xml += tag("sroAffiliation", entity.sro, "    ");
  if (entity.contact_name || entity.contact_email) {
    xml += `    <contactPerson>\n`;
    xml += tag("name", entity.contact_name, "      ");
    xml += tag("email", entity.contact_email, "      ");
    xml += `    </contactPerson>\n`;
  }
  xml += `  </reportingEntity>\n`;

  // Report
  xml += `  <report>\n`;
  xml += tag("suspicionType", suspicionCode, "    ");
  xml += tag("suspicionIndicators", data.suspicion_indicators, "    ");

  // Person / Entity involved
  if (isEntity) {
    xml += `    <entityInvolved>\n`;
    xml += tag("entityName", data.subject_name, "      ");
    xml += tag("incorporationDate", data.subject_dob, "      ");
    xml += tag("incorporationCountry", data.subject_nationality, "      ");
    xml += tag("address", data.subject_address, "      ");
    xml += tag("identifier", data.subject_id_number, "      ");
    xml += `    </entityInvolved>\n`;
  } else {
    xml += `    <personInvolved>\n`;
    xml += tag("name", data.subject_name, "      ");
    xml += tag("birthDate", data.subject_dob, "      ");
    xml += tag("nationality", data.subject_nationality, "      ");
    xml += tag("address", data.subject_address, "      ");
    xml += tag("idNumber", data.subject_id_number, "      ");
    xml += `    </personInvolved>\n`;
  }

  // Account
  if (data.account_number) {
    xml += `    <accountInfo>\n`;
    xml += tag("accountNumber", data.account_number, "      ");
    xml += `    </accountInfo>\n`;
  }

  // Transaction info
  xml += `    <transactionInfo>\n`;
  xml += tag("description", data.tx_description, "      ");
  xml += tag("totalAmount", data.tx_total_amount, "      ");
  xml += tag("currency", data.tx_currency, "      ");
  xml += tag("dateFrom", data.tx_period_from, "      ");
  xml += tag("dateTo", data.tx_period_to, "      ");
  xml += tag("counterparties", data.tx_counterparties, "      ");
  xml += `    </transactionInfo>\n`;

  // Narrative
  xml += `    <narrative>\n`;
  xml += `      <text>${esc(data.narrative ?? "")}</text>\n`;
  xml += `    </narrative>\n`;

  // Measures
  if (data.measures_taken || data.asset_freeze) {
    xml += `    <measuresTaken>\n`;
    xml += tag("description", data.measures_taken, "      ");
    if (data.asset_freeze) {
      xml += `      <assetFreeze>true</assetFreeze>\n`;
      xml += tag("frozenAmount", data.frozen_amount, "      ");
    }
    xml += `    </measuresTaken>\n`;
  }

  xml += `  </report>\n`;
  xml += `</goAMLReport>\n`;

  return xml;
}

function mapSuspicionType(type?: string): string {
  switch (type) {
    case "Geldwäscherei": return "ML";
    case "Terrorismusfinanzierung": return "TF";
    case "Organisierte Kriminalität": return "OC";
    case "Betrug": return "FRAUD";
    case "Korruption": return "CORRUPTION";
    case "Steuerhinterziehung": return "TAX";
    default: return "OTHER";
  }
}

/**
 * Validate SAR data completeness
 */
export function validateSarData(data: SarFormData): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!data.suspicion_type) missing.push("Verdachtsgrund");
  if (!data.suspicion_indicators) missing.push("Verdachtsindikatoren");
  if (!data.urgency) missing.push("Dringlichkeit");
  if (!data.subject_name) missing.push("Name der betroffenen Person/Firma");
  if (!data.tx_description) missing.push("Transaktionsbeschreibung");
  if (!data.tx_total_amount) missing.push("Gesamtbetrag");
  if (!data.tx_currency) missing.push("Währung");
  if (!data.tx_period_from) missing.push("Zeitraum von");
  if (!data.tx_period_to) missing.push("Zeitraum bis");
  if (!data.narrative) missing.push("Begründung");
  return { valid: missing.length === 0, missing };
}
