import { jsPDF } from "jspdf";

interface PdfExportOpts {
  name: string;
  version: string;
  content: string;
  legalBasis?: string;
  orgName?: string;
}

const MARGIN_LEFT = 25;
const MARGIN_RIGHT = 25;
const MARGIN_TOP = 35;
const MARGIN_BOTTOM = 25;
const LINE_HEIGHT = 6;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_H1 = 16;
const FONT_SIZE_H2 = 13;
const FONT_SIZE_H3 = 11;
const PAGE_WIDTH = 210; // A4

export function exportDocumentAsPdf(opts: PdfExportOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const maxWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  let y = MARGIN_TOP;
  let pageNum = 1;

  const addHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(15, 61, 46); // T.primary
    doc.setFont("helvetica", "bold");
    doc.text("Virtue Compliance", MARGIN_LEFT, 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(opts.orgName || "", PAGE_WIDTH - MARGIN_RIGHT, 12, { align: "right" });
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, 16, PAGE_WIDTH - MARGIN_RIGHT, 16);
  };

  const addFooter = () => {
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, 282, PAGE_WIDTH - MARGIN_RIGHT, 282);
    doc.text(`${opts.name} — ${opts.version}`, MARGIN_LEFT, 287);
    doc.text(
      new Date().toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }),
      PAGE_WIDTH / 2,
      287,
      { align: "center" },
    );
    doc.text(`Seite ${pageNum}`, PAGE_WIDTH - MARGIN_RIGHT, 287, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > 297 - MARGIN_BOTTOM) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addHeader();
    }
  };

  const renderText = (text: string, fontSize: number, style: "normal" | "bold" | "italic" = "normal", extraSpaceBefore = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setTextColor(17, 24, 39);

    const lines = doc.splitTextToSize(text, maxWidth);
    const lh = fontSize * 0.45;

    y += extraSpaceBefore;
    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, MARGIN_LEFT, y);
      y += lh;
    }
    y += 1;
  };

  const renderListItem = (text: string, indent = 0) => {
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);

    const bulletX = MARGIN_LEFT + indent;
    const textX = bulletX + 5;
    const textWidth = maxWidth - indent - 5;

    const lines = doc.splitTextToSize(text, textWidth);
    const lh = FONT_SIZE_BODY * 0.45;

    ensureSpace(lh);
    doc.text("\u2022", bulletX, y);
    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, textX, y);
      y += lh;
    }
    y += 1;
  };

  // Start rendering
  addHeader();

  // Title
  doc.setFontSize(FONT_SIZE_H1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 46);
  const titleLines = doc.splitTextToSize(opts.name, maxWidth);
  for (const line of titleLines) {
    doc.text(line, MARGIN_LEFT, y);
    y += FONT_SIZE_H1 * 0.45;
  }
  y += 2;

  // Meta info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Version ${opts.version}`, MARGIN_LEFT, y);
  if (opts.legalBasis) {
    doc.text(`Rechtsgrundlage: ${opts.legalBasis}`, MARGIN_LEFT, y + 4);
    y += 4;
  }
  y += LINE_HEIGHT + 4;

  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN_LEFT, y - 2, PAGE_WIDTH - MARGIN_RIGHT, y - 2);
  y += 4;

  // Parse content line by line
  const contentLines = opts.content.split("\n");

  for (const rawLine of contentLines) {
    const line = rawLine.trimEnd();

    // Headings
    if (line.startsWith("### ")) {
      renderText(line.slice(4), FONT_SIZE_H3, "bold", 4);
    } else if (line.startsWith("## ")) {
      renderText(line.slice(3), FONT_SIZE_H2, "bold", 6);
    } else if (line.startsWith("# ")) {
      renderText(line.slice(2), FONT_SIZE_H1, "bold", 8);
    }
    // List items
    else if (/^\s*[-*]\s/.test(line)) {
      const indent = line.search(/\S/);
      const text = line.replace(/^\s*[-*]\s+/, "");
      renderListItem(text, Math.min(indent, 10));
    }
    // Numbered lists
    else if (/^\s*\d+[.)]\s/.test(line)) {
      const text = line.replace(/^\s*\d+[.)]\s+/, "");
      renderListItem(text);
    }
    // Empty line
    else if (line.trim() === "") {
      y += LINE_HEIGHT * 0.6;
    }
    // Regular paragraph
    else {
      // Strip bold/italic markdown markers for PDF
      const cleaned = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/\*(.+?)\*/g, "$1");
      renderText(cleaned, FONT_SIZE_BODY);
    }
  }

  addFooter();
  doc.save(`${opts.name}.pdf`);
}

// ─── Customer Document PDF Export ───────────────────────────────────

interface CustomerDocPdfOpts {
  templateName: string;
  customerName: string;
  version: string;
  status: string;
  legalBasis: string;
  orgName: string;
  approvedAt?: string;
  sections: { title: string; fields: { id: string; label: string; type: string; options?: string[] }[] }[];
  data: Record<string, unknown>;
}

export function exportCustomerDocumentAsPdf(opts: CustomerDocPdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const maxWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  let y = MARGIN_TOP;
  let pageNum = 1;
  const fileName = `${opts.templateName} — ${opts.customerName}`;

  const addHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(15, 61, 46);
    doc.setFont("helvetica", "bold");
    doc.text("Virtue Compliance", MARGIN_LEFT, 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(opts.orgName, PAGE_WIDTH - MARGIN_RIGHT, 12, { align: "right" });
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, 16, PAGE_WIDTH - MARGIN_RIGHT, 16);
  };

  const addFooter = () => {
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, 282, PAGE_WIDTH - MARGIN_RIGHT, 282);
    doc.text(`${fileName} — ${opts.version}`, MARGIN_LEFT, 287);
    doc.text(
      new Date().toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }),
      PAGE_WIDTH / 2, 287, { align: "center" },
    );
    doc.text(`Seite ${pageNum}`, PAGE_WIDTH - MARGIN_RIGHT, 287, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > 297 - MARGIN_BOTTOM) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addHeader();
    }
  };

  // Start
  addHeader();

  // Title
  doc.setFontSize(FONT_SIZE_H1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 46);
  const titleLines = doc.splitTextToSize(opts.templateName, maxWidth);
  for (const line of titleLines) {
    doc.text(line, MARGIN_LEFT, y);
    y += FONT_SIZE_H1 * 0.45;
  }
  y += 2;

  // Subtitle: customer, version, status
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  const subtitle = [opts.customerName, opts.version, opts.status];
  if (opts.approvedAt) {
    try {
      subtitle.push("Freigabe: " + new Date(opts.approvedAt).toLocaleDateString("de-CH"));
    } catch { /* ignore */ }
  }
  doc.text(subtitle.join("  |  "), MARGIN_LEFT, y);
  y += 5;
  doc.text(`Rechtsgrundlage: ${opts.legalBasis}`, MARGIN_LEFT, y);
  y += LINE_HEIGHT + 4;

  // Separator
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN_LEFT, y - 2, PAGE_WIDTH - MARGIN_RIGHT, y - 2);
  y += 6;

  // Render sections and fields
  for (const section of opts.sections) {
    ensureSpace(14);
    doc.setFontSize(FONT_SIZE_H2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(section.title, MARGIN_LEFT, y);
    y += FONT_SIZE_H2 * 0.45 + 4;

    for (const field of section.fields) {
      const rawValue = opts.data[field.id];
      let displayValue = "—";

      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        if (typeof rawValue === "boolean") {
          displayValue = rawValue ? "Ja" : "Nein";
        } else if (Array.isArray(rawValue)) {
          displayValue = rawValue.join(", ") || "—";
        } else {
          displayValue = String(rawValue);
        }
      }

      // Label
      ensureSpace(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(field.label, MARGIN_LEFT, y);

      // Value — right-aligned or below for long text
      if (displayValue.length > 50) {
        y += 4;
        doc.setFontSize(FONT_SIZE_BODY);
        doc.setTextColor(17, 24, 39);
        const lines = doc.splitTextToSize(displayValue, maxWidth);
        for (const line of lines) {
          ensureSpace(5);
          doc.text(line, MARGIN_LEFT, y);
          y += FONT_SIZE_BODY * 0.45;
        }
        y += 2;
      } else {
        // Dots + value on same line
        doc.setFontSize(FONT_SIZE_BODY);
        doc.setTextColor(17, 24, 39);
        const labelWidth = doc.getTextWidth(field.label);
        const valueWidth = doc.getTextWidth(displayValue);
        const dotsWidth = maxWidth - labelWidth - valueWidth - 4;
        if (dotsWidth > 10) {
          const dotCount = Math.floor(dotsWidth / doc.getTextWidth("."));
          doc.setTextColor(200, 200, 200);
          doc.text(".".repeat(Math.max(dotCount, 3)), MARGIN_LEFT + labelWidth + 2, y);
        }
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.text(displayValue, PAGE_WIDTH - MARGIN_RIGHT, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        y += FONT_SIZE_BODY * 0.45 + 2;
      }
    }
    y += 4;
  }

  addFooter();
  doc.save(`${fileName}.pdf`);
}

// ─── Audit Trail PDF Export ─────────────────────────────────────────

interface AuditTrailPdfOpts {
  customerName: string;
  customerType: string;
  orgName: string;
  entries: { date: string; action: string; details: string; user: string }[];
}

export function exportAuditTrailAsPdf(opts: AuditTrailPdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const maxWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  let y = MARGIN_TOP;
  let pageNum = 1;
  const fileName = `Audit Trail — ${opts.customerName}`;
  const exportDate = new Date().toLocaleDateString("de-CH", {
    day: "numeric", month: "long", year: "numeric",
  });

  const COL_DATE = MARGIN_LEFT;
  const COL_ACTION = MARGIN_LEFT + 32;
  const COL_USER = MARGIN_LEFT + 72;
  const COL_DETAILS = MARGIN_LEFT + 108;
  const COL_DETAILS_WIDTH = PAGE_WIDTH - MARGIN_RIGHT - COL_DETAILS;

  const addHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(15, 61, 46);
    doc.setFont("helvetica", "bold");
    doc.text("Virtue Compliance", MARGIN_LEFT, 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(opts.orgName, PAGE_WIDTH - MARGIN_RIGHT, 12, { align: "right" });
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, 16, PAGE_WIDTH - MARGIN_RIGHT, 16);
  };

  const addFooter = () => {
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, 282, PAGE_WIDTH - MARGIN_RIGHT, 282);
    doc.text(fileName, MARGIN_LEFT, 287);
    doc.text(exportDate, PAGE_WIDTH / 2, 287, { align: "center" });
    doc.text(`Seite ${pageNum}`, PAGE_WIDTH - MARGIN_RIGHT, 287, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > 297 - MARGIN_BOTTOM) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
      addHeader();
      addTableHeader();
    }
  };

  const addTableHeader = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("Datum", COL_DATE, y);
    doc.text("Aktion", COL_ACTION, y);
    doc.text("Benutzer", COL_USER, y);
    doc.text("Details", COL_DETAILS, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 4;
  };

  // Start rendering
  addHeader();

  // Title
  doc.setFontSize(FONT_SIZE_H1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 46);
  doc.text(`Audit Trail — ${opts.customerName}`, MARGIN_LEFT, y);
  y += FONT_SIZE_H1 * 0.45 + 2;

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`${opts.customerType}  |  Export: ${exportDate}`, MARGIN_LEFT, y);
  y += LINE_HEIGHT + 4;

  // Separator
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN_LEFT, y - 2, PAGE_WIDTH - MARGIN_RIGHT, y - 2);
  y += 6;

  // Table header
  addTableHeader();

  // Table rows
  for (const entry of opts.entries) {
    const detailLines = doc.splitTextToSize(entry.details || "—", COL_DETAILS_WIDTH);
    const rowHeight = Math.max(detailLines.length * 3.5, 5);

    ensureSpace(rowHeight + 2);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);

    doc.text(entry.date, COL_DATE, y);
    doc.text(entry.action, COL_ACTION, y);

    // Truncate user name to fit column
    const userText = entry.user.length > 18 ? entry.user.slice(0, 17) + "…" : entry.user;
    doc.text(userText, COL_USER, y);

    for (let i = 0; i < detailLines.length; i++) {
      doc.text(detailLines[i], COL_DETAILS, y + i * 3.5);
    }

    y += rowHeight + 1.5;
  }

  if (opts.entries.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text("Keine Audit-Einträge vorhanden.", MARGIN_LEFT, y);
  }

  addFooter();
  doc.save(`${fileName}.pdf`);
}
