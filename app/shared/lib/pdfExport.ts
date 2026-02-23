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
