// READ-ONLY database inspection. Does not print credentials.
require("dotenv").config();
const mongoose = require("mongoose");

const inspect = async () => {
  const uri = process.env.MONGO_URI || "";
  if (!uri) {
    console.log("NO MONGO_URI in .env");
    process.exit(0);
  }
  // Print only host/db name, never credentials
  let masked = uri;
  try {
    const u = new URL(uri);
    masked = `${u.protocol}//***:***@${u.host}${u.pathname}`;
  } catch (e) { /* ignore */ }
  console.log("MONGO_URI (masked):", masked);

  try {
    await mongoose.connect(uri);
    console.log("CONNECTED. host:", mongoose.connection.host, "name:", mongoose.connection.name);

    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    console.log("COLLECTIONS:", cols.map((c) => c.name).join(", "));

    const studentPaymentCount = await db.collection("studentpayments").countDocuments();
    const feeStructureCount = await db.collection("feestructures").countDocuments();
    const studentCount = await db.collection("students").countDocuments();
    const approvedStudents = await db.collection("students").countDocuments({ approvalStatus: "Approved", isActive: true });

    console.log("studentpayments count:", studentPaymentCount);
    console.log("feestructures count:", feeStructureCount);
    console.log("students count:", studentCount);
    console.log("approved+active students:", approvedStudents);

    const feeSamples = await db.collection("feestructures").find({}).limit(20).toArray();
    console.log("FEE STRUCTURE SAMPLES (className values):");
    feeSamples.forEach((f) => {
      console.log(`  academicYear=${f.academicYear} className=${JSON.stringify(f.className)} monthlyFee=${f.monthlyFee} isActive=${f.isActive}`);
    });

    const distinctFeeClassNames = await db.collection("feestructures").distinct("className");
    console.log("DISTINCT fee classNames:", JSON.stringify(distinctFeeClassNames));

    const distinctStudentClasses = await db.collection("students").distinct("class");
    console.log("DISTINCT student class values:", JSON.stringify(distinctStudentClasses));

    const paySamples = await db.collection("studentpayments").find({}).limit(10).toArray();
    console.log("STUDENT PAYMENT SAMPLES:");
    paySamples.forEach((p) => {
      console.log(`  student=${p.student} className=${JSON.stringify(p.className)} academicYear=${p.academicYear} paymentMonth=${p.paymentMonth} monthlyFee=${p.monthlyFee} amountPaid=${p.amountPaid} status=${p.status}`);
    });

    const statusCounts = await db.collection("studentpayments").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();
    console.log("PAYMENT STATUS COUNTS:", JSON.stringify(statusCounts));

    await mongoose.disconnect();
    console.log("DONE");
    process.exit(0);
  } catch (err) {
    console.error("INSPECTION ERROR:", err.message);
    process.exit(1);
  }
};

inspect();
