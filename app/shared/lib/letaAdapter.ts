// LETA Transparenzregister Adapter Pattern
// Interface + Stub until LETA goes live (mid-2026)

export interface LetaUboEntry {
  name: string;
  birthDate: string;
  nationality: string;
  sharePercent: number;
  controlType: string;
}

export interface LetaResult {
  available: boolean;
  status: "not_available" | "matched" | "discrepancy" | "not_found";
  message: string;
  entries?: LetaUboEntry[];
  discrepancies?: string[];
}

export interface DiscrepancyReport {
  entityUid: string;
  declaredUbos: LetaUboEntry[];
  registryUbos: LetaUboEntry[];
  details: string;
}

export interface LetaAdapter {
  checkUbo(entityUid: string): Promise<LetaResult>;
  reportDiscrepancy(entityUid: string, details: DiscrepancyReport): Promise<void>;
}

/**
 * Stub adapter — used until LETA goes live
 */
export class LetaStubAdapter implements LetaAdapter {
  async checkUbo(_entityUid: string): Promise<LetaResult> {
    return {
      available: false,
      status: "not_available",
      message: "LETA Register ist noch nicht verfügbar (Go-Live voraussichtlich Mitte 2026).",
    };
  }

  async reportDiscrepancy(_entityUid: string, _details: DiscrepancyReport): Promise<void> {
    console.warn("LETA reportDiscrepancy called but LETA is not yet live.");
  }
}

/**
 * Real API adapter — used after LETA Go-Live
 */
export class LetaApiAdapter implements LetaAdapter {
  constructor(private apiUrl: string, private apiKey: string) {}

  async checkUbo(entityUid: string): Promise<LetaResult> {
    const response = await fetch(`${this.apiUrl}/check/${entityUid}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      return { available: true, status: "not_found", message: "Kein Eintrag gefunden." };
    }

    const data = await response.json();
    return {
      available: true,
      status: data.match ? "matched" : "discrepancy",
      message: data.message ?? "Prüfung abgeschlossen.",
      entries: data.entries,
      discrepancies: data.discrepancies,
    };
  }

  async reportDiscrepancy(entityUid: string, details: DiscrepancyReport): Promise<void> {
    await fetch(`${this.apiUrl}/report/${entityUid}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(details),
    });
  }
}

/**
 * Factory: returns the correct adapter based on environment
 */
export function createLetaAdapter(): LetaAdapter {
  // For now, always return stub. When LETA goes live, check env vars.
  return new LetaStubAdapter();
}

/**
 * LETA status display info
 */
export function letaStatusInfo(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "not_checked": return { label: "Nicht geprüft", color: "#6b7280", bg: "#f9fafb" };
    case "matched": return { label: "Übereinstimmung", color: "#16a34a", bg: "#f0fdf4" };
    case "discrepancy": return { label: "Abweichung", color: "#dc2626", bg: "#fef2f2" };
    case "pending_report": return { label: "Meldung ausstehend", color: "#ea580c", bg: "#fff7ed" };
    case "reported": return { label: "Gemeldet", color: "#2563eb", bg: "#eff6ff" };
    default: return { label: "Unbekannt", color: "#6b7280", bg: "#f9fafb" };
  }
}
