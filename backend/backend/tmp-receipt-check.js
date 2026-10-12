const zlib = require("zlib");
const { generateReceiptPdf, generateReceiptBillNumber } = require("./utils/receiptPdf");

// Decompress FlateDecode streams and decode the <hex> text strings pdfkit emits.
const extractPdfText = (pdfBuffer) => {
  const raw = pdfBuffer.toString("latin1");
  let text = "";
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const bytes = Buffer.from(m[1], "latin1");
    let decoded = null;
    try {
      decoded = zlib.inflateSync(bytes).toString("latin1");
    } catch (e) {
      try {
        decoded = zlib.inflateRawSync(bytes).toString("latin1");
      } catch (e2) {
        decoded = null;
      }
    }
    if (!decoded) continue;
    // Decode every <hex> string in the content stream
    const hexRe = /<([0-9a-fA-F]+)>/g;
    let h;
    while ((h = hexRe.exec(decoded)) !== null) {
      const hex = h[1];
      if (hex.length % 2 === 0) {
        text += Buffer.from(hex, "hex").toString("latin1");
      }
    }
  }
  return text;
};

(async () => {
  const payment = {
    _id: "66f0abc1234567890abcdef01",
    student: {
      _id: "66f0student1234567890abcd",
      firstName: "TestStudent",
      lastName: "Verify",
      email: "teststudent@example.com",
      class: "Class 10",
    },
    className: "10",
    academicYear: "2026-2027",
    paymentMonth: "2026-10",
    monthlyFee: 2000,
    amountPaid: 2000,
    status: "Paid",
    transactionReference: "UTR-TEST-12345",
    verifiedAt: new Date(),
    paidAt: new Date(),
    receiptGeneratedAt: new Date(),
  };

  const billNumber = "CEITCS-202610-0001";
  const buffer = await generateReceiptPdf(payment, billNumber);
  const text = extractPdfText(buffer);

  const checks = [];
  checks.push(["is Buffer", Buffer.isBuffer(buffer)]);
  checks.push(["PDF magic bytes", buffer.subarray(0, 5).toString() === "%PDF-"]);
  checks.push(["contains bill number", text.includes(billNumber)]);
  checks.push(["contains student name", text.includes("TestStudent")]);
  checks.push(["contains student surname", text.includes("Verify")]);
  checks.push(["contains student email", text.includes("teststudent@example.com")]);
  checks.push(["contains UTR", text.includes("UTR-TEST-12345")]);
  checks.push(["contains OFFICIAL RECEIPT", text.includes("OFFICIAL RECEIPT")]);
  checks.push(["contains amount 2,000", text.includes("2,000")]);
  checks.push(["no wrong bill number", !text.includes("CEITCS-9999-9999")]);

  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
    if (!ok) allPass = false;
  }
  console.log(`PDF buffer length: ${buffer.length} bytes`);

  const bn = generateReceiptBillNumber();
  const formatOk = /^CEITCS-\d{6}-\d{4}$/.test(bn);
  console.log(`${formatOk ? "PASS" : "FAIL"}: bill number format (${bn})`);

  process.exit(allPass && formatOk ? 0 : 1);
})().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
