import { useState } from "react";
import { T } from "@shared/styles/tokens";
import { SectionLabel } from "@shared/components/SectionLabel";
import type { ClientOrg } from "../lib/api";
import { ComplianceChecklistPage } from "./ComplianceChecklistPage";
import { ClientAuditReadiness } from "./ClientAuditReadiness";

interface Props {
  org: ClientOrg | null;
}

type HubTab = "checklist" | "readiness";

export function ComplianceHubPage({ org }: Props) {
  const [tab, setTab] = useState<HubTab>("checklist");

  if (!org) {
    return <div style={{ padding: "40px 48px", color: T.ink3, fontFamily: T.sans }}>Wird geladen...</div>;
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960, fontFamily: T.sans }}>
      <SectionLabel text="Compliance" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, margin: "0 0 20px", letterSpacing: "-0.5px" }}>
        Checkliste & Audit
      </h1>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
        {([
          { key: "checklist" as const, label: "Checkliste" },
          { key: "readiness" as const, label: "Prüfbereitschaft" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? T.accent : T.ink3,
              background: "none", fontFamily: T.sans,
              borderBottom: tab === t.key ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "checklist" && <ComplianceChecklistPage org={org} embedded />}
      {tab === "readiness" && <ClientAuditReadiness org={org} embedded />}
    </div>
  );
}
