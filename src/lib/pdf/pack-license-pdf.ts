import PDFDocument from "pdfkit";
import { getClauses } from "./pack-license-clauses";
import type { LicenseType } from "@/types";

export interface LicensePdfInput {
  licenseNumber: string;
  packTitle: string;
  tier: LicenseType;
  buyerName: string;
  buyerEmail: string;
  beatTitles: string[];
  amountPaid: number;
  effectiveDate: Date;
  issuedDate: Date;
  receiptNumber: string;
  verificationHash?: string;
  supersedes?: {
    licenseNumber: string;
    previousTier: string;
    issuedDate: Date;
  };
}

const LICENSOR = {
  name: "Rajan Kumar Mishra",
  brand: "Trishul Beats",
  email: "trishulmusic111@gmail.com",
  website: "trishulbeats.com",
};

// Minimal brand palette — dark + one accent
const BRAND_DARK = "#0F172A";
const BRAND_ACCENT = "#A855F7"; // purple from the icon
const TEXT_PRIMARY = "#1E293B";
const TEXT_SECONDARY = "#64748B";
const TEXT_BODY = "#334155";
const BORDER_COLOR = "#E2E8F0";
const BG_SUBTLE = "#F8FAFC";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function tierLabel(tier: LicenseType): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// ─── Draw the trishul icon (vector, from icon.svg paths) ─────────

function drawTrishulIcon(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
  const s = size / 64;

  // Dark rounded square background
  doc
    .save()
    .roundedRect(x, y, size, size, 6 * s)
    .fill(BRAND_DARK);

  // Trident (T shape): horizontal top + vertical stem + crossbar
  doc
    .lineWidth(2.5 * s)
    .strokeColor("#FFFFFF")
    .lineCap("round")
    .lineJoin("round");

  // Top horizontal: M22 18 H42
  doc
    .moveTo(x + 22 * s, y + 18 * s)
    .lineTo(x + 42 * s, y + 18 * s)
    .stroke();

  // Vertical stem: M32 18 V46
  doc
    .moveTo(x + 32 * s, y + 18 * s)
    .lineTo(x + 32 * s, y + 46 * s)
    .stroke();

  // Crossbar: M24 28 H40
  doc
    .moveTo(x + 24 * s, y + 28 * s)
    .lineTo(x + 40 * s, y + 28 * s)
    .stroke();

  // Purple music dot: cx=46 cy=44 r=6
  doc
    .circle(x + 46 * s, y + 44 * s, 6 * s)
    .fill(BRAND_ACCENT);

  doc.restore();
}

// ─── Thin separator line ─────────────────────────────────────────

function separator(doc: PDFKit.PDFDocument, y?: number) {
  const lineY = y ?? doc.y;
  doc
    .moveTo(50, lineY)
    .lineTo(545, lineY)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();
  if (!y) doc.y = lineY + 8;
}

// ─── Page footer ─────────────────────────────────────────────────

function addPageFooter(
  doc: PDFKit.PDFDocument,
  licenseNumber: string,
  pageNumber: number,
  totalPages: number
) {
  const bottom = doc.page.height - 35;

  separator(doc, bottom - 8);

  doc
    .save()
    .fontSize(6.5)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text(
      licenseNumber,
      50,
      bottom,
      { width: 200 }
    )
    .text(
      `${LICENSOR.brand}  ·  ${LICENSOR.website}`,
      200,
      bottom,
      { width: 195, align: "center" }
    )
    .text(
      `Page ${pageNumber} of ${totalPages}`,
      395,
      bottom,
      { width: 150, align: "right" }
    )
    .restore();
}

// ─── Section heading ─────────────────────────────────────────────

function sectionHeading(doc: PDFKit.PDFDocument, text: string) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  const y = doc.y + 6;

  doc
    .fontSize(9.5)
    .font("Helvetica-Bold")
    .fillColor(TEXT_PRIMARY)
    .text(text, 50, y);

  doc.y = y + 14;
  separator(doc);
  doc.y += 2;
}

// ─── Appendix heading on new page ────────────────────────────────

function appendixHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.addPage();

  // Small icon top-left
  drawTrishulIcon(doc, 50, 45, 20);

  doc
    .fontSize(7)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text(LICENSOR.brand, 76, 50);

  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor(TEXT_PRIMARY)
    .text(title, 50, 80, { align: "center", width: 495 })
    .moveDown(0.6);

  separator(doc);
  doc.moveDown(0.4);
}

// ─── Main generator ──────────────────────────────────────────────

export async function generatePackLicensePdf(
  input: LicensePdfInput
): Promise<Buffer> {
  const clauses = getClauses(input.tier);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 55, left: 50, right: 50 },
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = 495; // usable width between margins

  // ────────────────────────────────────────────────────────────────
  // HEADER — icon + brand name + thin rule
  // ────────────────────────────────────────────────────────────────

  drawTrishulIcon(doc, 50, 45, 32);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor(TEXT_PRIMARY)
    .text("Trishul Beats", 90, 50);

  doc
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text(`${LICENSOR.website}  ·  ${LICENSOR.email}`, 90, 68);

  doc.y = 90;
  separator(doc);

  // ────────────────────────────────────────────────────────────────
  // TITLE BLOCK — centered, clean
  // ────────────────────────────────────────────────────────────────

  doc.moveDown(0.2);

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text("BEAT LICENSING", 50, doc.y, { align: "center", width: pageWidth });

  doc.moveDown(0.3);

  doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .fillColor(TEXT_PRIMARY)
    .text("Non-Exclusive License Agreement", 50, doc.y, {
      align: "center",
      width: pageWidth,
    });

  doc.moveDown(0.4);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(TEXT_BODY)
    .text(`[ ${input.packTitle} ]`, 50, doc.y, {
      align: "center",
      width: pageWidth,
    });

  doc.moveDown(0.2);

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(BRAND_ACCENT)
    .text(`${tierLabel(input.tier)} License`, 50, doc.y, {
      align: "center",
      width: pageWidth,
    });

  doc.moveDown(0.8);

  // ────────────────────────────────────────────────────────────────
  // PARTIES — clean two-column layout in a subtle box
  // ────────────────────────────────────────────────────────────────

  const boxTop = doc.y;
  const boxH = 74;

  doc
    .save()
    .roundedRect(50, boxTop, pageWidth, boxH, 3)
    .fill(BG_SUBTLE);
  doc
    .roundedRect(50, boxTop, pageWidth, boxH, 3)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke()
    .restore();

  const col1 = 62;
  const col2 = 310;
  let ly = boxTop + 10;

  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(TEXT_SECONDARY);
  doc.text("LICENSOR", col1, ly);
  doc.text("LICENSEE", col2, ly);
  ly += 13;

  doc.fontSize(9).font("Helvetica-Bold").fillColor(TEXT_PRIMARY);
  doc.text(LICENSOR.brand, col1, ly);
  doc.text(input.buyerName, col2, ly);
  ly += 14;

  doc.fontSize(8).font("Helvetica").fillColor(TEXT_BODY);
  doc.text(LICENSOR.name, col1, ly);
  doc.text(input.buyerEmail, col2, ly);
  ly += 12;

  doc.text(`${LICENSOR.email}  ·  ${LICENSOR.website}`, col1, ly);

  doc.y = boxTop + boxH + 14;

  // ────────────────────────────────────────────────────────────────
  // META ROW — license no, date, receipt
  // ────────────────────────────────────────────────────────────────

  const metaY = doc.y;
  const metaCol = [50, 210, 400];

  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(TEXT_SECONDARY);
  doc.text("LICENSE NO.", metaCol[0], metaY);
  doc.text("EFFECTIVE DATE", metaCol[1], metaY);
  doc.text("RECEIPT", metaCol[2], metaY);

  doc.fontSize(8.5).font("Helvetica").fillColor(TEXT_PRIMARY);
  doc.text(input.licenseNumber, metaCol[0], metaY + 11);
  doc.text(formatDate(input.effectiveDate), metaCol[1], metaY + 11);
  doc.text(input.receiptNumber, metaCol[2], metaY + 11);

  doc.y = metaY + 28;
  separator(doc);
  doc.moveDown(0.2);

  // ────────────────────────────────────────────────────────────────
  // PREAMBLE
  // ────────────────────────────────────────────────────────────────

  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor(TEXT_BODY)
    .text(
      `This Non-Exclusive License Agreement ("Agreement") is entered into by and between ${LICENSOR.name}, professionally known as ${LICENSOR.brand} ("Licensor"), and ${input.buyerName} ("Licensee"). This Agreement grants the Licensee the rights described herein to use the instrumental composition(s) included in the beat pack referenced above, subject to the terms and conditions set out below.`,
      50,
      doc.y,
      { width: pageWidth, lineGap: 2.5 }
    )
    .moveDown(0.6);

  // ────────────────────────────────────────────────────────────────
  // I. GENERAL TERMS
  // ────────────────────────────────────────────────────────────────

  sectionHeading(doc, "I.  General Terms");

  const generalTerms = [
    "Licensee is granted unlimited, non-exclusive rights to use the instrumental(s) included in the licensed beat pack.",
    clauses.filesDelivered,
    clauses.royalties,
    clauses.copyrightOwner,
    clauses.credit,
    clauses.term,
    clauses.proofOfPurchase,
  ];

  doc.fontSize(8.5).font("Helvetica").fillColor(TEXT_BODY);
  generalTerms.forEach((term, i) => {
    if (doc.y > doc.page.height - 70) doc.addPage();
    doc.text(`${i + 1}.  ${term}`, 58, doc.y, {
      width: pageWidth - 16,
      lineGap: 2,
      indent: 14,
    });
    doc.moveDown(0.25);
  });
  doc.moveDown(0.3);

  // ────────────────────────────────────────────────────────────────
  // II. USAGE RIGHTS
  // ────────────────────────────────────────────────────────────────

  sectionHeading(doc, `II.  ${clauses.usageRights.title}`);

  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor(TEXT_BODY)
    .text("The Licensee is permitted the following uses of the licensed instrumental(s):", 58, doc.y, { width: pageWidth - 16 })
    .moveDown(0.35);

  clauses.usageRights.items.forEach((item) => {
    if (doc.y > doc.page.height - 70) doc.addPage();
    doc.text(`  ·   ${item}`, 64, doc.y, { width: pageWidth - 24, lineGap: 1.5 });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.3);

  // ────────────────────────────────────────────────────────────────
  // III. RESTRICTIONS
  // ────────────────────────────────────────────────────────────────

  sectionHeading(doc, `III.  ${clauses.restrictions.title}`);

  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor(TEXT_BODY)
    .text("The Licensee is expressly prohibited from:", 58, doc.y, { width: pageWidth - 16 })
    .moveDown(0.35);

  clauses.restrictions.items.forEach((item) => {
    if (doc.y > doc.page.height - 70) doc.addPage();
    doc.text(`  ·   ${item}`, 64, doc.y, { width: pageWidth - 24, lineGap: 1.5 });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.3);

  // ────────────────────────────────────────────────────────────────
  // IV – VII. Short sections
  // ────────────────────────────────────────────────────────────────

  const shortSections: [string, string][] = [
    ["IV.  Refund Policy", clauses.refundPolicy],
    ["V.  Effective Date", clauses.effectiveDate],
    ["VI.  Ownership", clauses.ownership],
    ["VII.  Governing Law", clauses.governingLaw],
  ];

  for (const [heading, body] of shortSections) {
    sectionHeading(doc, heading);
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(TEXT_BODY)
      .text(body, 58, doc.y, { width: pageWidth - 16, lineGap: 2 })
      .moveDown(0.3);
  }

  // ────────────────────────────────────────────────────────────────
  // VIII. SIGNATURE
  // ────────────────────────────────────────────────────────────────

  sectionHeading(doc, "VIII.  Signature");

  if (doc.y > doc.page.height - 140) doc.addPage();

  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor(TEXT_BODY)
    .text("Signed for and on behalf of the Licensor,", 58, doc.y)
    .moveDown(1);

  // Mini icon next to signature
  drawTrishulIcon(doc, 58, doc.y, 22);

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(TEXT_PRIMARY)
    .text(LICENSOR.brand, 86, doc.y + 2);

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(TEXT_BODY)
    .text(LICENSOR.name, 86, doc.y + 16);

  doc.y += 36;
  doc
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text(`${LICENSOR.email}  ·  ${LICENSOR.website}`, 58, doc.y)
    .moveDown(0.8);

  doc
    .fontSize(7)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text(
      "This is a computer-generated agreement and does not require a physical signature. Proof of purchase serves as valid evidence of this license.",
      50,
      doc.y,
      { align: "center", width: pageWidth }
    );

  // ────────────────────────────────────────────────────────────────
  // APPENDIX A — TRACK LISTING
  // ────────────────────────────────────────────────────────────────

  appendixHeading(doc, "Appendix A — Licensed Tracks");

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(TEXT_SECONDARY)
    .text(
      `The following ${input.beatTitles.length} track(s) are covered under license ${input.licenseNumber}.`,
      50,
      doc.y,
      { align: "center", width: pageWidth }
    )
    .moveDown(0.8);

  // Table
  const tL = 60;
  const tR = 535;
  const tTop = doc.y;

  // Header row background
  doc.save().rect(tL, tTop, tR - tL, 18).fill(BG_SUBTLE).restore();
  doc
    .moveTo(tL, tTop)
    .lineTo(tR, tTop)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();

  doc.fontSize(7).font("Helvetica-Bold").fillColor(TEXT_SECONDARY);
  doc.text("#", tL + 8, tTop + 5, { width: 30 });
  doc.text("TRACK TITLE", tL + 42, tTop + 5, { width: 400 });

  const hBottom = tTop + 18;
  doc
    .moveTo(tL, hBottom)
    .lineTo(tR, hBottom)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();

  let rowY = hBottom + 5;
  doc.fontSize(8.5).font("Helvetica").fillColor(TEXT_BODY);

  input.beatTitles.forEach((title, i) => {
    if (rowY > doc.page.height - 70) {
      doc.addPage();
      rowY = 60;
    }

    // Alternate row shading
    if (i % 2 === 0) {
      doc.save().rect(tL, rowY - 3, tR - tL, 16).fill(BG_SUBTLE).restore();
    }

    doc.fillColor(TEXT_SECONDARY).text(String(i + 1), tL + 8, rowY, { width: 30 });
    doc.fillColor(TEXT_BODY).text(title, tL + 42, rowY, { width: 400 });
    rowY += 16;
  });

  doc
    .moveTo(tL, rowY + 1)
    .lineTo(tR, rowY + 1)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();

  doc.y = rowY + 6;

  // ────────────────────────────────────────────────────────────────
  // APPENDIX B — UPGRADE (conditional)
  // ────────────────────────────────────────────────────────────────

  if (input.supersedes) {
    appendixHeading(doc, "Appendix B — License Upgrade");

    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(TEXT_BODY)
      .text("This license agreement supersedes and replaces the previous license:", 58, doc.y, {
        width: pageWidth - 16,
        lineGap: 2.5,
      })
      .moveDown(0.8);

    // Upgrade details box
    const bTop = doc.y;
    const bH = 64;
    doc
      .save()
      .roundedRect(58, bTop, pageWidth - 16, bH, 3)
      .fill(BG_SUBTLE);
    doc
      .roundedRect(58, bTop, pageWidth - 16, bH, 3)
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .stroke()
      .restore();

    const bCol1 = 72;
    const bCol2 = 320;
    let bY = bTop + 10;

    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(TEXT_SECONDARY);
    doc.text("PREVIOUS LICENSE", bCol1, bY);
    doc.text("UPGRADED TO", bCol2, bY);
    bY += 13;

    doc.fontSize(8.5).font("Helvetica").fillColor(TEXT_PRIMARY);
    doc.text(input.supersedes.licenseNumber, bCol1, bY);
    doc.text(
      `${tierLabel(input.supersedes.previousTier as LicenseType)}  →  ${tierLabel(input.tier)}`,
      bCol2,
      bY
    );
    bY += 14;

    doc.fontSize(7.5).font("Helvetica").fillColor(TEXT_SECONDARY);
    doc.text(`Issued ${formatDate(input.supersedes.issuedDate)}`, bCol1, bY);
    doc.text(`New issue date: ${formatDate(input.issuedDate)}`, bCol2, bY);

    doc.y = bTop + bH + 16;

    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(TEXT_BODY)
      .text(
        "The original effective date and 99-year term remain unchanged. All rights and restrictions of the new license tier apply from the date of this upgrade.",
        58,
        doc.y,
        { width: pageWidth - 16, lineGap: 2.5 }
      );
  }

  // ────────────────────────────────────────────────────────────────
  // VERIFICATION SECTION
  // ────────────────────────────────────────────────────────────────

  if (input.verificationHash) {
    const verifySpaceNeeded = 90;
    if (doc.y > doc.page.height - verifySpaceNeeded - 55) doc.addPage();

    doc.y += 12;

    separator(doc);
    doc.moveDown(0.4);

    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(TEXT_SECONDARY)
      .text("DIGITAL VERIFICATION", 50, doc.y, { width: pageWidth });

    doc.moveDown(0.3);

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(TEXT_SECONDARY)
      .text(
        "This document is digitally signed by Trishul Beats. The verification hash below confirms the authenticity of this license agreement.",
        50,
        doc.y,
        { width: pageWidth }
      );

    doc.moveDown(0.4);

    const verifyBoxTop = doc.y;
    const verifyBoxH = 42;

    doc
      .save()
      .roundedRect(50, verifyBoxTop, pageWidth, verifyBoxH, 3)
      .fill(BG_SUBTLE);
    doc
      .roundedRect(50, verifyBoxTop, pageWidth, verifyBoxH, 3)
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .stroke()
      .restore();

    doc
      .fontSize(6.5)
      .font("Helvetica-Bold")
      .fillColor(TEXT_SECONDARY)
      .text("VERIFICATION HASH", 62, verifyBoxTop + 8);

    doc
      .fontSize(7)
      .font("Courier")
      .fillColor(TEXT_BODY)
      .text(input.verificationHash, 62, verifyBoxTop + 19, {
        width: pageWidth - 24,
      });

    const verifyUrl = `${LICENSOR.website}/profile/verify-license?license=${encodeURIComponent(input.licenseNumber)}`;
    doc
      .fontSize(6.5)
      .font("Helvetica")
      .fillColor(TEXT_SECONDARY)
      .text(`Verify at: ${verifyUrl}`, 62, verifyBoxTop + 30, {
        width: pageWidth - 24,
      });

    doc.y = verifyBoxTop + verifyBoxH + 8;
  }

  // ────────────────────────────────────────────────────────────────
  // PAGE NUMBERS (buffered) — skip any blank trailing page
  // ────────────────────────────────────────────────────────────────

  const range = doc.bufferedPageRange();
  let totalPages = range.count;

  // Detect blank trailing page: if the cursor on the last page is still
  // near the top margin, no content was written to it.
  const lastPageIdx = range.start + totalPages - 1;
  doc.switchToPage(lastPageIdx);
  const topMargin = doc.page.margins.top;
  if (totalPages > 1 && doc.y <= topMargin + 5) {
    totalPages -= 1;
  }

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    // Temporarily zero the bottom margin so writing near the page bottom
    // doesn't trigger PDFKit's auto-pagination and create blank pages.
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    addPageFooter(doc, input.licenseNumber, i + 1, totalPages);
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  return pdfReady;
}
