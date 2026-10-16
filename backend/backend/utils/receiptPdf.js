const PDFDocument = require("pdfkit");
const BillCounter = require("../models/BillCounter");

/* =====================================================
   CEITCS OFFICIAL RECEIPT — shared PDF generation
   Single source of truth for the official receipt format.
   Used by the admin approval email, the admin receipt
   download/email endpoints, and the student receipt
   download endpoint so every receipt is identical.
   ===================================================== */

const formatKolkata = (date) => {
  const value = date || new Date();
  return value.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

/* Allocate a collision-safe bill number from the atomic BillCounter.
   Replaces the previous Math.random() based generator, which could
   produce duplicate bill numbers under concurrent approvals. */
const allocateBillNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;
  return BillCounter.allocateNext(yearMonth);
};

/* Generates the official receipt PDF for a paid payment and
   resolves with the PDF buffer. `payment` must be populated
   with its `student` document. `billNumber` is the reused or
   newly assigned bill number printed on the receipt. */
const generateReceiptPdf = (payment, billNumber) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const studentName =
      `${payment.student?.firstName || ""} ${
        payment.student?.lastName || ""
      }`.trim();

    const studentEmail = payment.student?.email || "";
    const studentClass = payment.student?.class || payment.className || "-";
    const amountPaid = payment.amountPaid || payment.monthlyFee || 0;
    const transactionRef = payment.transactionReference || "-";
    const verificationDate = formatKolkata(payment.verifiedAt || payment.paidAt);
    const receiptDate = formatKolkata(payment.receiptGeneratedAt);

    // Header - Institute name
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#2f4b8f").text("CeiT Academy", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").fillColor("#666666").text("Online Tuition - CEITCS Course Fee Receipt", { align: "center" });
    doc.moveDown(0.5);

    // Horizontal line
    doc.strokeColor("#2f4b8f").lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Receipt title
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#333333").text("OFFICIAL RECEIPT", { align: "center" });
    doc.moveDown(0.5);

    // Bill number
    doc.fontSize(12).font("Helvetica").fillColor("#333333").text(`Bill Number: ${billNumber}`, { align: "center" });
    doc.moveDown(1);

    // Student details section
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#2f4b8f").text("Student Details", { underline: true });
    doc.moveDown(0.5);

    const detailStartX = 80;
    const labelWidth = 160;
    const valueStartX = detailStartX + labelWidth;

    const details = [
      ["Student Name:", studentName],
      ["Student Email:", studentEmail],
      ["Student ID:", payment.student?._id?.toString() || "-"],
      ["Course/Class:", studentClass],
      ["Academic Year:", payment.academicYear || "-"],
      ["Payment Month:", payment.paymentMonth || "-"],
    ];

    details.forEach(([label, value]) => {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text(label, detailStartX, doc.y, { width: labelWidth, align: "left" });
      doc.fontSize(11).font("Helvetica").fillColor("#333333").text(value, valueStartX, doc.y, { width: 300, align: "left" });
      doc.moveDown(0.4);
    });

    doc.moveDown(0.5);

    // Payment details section
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#2f4b8f").text("Payment Details", { underline: true });
    doc.moveDown(0.5);

    const paymentDetails = [
      ["Transaction Reference (UTR):", transactionRef],
      ["Amount Paid:", `₹${amountPaid.toLocaleString("en-IN")}`],
      ["Verification Date:", verificationDate],
      ["Receipt Date:", receiptDate],
      ["Payment Status:", "Paid"],
      ["Payment ID:", payment._id.toString()],
    ];

    paymentDetails.forEach(([label, value]) => {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text(label, detailStartX, doc.y, { width: labelWidth, align: "left" });
      doc.fontSize(11).font("Helvetica").fillColor("#333333").text(value, valueStartX, doc.y, { width: 300, align: "left" });
      doc.moveDown(0.4);
    });

    doc.moveDown(1);

    // Horizontal line
    doc.strokeColor("#dddddd").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Footer
    doc.fontSize(10).font("Helvetica").fillColor("#888888").text("This is a computer-generated receipt. No signature required.", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#888888").text("CeiT Academy - Online Tuition", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica").fillColor("#aaaaaa").text("This receipt is valid for the CEITCS course fee payment only.", { align: "center" });

    doc.end();
  });
};

module.exports = {
  generateReceiptPdf,
  allocateBillNumber,
};
