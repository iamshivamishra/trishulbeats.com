import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { formatErrorResponse, UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors";

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

    const appName = "Trishul Beats";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trishulbeats.com";

    const paidDate = order.paidAt
      ? new Date(order.paidAt).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date(order.createdAt).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // --- Header ---
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(appName, 50, 50)
      .fontSize(10)
      .font("Helvetica")
      .text(appUrl, 50, 80)
      .moveDown(0.5);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("TRANSACTION RECEIPT", 50, 120)
      .moveDown(0.3);

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#e5e5e5")
      .stroke();

    // --- Order details ---
    const detailsY = doc.y + 15;
    doc.fontSize(10).font("Helvetica");

    const leftCol = 50;
    const rightCol = 300;

    doc.font("Helvetica-Bold").text("Receipt No:", leftCol, detailsY);
    doc.font("Helvetica").text(order.receipt, leftCol + 80, detailsY);

    doc.font("Helvetica-Bold").text("Date:", leftCol, detailsY + 18);
    doc.font("Helvetica").text(paidDate, leftCol + 80, detailsY + 18);

    doc.font("Helvetica-Bold").text("Status:", leftCol, detailsY + 36);
    doc
      .font("Helvetica")
      .fillColor("#16a34a")
      .text("PAID", leftCol + 80, detailsY + 36)
      .fillColor("#000000");

    doc.font("Helvetica-Bold").text("Customer:", rightCol, detailsY);
    doc.font("Helvetica").text(buyerName, rightCol + 70, detailsY);

    doc.font("Helvetica-Bold").text("Email:", rightCol, detailsY + 18);
    doc.font("Helvetica").text(buyerEmail, rightCol + 70, detailsY + 18);

    if (order.razorpayPaymentId) {
      doc.font("Helvetica-Bold").text("Payment ID:", rightCol, detailsY + 36);
      doc
        .font("Helvetica")
        .text(order.razorpayPaymentId, rightCol + 70, detailsY + 36);
    }

    // --- Items table ---
    const tableTop = detailsY + 70;

    doc
      .moveTo(50, tableTop)
      .lineTo(545, tableTop)
      .strokeColor("#e5e5e5")
      .stroke();

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("#", 50, tableTop + 8, { width: 25 });
    doc.text("Item", 75, tableTop + 8, { width: 220 });
    doc.text("License", 295, tableTop + 8, { width: 80 });
    doc.text("Type", 375, tableTop + 8, { width: 70 });
    doc.text("Amount", 460, tableTop + 8, { width: 85, align: "right" });

    doc
      .moveTo(50, tableTop + 25)
      .lineTo(545, tableTop + 25)
      .strokeColor("#e5e5e5")
      .stroke();

    let rowY = tableTop + 33;
    doc.font("Helvetica").fontSize(9);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      doc.text(String(i + 1), 50, rowY, { width: 25 });
      doc.text(item.beatTitle, 75, rowY, { width: 220 });
      doc.text(item.licenseType.charAt(0).toUpperCase() + item.licenseType.slice(1), 295, rowY, { width: 80 });
      doc.text(
        (item.sourceType || "beat").charAt(0).toUpperCase() +
          (item.sourceType || "beat").slice(1),
        375,
        rowY,
        { width: 70 }
      );
      doc.text(`INR ${item.price.toLocaleString("en-IN")}`, 460, rowY, {
        width: 85,
        align: "right",
      });
      rowY += 20;

      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
    }

    doc
      .moveTo(50, rowY + 5)
      .lineTo(545, rowY + 5)
      .strokeColor("#e5e5e5")
      .stroke();

    // --- Total ---
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Total:", 375, rowY + 15, { width: 80 });
    doc.text(`INR ${order.totalAmount.toLocaleString("en-IN")}`, 460, rowY + 15, {
      width: 85,
      align: "right",
    });

    // --- Footer ---
    const footerY = Math.max(rowY + 60, 650);
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor("#e5e5e5")
      .stroke();

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#888888")
      .text(
        "This is a computer-generated receipt and does not require a signature.",
        50,
        footerY + 10,
        { align: "center", width: 495 }
      )
      .text(
        `${appName} • ${appUrl}`,
        50,
        footerY + 25,
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
