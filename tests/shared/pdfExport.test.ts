import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock fns are available in the hoisted vi.mock factory
const {
  mockText, mockLine, mockRect, mockSave, mockAddPage,
  mockSetFontSize, mockSetFont, mockSetTextColor,
  mockSetDrawColor, mockSetLineWidth, mockGetTextWidth,
  mockSplitTextToSize,
} = vi.hoisted(() => ({
  mockText: vi.fn(),
  mockLine: vi.fn(),
  mockRect: vi.fn(),
  mockSave: vi.fn(),
  mockAddPage: vi.fn(),
  mockSetFontSize: vi.fn(),
  mockSetFont: vi.fn(),
  mockSetTextColor: vi.fn(),
  mockSetDrawColor: vi.fn(),
  mockSetLineWidth: vi.fn(),
  mockGetTextWidth: vi.fn(() => 20),
  mockSplitTextToSize: vi.fn((text: string) => [text]),
}));

vi.mock("jspdf", () => ({
  jsPDF: class MockJsPDF {
    text = mockText;
    line = mockLine;
    rect = mockRect;
    save = mockSave;
    addPage = mockAddPage;
    setFontSize = mockSetFontSize;
    setFont = mockSetFont;
    setTextColor = mockSetTextColor;
    setDrawColor = mockSetDrawColor;
    setLineWidth = mockSetLineWidth;
    getTextWidth = mockGetTextWidth;
    splitTextToSize = mockSplitTextToSize;
  },
}));

import { exportDocumentAsPdf } from "../../app/shared/lib/pdfExport";

const baseOpts = {
  name: "Test Document",
  version: "v1.0",
  content: "",
  orgName: "Test AG",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSplitTextToSize.mockImplementation((text: string) => [text]);
});

// ─── Separator Lines ───────────────────────────────────────────────────

describe("Separator lines", () => {
  it("renders --- as separator line", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "---" });

    expect(mockSetDrawColor).toHaveBeenCalledWith(200, 200, 200);
    expect(mockSetLineWidth).toHaveBeenCalledWith(0.2);
    expect(mockLine).toHaveBeenCalled();
  });

  it("renders === as separator line", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "===" });

    expect(mockSetDrawColor).toHaveBeenCalledWith(200, 200, 200);
    expect(mockLine).toHaveBeenCalled();
  });

  it("renders %%%%% as separator line", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "%%%%%" });

    expect(mockSetDrawColor).toHaveBeenCalledWith(200, 200, 200);
    expect(mockLine).toHaveBeenCalled();
  });

  it("renders longer --- separators", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "----------" });

    expect(mockLine).toHaveBeenCalled();
  });
});

// ─── Checkboxes ────────────────────────────────────────────────────────

describe("Checkboxes", () => {
  it("renders unchecked checkbox - [ ] Text", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "- [ ] Prüfung durchgeführt" });

    expect(mockRect).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining("Prüfung durchgeführt"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("renders checked checkbox - [x] Text with checkmark", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "- [x] Identität verifiziert" });

    expect(mockRect).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalledWith(
      "\u2713",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("renders legacy & checkbox", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "& Checkbox-Text" });

    expect(mockRect).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining("Checkbox-Text"),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

// ─── Form Fields ───────────────────────────────────────────────────────

describe("Form fields", () => {
  it("renders Label: ___________ as label + form line", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "Name: ___________" });

    expect(mockText).toHaveBeenCalledWith(
      "Name:",
      expect.any(Number),
      expect.any(Number),
    );
    expect(mockSetDrawColor).toHaveBeenCalledWith(160, 160, 160);
    expect(mockLine).toHaveBeenCalled();
  });

  it("renders standalone ___________ as full-width line", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "___________" });

    expect(mockSetDrawColor).toHaveBeenCalledWith(160, 160, 160);
    expect(mockLine).toHaveBeenCalled();
  });
});

// ─── Headings ──────────────────────────────────────────────────────────

describe("Headings", () => {
  it("renders # Heading as H1", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "# Überschrift 1" });

    expect(mockSetFontSize).toHaveBeenCalledWith(16);
    expect(mockSetFont).toHaveBeenCalledWith("helvetica", "bold");
  });

  it("renders ## Heading as H2", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "## Überschrift 2" });

    expect(mockSetFontSize).toHaveBeenCalledWith(13);
  });

  it("renders ### Heading as H3", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "### Überschrift 3" });

    expect(mockSetFontSize).toHaveBeenCalledWith(11);
  });
});

// ─── List Items ────────────────────────────────────────────────────────

describe("List items", () => {
  it("renders - list item with bullet", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "- Punkt eins" });

    expect(mockText).toHaveBeenCalledWith(
      "\u2022",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("renders numbered list", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "1. Erster Punkt" });

    expect(mockText).toHaveBeenCalledWith(
      "\u2022",
      expect.any(Number),
      expect.any(Number),
    );
  });
});

// ─── Paragraphs ────────────────────────────────────────────────────────

describe("Paragraphs", () => {
  it("renders regular text as paragraph", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "Dies ist ein Absatz." });

    expect(mockSetFontSize).toHaveBeenCalledWith(10);
    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining("Dies ist ein Absatz."),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("strips bold markdown markers", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "Text mit **fettem** Wort" });

    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining("Text mit fettem Wort"),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

// ─── General ───────────────────────────────────────────────────────────

describe("General", () => {
  it("saves PDF with correct filename", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "Test" });

    expect(mockSave).toHaveBeenCalledWith("Test Document.pdf");
  });

  it("renders header and footer", () => {
    exportDocumentAsPdf({ ...baseOpts, content: "Test" });

    expect(mockText).toHaveBeenCalledWith(
      "Virtue Compliance",
      expect.any(Number),
      expect.any(Number),
    );
    expect(mockText).toHaveBeenCalledWith(
      "Seite 1",
      expect.any(Number),
      expect.any(Number),
      expect.any(Object),
    );
  });

  it("handles mixed content without errors", () => {
    const content = [
      "# Haupttitel",
      "",
      "## Abschnitt 1",
      "Ein normaler Absatz.",
      "- Punkt A",
      "- Punkt B",
      "---",
      "- [ ] Aufgabe 1",
      "- [x] Aufgabe 2",
      "& Legacy Checkbox",
      "Name: ___________",
      "___________",
      "1. Nummeriert",
      "Text mit **Markdown**",
    ].join("\n");

    expect(() => exportDocumentAsPdf({ ...baseOpts, content })).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });
});
