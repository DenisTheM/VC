export interface Jurisdiction {
  flag: string;
  name: string;
  reg: string;
  soon?: boolean;
}

export const JURIS: Record<string, Jurisdiction> = {
  CH: { flag: "🇨🇭", name: "Schweiz", reg: "FINMA / AMLA / SRO" },
  DE: { flag: "🇩🇪", name: "Deutschland", reg: "BaFin / GwG" },
  EU: { flag: "🇪🇺", name: "EU (AMLD)", reg: "6AMLD / AMLA-EU", soon: true },
};
