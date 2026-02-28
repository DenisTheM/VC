// SRO Compliance Package seed data
// Checklist items per SRO

export interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  required: boolean;
}

export interface SroPackage {
  sro: string;
  name: string;
  description: string;
  checklist: ChecklistItem[];
  documentTemplates: string[];
  reviewCycleMonths: number;
}

export const SRO_PACKAGES: SroPackage[] = [
  {
    sro: "VQF",
    name: "Basis-Paket",
    description: "VQF Compliance-Grundpaket für Finanzintermediäre",
    checklist: [
      { id: "vqf_1", text: "AML-Richtlinie aktuell und genehmigt", category: "Dokumente", required: true },
      { id: "vqf_2", text: "KYC-Checkliste vorhanden", category: "Dokumente", required: true },
      { id: "vqf_3", text: "Risikoanalyse durchgeführt", category: "Dokumente", required: true },
      { id: "vqf_4", text: "KYT-Richtlinie erstellt", category: "Dokumente", required: true },
      { id: "vqf_5", text: "Jahresbericht eingereicht", category: "Dokumente", required: true },
      { id: "vqf_6", text: "Kundenidentifikation dokumentiert", category: "Prozesse", required: true },
      { id: "vqf_7", text: "Transaktionsüberwachung implementiert", category: "Prozesse", required: true },
      { id: "vqf_8", text: "Verdachtsmeldungsprozess definiert", category: "Prozesse", required: true },
      { id: "vqf_9", text: "Mitarbeiterschulung durchgeführt", category: "Schulung", required: true },
      { id: "vqf_10", text: "Schulungsnachweis archiviert", category: "Schulung", required: true },
      { id: "vqf_11", text: "Jahresrevision geplant", category: "Fristen", required: true },
      { id: "vqf_12", text: "Dokumente fristgerecht aktualisiert", category: "Fristen", required: true },
      { id: "vqf_13", text: "Prüfbereite Unterlagen zusammengestellt", category: "Audit", required: false },
      { id: "vqf_14", text: "Mängelbeseitigung aus letzter Prüfung", category: "Audit", required: false },
      { id: "vqf_15", text: "Compliance-Officer designiert", category: "Organisation", required: true },
    ],
    documentTemplates: ["aml_policy", "kyc_checklist", "risk_assessment", "kyt_policy", "annual_report"],
    reviewCycleMonths: 12,
  },
  {
    sro: "PolyReg",
    name: "Basis-Paket",
    description: "PolyReg Compliance-Grundpaket",
    checklist: [
      { id: "pr_1", text: "AML-Richtlinie aktuell", category: "Dokumente", required: true },
      { id: "pr_2", text: "KYC-Checkliste vorhanden", category: "Dokumente", required: true },
      { id: "pr_3", text: "Risikoanalyse durchgeführt", category: "Dokumente", required: true },
      { id: "pr_4", text: "Kundenidentifikation dokumentiert", category: "Prozesse", required: true },
      { id: "pr_5", text: "Transaktionsüberwachung aktiv", category: "Prozesse", required: true },
      { id: "pr_6", text: "Verdachtsmeldungsprozess definiert", category: "Prozesse", required: true },
      { id: "pr_7", text: "Schulung durchgeführt", category: "Schulung", required: true },
      { id: "pr_8", text: "Jahresbericht erstellt", category: "Fristen", required: true },
      { id: "pr_9", text: "Dokumente aktualisiert", category: "Fristen", required: true },
      { id: "pr_10", text: "Prüfunterlagen bereit", category: "Audit", required: false },
      { id: "pr_11", text: "Compliance-Officer bestimmt", category: "Organisation", required: true },
      { id: "pr_12", text: "Organigramm aktuell", category: "Organisation", required: false },
    ],
    documentTemplates: ["aml_policy", "kyc_checklist", "risk_assessment"],
    reviewCycleMonths: 12,
  },
  {
    sro: "ARIF",
    name: "Basis-Paket",
    description: "ARIF Compliance-Grundpaket",
    checklist: [
      { id: "ar_1", text: "AML-Richtlinie aktuell", category: "Dokumente", required: true },
      { id: "ar_2", text: "Risikoanalyse durchgeführt", category: "Dokumente", required: true },
      { id: "ar_3", text: "KYT-Richtlinie vorhanden", category: "Dokumente", required: true },
      { id: "ar_4", text: "Kundenidentifikation dokumentiert", category: "Prozesse", required: true },
      { id: "ar_5", text: "Transaktionsüberwachung aktiv", category: "Prozesse", required: true },
      { id: "ar_6", text: "Verdachtsmeldungsprozess definiert", category: "Prozesse", required: true },
      { id: "ar_7", text: "Schulung durchgeführt", category: "Schulung", required: true },
      { id: "ar_8", text: "Jahresbericht erstellt", category: "Fristen", required: true },
      { id: "ar_9", text: "Prüfunterlagen bereit", category: "Audit", required: false },
      { id: "ar_10", text: "Compliance-Officer bestimmt", category: "Organisation", required: true },
    ],
    documentTemplates: ["aml_policy", "risk_assessment", "kyt_policy"],
    reviewCycleMonths: 12,
  },
  {
    sro: "SO-FIT",
    name: "Basis-Paket",
    description: "SO-FIT Compliance-Grundpaket",
    checklist: [
      { id: "sf_1", text: "AML-Richtlinie aktuell", category: "Dokumente", required: true },
      { id: "sf_2", text: "KYC-Checkliste vorhanden", category: "Dokumente", required: true },
      { id: "sf_3", text: "Risikoanalyse durchgeführt", category: "Dokumente", required: true },
      { id: "sf_4", text: "Kundenidentifikation dokumentiert", category: "Prozesse", required: true },
      { id: "sf_5", text: "Transaktionsüberwachung aktiv", category: "Prozesse", required: true },
      { id: "sf_6", text: "Schulung durchgeführt", category: "Schulung", required: true },
      { id: "sf_7", text: "Jahresbericht erstellt", category: "Fristen", required: true },
      { id: "sf_8", text: "Compliance-Officer bestimmt", category: "Organisation", required: true },
    ],
    documentTemplates: ["aml_policy", "kyc_checklist", "risk_assessment"],
    reviewCycleMonths: 12,
  },
];
