import { T } from "@shared/styles/tokens";

export interface RegAlert {
  id: string;
  title: string;
  source: string;
  jurisdiction: string;
  date: string;
  severity: "critical" | "high" | "medium" | "info";
  status: "draft" | "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed";
  category: string;
  summary: string;
  legalBasis: string;
  deadline: string;
  affectedClients: { name: string; reason: string; risk: "high" | "medium" | "low" }[];
  elenaComment: string;
  actionItems: { text: string; priority: "high" | "medium" | "low"; due: string }[];
}

export const REG_ALERTS: RegAlert[] = [
  {
    id: "ra-001",
    title: "GwG-Totalrevision: Transparenzregister & erweiterte Sorgfaltspflichten",
    source: "Bundesrat / Parlament",
    jurisdiction: "CH",
    date: "14. Feb 2026",
    severity: "critical",
    status: "new",
    category: "GwG / AMLA",
    summary: "Die Totalrevision des Geldwäschereigesetzes bringt ein zentrales Transparenzregister für wirtschaftlich Berechtigte und erweitert die Sorgfaltspflichten auf Berater, Immobilienmakler und Edelmetallhändler. Bargeldschwelle wird von CHF 100'000 auf CHF 15'000 gesenkt.",
    legalBasis: "GwG-Revision (BBl 2024), Art. 2, 3, 4, 5, 6 GwG (neu)",
    deadline: "Voraussichtlich Q3 2026",
    affectedClients: [
      { name: "Align Technology", reason: "Leasing-Programm unterfällt neuen Schwellenwerten", risk: "high" },
      { name: "oomnium AG", reason: "Effektenhandel — erweiterte UBO-Dokumentation erforderlich", risk: "high" },
      { name: "SwissFintech AG", reason: "Crypto-Custody betroffen durch neue Travel Rule Schwellenwerte", risk: "medium" },
    ],
    elenaComment: "Das ist die grösste Änderung im Schweizer AML-Recht seit Jahren. Für unsere Kunden bedeutet das konkret: (1) Align muss die KYC-Prozesse im Leasing-Onboarding anpassen — die neue Bargeldschwelle von CHF 15'000 betrifft auch Leasingraten. (2) oomnium braucht ein Update der internen Weisung für das UBO-Register. (3) Alle Kunden brauchen eine Anpassung der AML-Richtlinie vor Q3 2026. Ich empfehle, ab sofort die neuen Anforderungen in die Dokument-Templates einzubauen und Kunden proaktiv zu informieren.",
    actionItems: [
      { text: "AML-Richtlinien aller Kunden auf neue Schwellenwerte aktualisieren", priority: "high", due: "Q2 2026" },
      { text: "UBO-Register-Prozess für jur. Personen dokumentieren", priority: "high", due: "Q2 2026" },
      { text: "Kunden-Webinar zu GwG-Revision durchführen", priority: "medium", due: "März 2026" },
      { text: "Sumsub-Workflow auf neue CDD-Felder erweitern", priority: "medium", due: "Q3 2026" },
    ],
  },
  {
    id: "ra-002",
    title: "FINMA: Verschärfte Anforderungen an Krypto-Verwahrung & Staking",
    source: "FINMA Aufsichtsmitteilung 01/2026",
    jurisdiction: "CH",
    date: "10. Feb 2026",
    severity: "high",
    status: "new",
    category: "Krypto / DLT",
    summary: "FINMA konkretisiert die Anforderungen an die Verwahrung von Kryptowerten (Custody) und stuft Staking-Dienstleistungen neu als bewilligungspflichtig ein.",
    legalBasis: "Art. 1b BankG, FINMA-Aufsichtsmitteilung 01/2026, AMLO-FINMA Art. 20",
    deadline: "31. Dez 2026",
    affectedClients: [
      { name: "SwissFintech AG", reason: "Betreibt Crypto-Custody für Endkunden", risk: "high" },
      { name: "BlockPay GmbH", reason: "Staking-Service muss neu bewilligt werden", risk: "high" },
    ],
    elenaComment: "Betrifft primär unsere Crypto-Kunden. SwissFintech muss das Custody-Risiko-Framework bis Q4 erweitern — ich schlage vor, das in die nächste Audit-Vorbereitung einzubauen.",
    actionItems: [
      { text: "Crypto-Custody-Risiko-Framework für SwissFintech erweitern", priority: "high", due: "Q3 2026" },
      { text: "Staking-Bewilligungspflicht für BlockPay abklären mit SRO", priority: "high", due: "März 2026" },
      { text: "KYT-Policy-Template um Crypto-spezifische Regeln ergänzen", priority: "medium", due: "Q2 2026" },
    ],
  },
  {
    id: "ra-003",
    title: "AMLO-FINMA: Travel Rule Schwellenwert auf CHF 0 gesenkt",
    source: "FINMA / FATF",
    jurisdiction: "CH",
    date: "5. Feb 2026",
    severity: "high",
    status: "acknowledged",
    category: "Travel Rule",
    summary: "Die FINMA setzt die FATF-Empfehlungen vollständig um und senkt den Schwellenwert für die Übermittlung von Auftraggeberdaten bei Blockchain-Transaktionen auf CHF 0.",
    legalBasis: "AMLO-FINMA Art. 10 (revidiert), FATF Recommendation 16",
    deadline: "Sofort anwendbar",
    affectedClients: [
      { name: "SwissFintech AG", reason: "Alle Crypto-Transfers betroffen", risk: "high" },
      { name: "BlockPay GmbH", reason: "Payment-Processing über Blockchain", risk: "high" },
    ],
    elenaComment: "Die Änderung ist bereits in Kraft — hier besteht unmittelbarer Handlungsbedarf. Die Transaktionsüberwachung muss angepasst werden.",
    actionItems: [
      { text: "Travel Rule Compliance bei allen Crypto-Kunden überprüfen", priority: "high", due: "Feb 2026" },
      { text: "KYT-Monitoring Schwellenwerte anpassen (CHF 0)", priority: "high", due: "Sofort" },
    ],
  },
  {
    id: "ra-004",
    title: "BaFin: Aktualisierte Auslegungshinweise zum GwG — Erweiterte KYC-Pflichten",
    source: "BaFin",
    jurisdiction: "DE",
    date: "30. Jan 2026",
    severity: "medium",
    status: "acknowledged",
    category: "KYC / CDD",
    summary: "Die BaFin hat ihre Auslegungshinweise zum Geldwäschegesetz aktualisiert. Neu sind erweiterte Anforderungen an die laufende Überwachung von Geschäftsbeziehungen.",
    legalBasis: "§§ 10-17 GwG (DE), BaFin Auslegungshinweise 01/2026",
    deadline: "Sofort anwendbar",
    affectedClients: [
      { name: "FrankfurtPay GmbH", reason: "Payment-Dienstleister mit DE-Lizenz", risk: "medium" },
    ],
    elenaComment: "Relevant für unsere deutschen Kunden, insbesondere FrankfurtPay. Die KYC-Checklisten für Deutschland müssen ergänzt werden.",
    actionItems: [
      { text: "KYC-Checkliste DE-Template aktualisieren", priority: "medium", due: "Q2 2026" },
      { text: "Laufende Überwachung: Prozess-Update für DE-Kunden", priority: "low", due: "Q2 2026" },
    ],
  },
  {
    id: "ra-005",
    title: "FINMA-Aufsichtsmitteilung: Mängel bei Risikoanalysen festgestellt",
    source: "FINMA Aufsichtsmitteilung 05/2023 (Nachverfolgung 2026)",
    jurisdiction: "CH",
    date: "22. Jan 2026",
    severity: "info",
    status: "resolved",
    category: "Risiko-Framework",
    summary: "FINMA publiziert Follow-up zur Aufsichtsmitteilung 05/2023 über Mängel bei AML-Risikoanalysen. Betont erneut die vier Pflicht-Risikokategorien.",
    legalBasis: "Art. 25 Abs. 2 AMLO-FINMA, FINMA-Aufsichtsmitteilung 05/2023",
    deadline: "Laufend",
    affectedClients: [],
    elenaComment: "Keine direkte Auswirkung auf unsere Kunden, da wir die Risikoklassifizierung bereits nach den vier FINMA-Pflichtkategorien aufbauen.",
    actionItems: [
      { text: "Risikoklassifizierungs-Template gegen FINMA-Erwartungen validieren", priority: "low", due: "Q2 2026" },
    ],
  },
];

export const SEVERITY_CFG = {
  critical: { label: "Kritisch", bg: "#fef2f2", color: "#dc2626", border: "#ef4444", icon: "\u26a0\ufe0f" },
  high: { label: "Hoch", bg: "#fffbeb", color: "#d97706", border: "#f59e0b", icon: "\ud83d\udd36" },
  medium: { label: "Mittel", bg: "#f0fdf4", color: "#16654e", border: "#16654e", icon: "\ud83d\udd37" },
  info: { label: "Info", bg: T.s2, color: T.ink3, border: T.ink4, icon: "\u2139\ufe0f" },
} as const;

export const STATUS_CFG = {
  draft: { label: "Entwurf", bg: "#f3f4f6", color: "#6b7280" },
  new: { label: "Neu", bg: "#fef2f2", color: "#ef4444" },
  acknowledged: { label: "Gesehen", bg: "#fffbeb", color: "#f59e0b" },
  in_progress: { label: "In Bearbeitung", bg: "#eff6ff", color: "#3b82f6" },
  resolved: { label: "Erledigt", bg: "#ecf5f1", color: "#16654e" },
  dismissed: { label: "Verworfen", bg: "#fafafa", color: "#a1a1aa" },
} as const;
