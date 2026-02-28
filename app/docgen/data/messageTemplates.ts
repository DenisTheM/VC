export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "annual_review",
    name: "Jährliche Überprüfung",
    category: "Erinnerung",
    subject: "Jährliche Compliance-Überprüfung fällig",
    body: `{{contactSalutation}} {{contactName}},

die jährliche Compliance-Überprüfung für {{orgName}} steht an. Bitte prüfen Sie die folgenden Punkte:

- Aktualität aller Compliance-Dokumente
- Überprüfung der Risikobewertung
- Aktualisierung des KYC-Kundenstamms
- Schulungsnachweis der Mitarbeitenden

Bitte melden Sie sich bei Fragen. Wir unterstützen Sie gerne bei der Vorbereitung.

Freundliche Grüsse
Virtue Compliance`,
  },
  {
    id: "reg_update",
    name: "Regulatorisches Update",
    category: "Information",
    subject: "Wichtiges regulatorisches Update",
    body: `{{contactSalutation}} {{contactName}},

wir möchten Sie über ein wichtiges regulatorisches Update informieren, das {{orgName}} betrifft.

Bitte prüfen Sie die Details in Ihrem Portal unter "Meldungen". Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.

Freundliche Grüsse
Virtue Compliance`,
  },
  {
    id: "deadline_warning",
    name: "Frist-Mahnung",
    category: "Warnung",
    subject: "Dringende Frist: Handlungsbedarf",
    body: `{{contactSalutation}} {{contactName}},

eine wichtige Compliance-Frist für {{orgName}} nähert sich. Bitte stellen Sie sicher, dass alle erforderlichen Massnahmen rechtzeitig umgesetzt werden.

Offene Punkte finden Sie in Ihrem Portal unter "Meldungen". Bei Fragen stehen wir gerne bereit.

Freundliche Grüsse
Virtue Compliance`,
  },
  {
    id: "welcome",
    name: "Willkommen",
    category: "Onboarding",
    subject: "Willkommen bei Virtue Compliance",
    body: `{{contactSalutation}} {{contactName}},

herzlich willkommen bei Virtue Compliance! Wir freuen uns, {{orgName}} als neuen Kunden begrüssen zu dürfen.

In Ihrem Portal finden Sie:
- Regulatorische Meldungen und Updates
- Ihre Compliance-Dokumente
- Kundenverwaltung (KYC/KYB)
- Direkten Kontakt zu Ihrer Beraterin

Bitte vervollständigen Sie Ihr Firmenprofil, damit wir Ihnen massgeschneiderte Compliance-Dokumente erstellen können.

Freundliche Grüsse
Virtue Compliance`,
  },
  {
    id: "doc_ready",
    name: "Dokument bereit",
    category: "Information",
    subject: "Neues Compliance-Dokument bereit zur Prüfung",
    body: `{{contactSalutation}} {{contactName}},

ein neues Compliance-Dokument für {{orgName}} wurde erstellt und steht zur Prüfung bereit. Sie finden es in Ihrem Portal unter "Dokumente".

Bitte prüfen Sie das Dokument und geben Sie es frei, sofern alles korrekt ist.

Freundliche Grüsse
Virtue Compliance`,
  },
];

/** Replace template placeholders with actual org data */
export function fillTemplate(
  template: MessageTemplate,
  org: { name: string; contact_name?: string | null; contact_salutation?: string | null },
): { subject: string; body: string } {
  const contactName = org.contact_name || "Damen und Herren";
  const contactSalutation = org.contact_salutation || (org.contact_name ? "Sehr geehrte(r)" : "Sehr geehrte");

  const replace = (text: string) =>
    text
      .replace(/\{\{orgName\}\}/g, org.name)
      .replace(/\{\{contactName\}\}/g, contactName)
      .replace(/\{\{contactSalutation\}\}/g, contactSalutation);

  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}
