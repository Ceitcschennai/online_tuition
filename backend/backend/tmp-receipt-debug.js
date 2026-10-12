const zlib = require("zlib");
const { generateReceiptPdf } = require("./utils/receiptPdf");

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

  const buffer = await generateReceiptPdf(payment, "CEITCS-202610-0001");
  const raw = buffer.toString("latin1");

  console.log("=== RAW (first 1500 chars) ===");
  console.log(raw.slice(0, 1500));
  console.log("=== END RAW ===");
  console.log("Contains 'FlateDecode':", raw.includes("FlateDecode"));
  console.log("Contains 'CEITCS' in raw:", raw.includes("CEITCS"));

  // Try inflating every candidate stream
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  let idx = 0;
  while ((m = re.exec(raw)) !== null) {
    idx++;
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
    console.log(`\n=== STREAM ${idx} (compressed=${decoded !== null}) ===`);
    if (decoded) {
      console.log(decoded.slice(0, 1200));
    } else {
      console.log(m[1].slice(0, 400));
    }
  }
})().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
