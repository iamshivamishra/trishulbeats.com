import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { formatErrorResponse, UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors";

const BRAND = {
  name: "Trishul Beats",
  tagline: "Premium Beats & Instrumentals",
  email: "trishulmusic111@gmail.com",
};

const BRAND_DARK = "#0F172A";
const BRAND_ACCENT = "#A855F7";
const TEXT_PRIMARY = "#1E293B";
const TEXT_SECONDARY = "#64748B";
const BORDER = "#E2E8F0";
const SUCCESS = "#16a34a";

function drawTrishulIcon(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
  const s = size / 64;
  doc.save().roundedRect(x, y, size, size, 6 * s).fill(BRAND_DARK);
  doc.lineWidth(2.5 * s).strokeColor("#FFFFFF").lineCap("round").lineJoin("round");
  doc.moveTo(x + 22 * s, y + 18 * s).lineTo(x + 42 * s, y + 18 * s).stroke();
  doc.moveTo(x + 32 * s, y + 18 * s).lineTo(x + 32 * s, y + 46 * s).stroke();
  doc.moveTo(x + 24 * s, y + 28 * s).lineTo(x + 40 * s, y + 28 * s).stroke();
  doc.circle(x + 46 * s, y + 44 * s, 4 * s).fill(BRAND_ACCENT);
  doc.restore();
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const order = await orderRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");

    if (order.buyerId.toString() !== session.user.id) {
      throw new ForbiddenError("You do not have access to this order");
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Receipt is only available for paid orders" },
        { status: 400 }
      );
    }

    const buyer = await userRepository.findById(session.user.id);
    const buyerName = buyer?.displayName || buyer?.name || "Customer";
    const buyerEmail = buyer?.email || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trishulbeats.com";
    const paidDate = formatDate(order.paidAt ?? order.createdAt);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // ─── Brand header bar ────────────────────────────────────────
    doc.save().rect(0, 0, 595.28, 90).fill(BRAND_DARK).restore();

    drawTrishulIcon(doc, 50, 18, 54);

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#FFFFFF")
      .text(BRAND.name, 115, 24);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BRAND_ACCENT)
      .text(BRAND.tagline, 115, 50);

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94A3B8")
      .text(appUrl, 115, 64);

    // ─── Receipt title + accent stripe ───────────────────────────
    doc
      .save()
      .rect(50, 105, 495, 3)
      .fill(BRAND_ACCENT)
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(TEXT_PRIMARY)
      .text("TRANSACTION RECEIPT", 50, 122);

    // ─── Order details card ──────────────────────────────────────
    const cardY = 150;
    doc
      .save()
      .roundedRect(50, cardY, 495, 80, 6)
      .fillAndStroke("#F8FAFC", BORDER)
      .restore();

    const leftCol = 65;
    const rightCol = 320;
    const row1 = cardY + 12;
    const row2 = row1 + 20;
    const row3 = row2 + 20;

    doc.fontSize(9).fillColor(TEXT_SECONDARY).font("Helvetica-Bold");
    doc.text("Receipt No", leftCol, row1);
    doc.text("Date", leftCol, row2);
    doc.text("Status", leftCol, row3);

    doc.font("Helvetica").fillColor(TEXT_PRIMARY);
    doc.text(order.receipt, leftCol + 75, row1);
    doc.text(paidDate, leftCol + 75, row2);

    doc.font("Helvetica-Bold").fillColor(SUCCESS).text("PAID", leftCol + 75, row3);

    doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT_SECONDARY);
    doc.text("Customer", rightCol, row1);
    doc.text("Email", rightCol, row2);
    if (order.razorpayPaymentId) doc.text("Payment ID", rightCol, row3);

    doc.font("Helvetica").fillColor(TEXT_PRIMARY);
    doc.text(buyerName, rightCol + 75, row1);
    doc.text(buyerEmail, rightCol + 75, row2);
    if (order.razorpayPaymentId) {
      doc.text(order.razorpayPaymentId, rightCol + 75, row3);
    }

    // ─── Items table ─────────────────────────────────────────────
    const tableTop = cardY + 100;

    // Table header
    doc
      .save()
      .rect(50, tableTop, 495, 24)
      .fill(BRAND_DARK)
      .restore();

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
    doc.text("#", 58, tableTop + 7, { width: 25 });
    doc.text("ITEM", 83, tableTop + 7, { width: 210 });
    doc.text("LICENSE", 293, tableTop + 7, { width: 75 });
    doc.text("TYPE", 373, tableTop + 7, { width: 65 });
    doc.text("AMOUNT", 448, tableTop + 7, { width: 90, align: "right" });

    let rowY = tableTop + 28;
    doc.font("Helvetica").fontSize(9).fillColor(TEXT_PRIMARY);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const isEven = i % 2 === 0;

      if (isEven) {
        doc.save().rect(50, rowY - 4, 495, 22).fill("#F8FAFC").restore();
      }

      doc.fillColor(TEXT_SECONDARY).text(String(i + 1), 58, rowY, { width: 25 });
      doc.fillColor(TEXT_PRIMARY).text(item.beatTitle, 83, rowY, { width: 210 });
      doc.fillColor(TEXT_PRIMARY).text(
        item.licenseType.charAt(0).toUpperCase() + item.licenseType.slice(1),
        293, rowY, { width: 75 }
      );
      doc.fillColor(TEXT_SECONDARY).text(
        (item.sourceType || "beat").charAt(0).toUpperCase() + (item.sourceType || "beat").slice(1),
        373, rowY, { width: 65 }
      );
      doc.fillColor(TEXT_PRIMARY).text(
        `INR ${item.price.toLocaleString("en-IN")}`,
        448, rowY, { width: 90, align: "right" }
      );
      rowY += 22;

      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
    }

    // Bottom border
    doc.moveTo(50, rowY + 2).lineTo(545, rowY + 2).strokeColor(BORDER).stroke();

    // ─── Coupon discount (if applied) ──────────────────────────
    let summaryY = rowY + 10;

    if (order.couponCode && order.discountAmount > 0) {
      const subtotal = order.subtotalAmount ?? order.totalAmount + order.discountAmount;

      doc.font("Helvetica").fontSize(9).fillColor(TEXT_SECONDARY);
      doc.text("Subtotal", 370, summaryY + 5, { width: 65 });
      doc.fillColor(TEXT_PRIMARY).text(
        `INR ${subtotal.toLocaleString("en-IN")}`,
        435, summaryY + 5, { width: 100, align: "right" }
      );
      summaryY += 20;

      doc.font("Helvetica").fontSize(9).fillColor(SUCCESS);
      doc.text(`Coupon (${order.couponCode})`, 350, summaryY + 5, { width: 85 });
      doc.text(
        `- INR ${order.discountAmount.toLocaleString("en-IN")}`,
        435, summaryY + 5, { width: 100, align: "right" }
      );
      summaryY += 22;

      doc.moveTo(350, summaryY).lineTo(545, summaryY).strokeColor(BORDER).stroke();
      summaryY += 4;
    }

    // ─── Total row ───────────────────────────────────────────────
    doc
      .save()
      .roundedRect(350, summaryY, 195, 32, 4)
      .fill(BRAND_DARK)
      .restore();

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF");
    doc.text("TOTAL", 365, summaryY + 9, { width: 60 });
    doc.text(
      `INR ${order.totalAmount.toLocaleString("en-IN")}`,
      435, summaryY + 9, { width: 100, align: "right" }
    );

    // ─── Footer ──────────────────────────────────────────────────
    const footerY = Math.max(summaryY + 70, 700);

    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor(BORDER)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(TEXT_SECONDARY)
      .text(
        "This is a computer-generated receipt and does not require a signature.",
        50, footerY + 10,
        { align: "center", width: 495 }
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(BRAND_ACCENT)
      .text(
        `${BRAND.name}  •  ${appUrl}  •  ${BRAND.email}`,
        50, footerY + 24,
        { align: "center", width: 495 }
      );

    doc.end();
    const pdfBuffer = await pdfReady;

    const uint8 = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${order.receipt}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
