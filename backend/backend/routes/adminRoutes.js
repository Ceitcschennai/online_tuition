const express = require("express");
const router = express.Router();
const COMPANY_NAME = "CeiT Academy";
const crypto = require("crypto");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const Activity = require("../models/Activity");
const transporter = require("../config/email");
const TeacherPayment = require("../models/TeacherPayment");
const StudentPayment = require("../models/StudentPayment");
const FeeStructure = require("../models/FeeStructure");
const { protect, requireAdmin } = require("../middleware/authMiddleware");
const {
  generateReceiptPdf,
  generateReceiptBillNumber,
  allocateBillNumber,
} = require("../utils/receiptPdf");

/* =====================================================
   CLASS NORMALIZER
   Maps messy raw class values ("10", "10th", "10TH", "Class 10")
   to one canonical bucket ("Class 10"). LKG and UKG are kept as
   their own buckets. Anything else that isn't a clean 1–12 value
   (negative numbers, garbage, etc.) falls into "Others".
===================================================== */
/* =====================================================
   CLASS NORMALIZER
   Only Class 5 through Class 12 get their own bucket.
   Everything else — LKG, UKG, Class 1-4, negative numbers,
   garbage — is grouped under "Others".
===================================================== */
const normalizeClass = (raw) => {
  if (!raw) return "Others";
  const str = String(raw).trim();

  // Reject negative numbers outright — e.g. "-10" is bad data, not Class 10
  if (/^-\s*\d/.test(str)) return "Others";

  const match = str.match(/(\d{1,2})/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 5 && num <= 12) return `Class ${num}`;
  }
  return "Others";
};


const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Online Tuition" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("📧 Email sent to:", to);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
};

/* =====================================================
   PAYMENT TRANSACTION VERIFICATION (concurrency-safe)
===================================================== */

/* Atomically verify a single Submitted transaction.
   Flips the matching transaction Submitted→Verified and adds its amount to
   amountPaid exactly once, even when two admin requests arrive at the same
   time. The update is gated on the transaction still being "Submitted", so a
   concurrent request that has already verified it matches nothing and must be
   treated as idempotent ("already approved") by the caller.
   Does not set payment.status; callers reload the document and recompute
   status before saving.
   Returns the MongoDB update result (matchedCount / modifiedCount). */
async function verifyTransactionAtomically(paymentId, transactionId, transactionAmount, adminId) {
  const now = new Date();

  if (
    typeof transactionAmount !== "number" ||
    !Number.isFinite(transactionAmount) ||
    transactionAmount <= 0
  ) {
    throw new Error(`Invalid transaction amount: ${transactionAmount}`);
  }

  return StudentPayment.updateOne(
    {
      _id: paymentId,
      transactions: {
        $elemMatch: { _id: transactionId, status: "Submitted" }
      }
    },
    {
      $set: {
        "transactions.$.status": "Verified",
        "transactions.$.verifiedAt": now,
        "transactions.$.verifiedBy": adminId,
        fundsVerified: true,
        verifiedBy: adminId,
        verifiedAt: now
      },
      $inc: { amountPaid: transactionAmount }
    }
  );
}

/* Recompute the document-level payment status from its transactions,
   mirroring the previous partial-payment logic:
     - all transactions Verified and amountPaid >= monthlyFee → "Paid"
     - any transaction still Submitted → "Submitted"
     - otherwise leave status unchanged
   Mutates the passed (already reloaded) document in memory; the caller's
   existing save() persists it. Returns true when the payment is "Paid". */
function recomputePaymentStatus(payment) {
  const hasSubmitted = payment.transactions.some(
    (txn) => txn.status === "Submitted"
  );
  const allVerified =
    payment.transactions.length > 0 &&
    payment.transactions.every((txn) => txn.status === "Verified");

  if (allVerified && payment.amountPaid >= payment.monthlyFee && payment.fundsVerified) {
    payment.status = "Paid";
    payment.paidAt = new Date();
    return true;
  }

  if (hasSubmitted) {
    payment.status = "Submitted";
  }

  return payment.status === "Paid";
}
router.get("/dashboard", async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalSubjects = await Subject.countDocuments();

    const approvedTeachers = await Teacher.countDocuments({ isApproved: true });
    const pendingTeachers = await Teacher.countDocuments({
      isApproved: false,
      isRejected: false,
    });

    res.json({
      success: true,
      stats: {
        totalTeachers,
        totalStudents,
        totalSubjects,
        approvedTeachers,
        pendingTeachers,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Dashboard fetch failed" });
  }
});

/* =====================================================
   STUDENT STATS
===================================================== */
router.get("/students/stats", async (req, res) => {
  try {
    const total = await Student.countDocuments();
    const approved = await Student.countDocuments({ approvalStatus: "Approved" });
    const pending = await Student.countDocuments({ approvalStatus: "Pending" });
    const rejected = await Student.countDocuments({ approvalStatus: "Rejected" });
    const paid = await Student.countDocuments({ status: "Paid" });

    res.json({
      success: true,
      stats: { total, approved, pending, rejected, paid },
    });
  } catch (err) {
    console.error("Student stats error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

/* =====================================================
   DISTINCT CLASS LIST — powers the class-wise filter buttons.
   Normalizes messy raw values ("10th", "10TH", "Class 10") into
   canonical "Class 1".."Class 12" buckets, with everything else
   (LKG, UKG, negative numbers, garbage) grouped as "Others".
   Only returns buckets that actually have at least one student.
===================================================== */
router.get("/students/classes", async (req, res) => {
  try {
    const rawClasses = await Student.distinct("class");
    const present = new Set(rawClasses.map(normalizeClass));

    const ordered = [];
    for (let i = 5; i <= 12; i++) {
      const label = `Class ${i}`;
      if (present.has(label)) ordered.push(label);
    }
    if (present.has("Others")) ordered.push("Others");

    res.json({ success: true, classes: ordered });
  } catch (err) {
    console.error("Class list error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch class list" });
  }
});

/* =====================================================
   GET STUDENTS (SEARCH + FILTER)
===================================================== */
router.get("/students", async (req, res) => {
  try {
    const { search = "", filter = "all", studentClass = "all" } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { class: { $regex: search, $options: "i" } },
        { emisNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "approved") {
  query.approvalStatus = "Approved";
}

if (filter === "pending") {
  query.approvalStatus = "Pending";
}

if (filter === "rejected") {
  query.approvalStatus = "Rejected";
}

if (filter === "paid") {
  query.status = "Paid";
}

if (filter === "unpaid") {
  query.status = "Unpaid";
}

if (filter === "activationRequested") {
  query.approvalStatus = "Approved";
  query.isActive = false;
  query.activationRequested = true;
}

    let students = await Student.find(query).sort({ createdAt: -1 });

    // ✅ Class-wise filter — matches against the NORMALIZED bucket, since raw
    // class values are stored inconsistently ("10", "10th", "10TH", "Class 10"
    // all mean the same thing; a direct string match on the raw field would miss most of them).
    if (studentClass && studentClass !== "all") {
      students = students.filter((s) => normalizeClass(s.class) === studentClass);
    }

    res.json({ success: true, students });
  } catch (err) {
    console.error("Student fetch error:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

// /* =====================================================
//    APPROVE / REJECT STUDENT
// ===================================================== */
// router.put("/students/:id/status", async (req, res) => {
//   try {
//     const { status } = req.body;

//     if (!["Approved", "Rejected"].includes(status)) {
//       return res.status(400).json({ success: false, message: "Invalid status" });
//     }

//     const student = await Student.findById(req.params.id);
//     if (!student) {
//       return res.status(404).json({ success: false, message: "Student not found" });
//     }

//     student.approvalStatus = status;
//     await student.save();

//     await sendEmail(
//       student.email,
//       `Admission ${status}`,
//       `Hello ${student.firstName},\n\nYour admission has been ${status}.`
//     );

//     await Activity.create({
//   type: "student",
//   message: `Student ${student.firstName} ${student.lastName} was ${status}`,
//   time: new Date(),
// });

//     res.json({ success: true, student });
//   } catch (err) {
//     console.error("Student status error:", err);
//     res.status(500).json({ success: false, message: "Update failed" });
//   }
// });

/* =================================================
   ADMIN — UPDATE STUDENT APPROVAL STATUS
================================================= */

router.put("/students/:id/status", async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (
  ![
    "Approved",
    "Rejected",
    "Pending",
    "Reject Document",
  ].includes(status)
) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval status",
      });
    }

    const student = await Student.findById(
  req.params.id
);

if (!student) {
  return res.status(404).json({
    success: false,
    message: "Student not found",
  });
}

if (status === "Approved") {

  student.approvalStatus = "Approved";
  student.isActive = true;

  student.documentReuploadToken = null;
  student.documentReuploadExpires = null;

} else if (status === "Reject Document") {

  student.approvalStatus = "Pending";
  student.isActive = false;

  student.documentReuploadToken =
    crypto.randomBytes(32).toString("hex");

  student.documentReuploadExpires =
    new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

} else {

  student.approvalStatus = "Rejected";
  student.isActive = false;

  student.documentReuploadToken = null;
  student.documentReuploadExpires = null;

}

await student.save();

if (status === "Approved" || status === "Rejected") {
  const emailHtml =
    status === "Approved"
    ? `
      <div
        style="
          font-family: Arial, sans-serif;
          background-color: #ffffff;
          color: #333333;
          max-width: 650px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.7;
        "
      >

        <h2
          style="
            color: #2f4b8f;
            margin-bottom: 5px;
          "
        >
          CeiT Academy - Online Tuition
        </h2>

        <p
          style="
            color: #666666;
            margin-top: 0;
            margin-bottom: 25px;
          "
        >
          Student Registration Confirmation
        </p>

        <p>
          Dear ${student.firstName},
        </p>

        <p>
          Thank you for registering as a student member with
          <strong>CeiT Academy - Online Tuition</strong>.
        </p>

        <p>
          We have successfully received your registration
          details and submitted documents.
        </p>

        <div
          style="
            background-color: #fff8e6;
            border-left: 4px solid #f0a500;
            padding: 15px 18px;
            margin: 20px 0;
          "
        >
          <strong
            style="
              color: #a66a00;
              font-size: 16px;
            "
          >
            Profile Status: APPROVED
          </strong>
        </div>

        <p>
          Your student profile has been
          <strong>approved by the administrator</strong>.
          Your account is now active and ready to use.
        </p>

        <p>
          You can now log in using your registered email
          address and password.
        </p>

        <p>
          Please keep your login credentials secure and
          do not share your password with anyone.
        </p>

        <hr
          style="
            border: none;
            border-top: 1px solid #dddddd;
            margin: 30px 0;
          "
        />

        <p>
          Regards,<br />
          <strong>Admin</strong><br />
          <strong>CeiT Academy - Online Tuition</strong>
        </p>

        <p
          style="
            color: #888888;
            font-size: 13px;
            margin-top: 30px;
          "
        >
          This is an automated email from CeiT Academy -
          Online Tuition. Please do not reply directly to
          this email.
        </p>

      </div>
    `
    : `
      <div
        style="
          font-family: Arial, sans-serif;
          background-color: #ffffff;
          color: #333333;
          max-width: 650px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.7;
        "
      >

        <h2
          style="
            color: #2f4b8f;
            margin-bottom: 5px;
          "
        >
          CeiT Academy - Online Tuition
        </h2>

        <p
          style="
            color: #666666;
            margin-top: 0;
            margin-bottom: 25px;
          "
        >
          Student Registration Notification
        </p>

        <p>
          Dear ${student.firstName},
        </p>

        <p>
          We have reviewed your student registration
          submitted to
          <strong>CeiT Academy - Online Tuition</strong>.
        </p>

        <div
          style="
            background-color: #fff1f1;
            border-left: 4px solid #d9534f;
            padding: 15px 18px;
            margin: 20px 0;
          "
        >
          <strong
            style="
              color: #b52b27;
              font-size: 16px;
            "
          >
            Profile Status: REJECTED
          </strong>
        </div>

        <p>
          Your student profile could not be approved by
          the administrator.
        </p>

        <p>
          <strong>
            Reason for rejection:
          </strong>
        </p>

        <div
          style="
            background-color: #f5f5f5;
            padding: 15px 18px;
            border-left: 4px solid #d9534f;
            margin: 10px 0 20px 0;
          "
        >
          ${reason?.trim() || "No reason was provided."}
        </div>

        <p>
          Please review the reason mentioned above and
          take the necessary action.
        </p>

        <p>
          If you need further assistance, please contact
          the administrator.
        </p>

        <hr
          style="
            border: none;
            border-top: 1px solid #dddddd;
            margin: 30px 0;
          "
        />

        <p>
          Regards,<br />
          <strong>Admin</strong><br />
          <strong>CeiT Academy - Online Tuition</strong>
        </p>

        <p
          style="
            color: #888888;
            font-size: 13px;
            margin-top: 30px;
          "
        >
          This is an automated email from CeiT Academy -
          Online Tuition. Please do not reply directly to
          this email.
        </p>

      </div>
    `;
}

if (status === "Approved" || status === "Rejected") {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: student.email,
      subject:
        status === "Approved"
          ? `${COMPANY_NAME} | Student Registration Approved`
          : `${COMPANY_NAME} | Student Registration Rejected`,
      html: emailHtml,
    });

    console.log(
      `Student ${status} email sent to: ${student.email}`
    );
  } catch (emailError) {
    console.error(
      `Failed to send student ${status} email:`,
      emailError
    );
  }
}

// Send document re-upload email
if (status === "Reject Document") {
  try {
    const reuploadLink =
  `${process.env.FRONTEND_URL || "https://online-tuition-1wvb.vercel.app"}/login?reuploadToken=${student.documentReuploadToken}&reuploadRole=student`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: student.email,
      subject: `${COMPANY_NAME} | Document Re-upload Required`,
      html: `
  <div
    style="
      font-family: Arial, sans-serif;
      background-color: #ffffff;
      color: #333333;
      max-width: 650px;
      margin: 0 auto;
      padding: 20px;
    "
  >

    <h2
      style="
        color: #2f3f8f;
        margin-bottom: 8px;
      "
    >
      CeiT Academy - Online Tuition
    </h2>

    <p
      style="
        color: #666666;
        margin-top: 0;
        margin-bottom: 25px;
      "
    >
      Student Document Notification
    </p>

    <p>
      Dear ${student.firstName},
    </p>

    <p>
      We have reviewed your student registration
      submitted to
      <strong>CeiT Academy - Online Tuition</strong>.
    </p>

    <div
      style="
        background-color: #fff8e6;
        border-left: 4px solid #f0a500;
        padding: 16px 18px;
        margin: 20px 0;
      "
    >

      <h3
        style="
          color: #a66a00;
          margin-top: 0;
          margin-bottom: 12px;
        "
      >
        Document Re-upload Required
      </h3>

      <p
        style="
          margin-bottom: 0;
          line-height: 1.7;
        "
      >
        The document you uploaded could not be accepted
        by the administrator. Please upload a new and valid
        student ID document for verification.
      </p>

    </div>

    <p>
      Your student profile has been kept in
      <strong>Pending</strong> status until the new
      document is submitted and reviewed.
    </p>

    <p>
      Please click the button below to open your
      registration form.
    </p>

    <p>
      Your existing registration details will already be
      filled in. You only need to upload a new document
      and submit the form again.
    </p>

    <p style="text-align: center; margin: 30px 0;">

      <a
        href="${reuploadLink}"
        style="
          display: inline-block;
          background-color: #1683f7;
          color: #ffffff;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
        "
      >
        Re-upload Document
      </a>

    </p>

    <div
      style="
        border: 1px solid #dddddd;
        border-radius: 6px;
        padding: 16px 18px;
        margin: 20px 0;
      "
    >

      <p
        style="
          margin-top: 0;
          font-weight: bold;
        "
      >
        Important:
      </p>

      <p
        style="
          margin-bottom: 0;
          line-height: 1.7;
        "
      >
        Please make sure the complete document is visible,
        clear, readable and not cropped or blurred.
      </p>

    </div>

    <p>
      This re-upload link is valid for
      <strong>24 hours</strong>.
    </p>

    <hr
      style="
        border: none;
        border-top: 1px solid #dddddd;
        margin: 25px 0;
      "
    />

    <p>
      Regards,<br />
      Admin<br />
      <strong>CeiT Academy - Online Tuition</strong>
    </p>

    <p
      style="
        color: #888888;
        font-size: 13px;
        margin-top: 35px;
      "
    >
      This is an automated email from CeiT Academy -
      Online Tuition. Please do not reply directly to
      this email.
    </p>

  </div>
`,
    });

    console.log(
      "Document re-upload email sent to:",
      student.email
    );

  } catch (emailError) {
    console.error(
      "Document re-upload email error:",
      emailError
    );
  }
}

    

    // Activity log
    await Activity.create({
      type: "student",
      message: `Student ${student.firstName} ${student.lastName} was ${status}`,
      time: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Student ${status.toLowerCase()} successfully`,
      student,
    });
  } catch (err) {
    console.error("Student status update error:", err);

    return res.status(500).json({
      success: false,
      message: "Update failed",
      error: err.message,
    });
  }
});

/* =====================================================
   TOGGLE STUDENT PAYMENT
===================================================== */
router.put("/students/:id/payment", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.status = student.status === "Paid" ? "Unpaid" : "Paid";
    await student.save();

    res.json({ success: true, student });
  } catch (err) {
    console.error("Payment update error:", err);
    res.status(500).json({ success: false, message: "Payment update failed" });
  }
});

/* =====================================================
   GET TEACHERS (SEARCH + FILTER + STATS)
===================================================== */
router.get("/teachers", async (req, res) => {
  try {
    const { search = "", filter = "all" } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

  if (filter === "approved") {

  query.isApproved = true;

}

if (filter === "rejected") {

  query.isRejected = true;

}

if (filter === "pending") {

  query.isApproved = false;
  query.isRejected = false;

}

if (filter === "activationRequested") {

  query.isApproved = true;
  query.isActive = false;
  query.activationRequested = true;

}

    const teachers = await Teacher.find(query)
  .select("-password")
  .populate("subjects", "name category classes")
  .sort({ createdAt: -1 });

    const total = await Teacher.countDocuments();
    const approved = await Teacher.countDocuments({ isApproved: true });
    const rejected = await Teacher.countDocuments({ isRejected: true });
    const pending = await Teacher.countDocuments({
      isApproved: false,
      isRejected: false,
    });

    const assigned = await Teacher.countDocuments({
      classAssigned: { $exists: true, $ne: null },
    });

    res.json({
      success: true,
      teachers,
      stats: { total, approved, pending, rejected, assigned },
    });
  } catch (error) {
    console.error("Teacher fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch teachers" });
  }
});

/* =====================================================
   APPROVE / REJECT TEACHER
===================================================== */
router.put("/teachers/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (status === "Approved") {
      teacher.isApproved = true;
      teacher.isRejected = false;
    }

    if (status === "Rejected") {
      teacher.isApproved = false;
      teacher.isRejected = true;
    }

    await teacher.save();

    res.json({
      success: true,
      message: `Teacher ${status} successfully`,
      teacher,
    });
  } catch (error) {
    console.error("Teacher status error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* =====================================================
   UPDATE TEACHER'S ASSIGNED CLASSES
===================================================== */
/* =====================================================
   UPDATE TEACHER'S ASSIGNED CLASSES
   Also synchronizes classes to the teacher's subjects
===================================================== */

router.put(
  "/teachers/:id/classes",
  async (req, res) => {
    try {

      const {
        classes
      } = req.body;

      const teacherId =
        req.params.id;

      console.log(
        "=========================================="
      );

      console.log(
        "UPDATE TEACHER CLASSES"
      );

      console.log(
        "Teacher ID:",
        teacherId
      );

      console.log(
        "Classes:",
        classes
      );

      // -------------------------------------------------
      // VALIDATE
      // -------------------------------------------------

      if (
        !Array.isArray(classes) ||
        classes.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one class must be selected",
        });
      }

      const validClasses = [
        "Class 5",
        "Class 6",
        "Class 7",
        "Class 8",
        "Class 9",
        "Class 10",
        "Class 11",
        "Class 12",
      ];

      const invalidClasses =
        classes.filter(
          (cls) =>
            !validClasses.includes(
              cls
            )
        );

      if (
        invalidClasses.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class selected",
          invalidClasses,
        });
      }

      // -------------------------------------------------
      // FIND TEACHER
      // -------------------------------------------------

      const teacher =
        await Teacher.findById(
          teacherId
        );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher not found",
        });
      }

      // -------------------------------------------------
      // UPDATE TEACHER CLASSES
      // -------------------------------------------------

      teacher.classesAssigned =
        classes;

      await teacher.save();

      // -------------------------------------------------
      // IMPORTANT:
      // SYNCHRONIZE CLASSES WITH ALL
      // SUBJECTS ASSIGNED TO THIS TEACHER
      // -------------------------------------------------

      await Subject.updateMany(
        {
          teacher:
            teacherId,
        },
        {
          $set: {
            classes:
              classes,
          },
        }
      );

      // -------------------------------------------------
      // GET UPDATED TEACHER
      // -------------------------------------------------

      const updatedTeacher =
        await Teacher.findById(
          teacherId
        )
          .select("-password")
          .populate(
            "subjects",
            "name category classes teacher"
          );

      console.log(
        "Updated teacher classes:",
        updatedTeacher.classesAssigned
      );

      console.log(
        "Updated teacher subjects:",
        updatedTeacher.subjects
      );

      console.log(
        "=========================================="
      );

      return res.json({
        success: true,

        message:
          "Teacher classes updated successfully",

        teacher:
          updatedTeacher,
      });

    } catch (error) {

      console.error(
        "CLASS UPDATE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update teacher classes",

        error:
          error.message,
      });
    }
  }
);
/* =====================================================
   UPDATE TEACHER'S ASSIGNED CLASSES
   Lets admin retroactively set classesAssigned for teachers
   who registered before this field existed, or to adjust it
   later. Restricted to Class 5–12.
===================================================== */
/* =====================================================
   GET SUBJECTS FOR ADMIN TEACHER EDIT

   Ensures these subjects exist:
   Tamil, English, Maths, Science, Social,
   Botany, Zoology, Physics, Chemistry,
   Accounts, Economics
===================================================== */
/* =====================================================
   GET SUBJECTS FOR TEACHER ASSIGNMENT
   ===================================================== */


/* =====================================================
   GET SUBJECTS FOR TEACHER ASSIGNMENT
===================================================== */

router.get("/subjects-for-teacher", async (req, res) => {
  try {
    console.log("==========================================");
    console.log("GET /subjects-for-teacher");

    const SUBJECT_NAMES = [
      "Tamil",
      "English",
      "Maths",
      "Science",
      "Social",
      "Botany",
      "Zoology",
      "Physics",
      "Chemistry",
      "Accounts",
      "Economics",
      "Computer Science"
    ];

    /*
     * Make sure the standard subjects exist.
     * Existing subjects will NOT be overwritten.
     */

    for (const name of SUBJECT_NAMES) {
      const existingSubject = await Subject.findOne({
        name: {
          $regex: `^${name}$`,
          $options: "i"
        }
      });

      if (!existingSubject) {
        const newSubject = await Subject.create({
          name: name,
          category: "Regular",
          price: "Free",
          classes: [],
          teacher: null,
          isActive: true
        });

        console.log(
          "Created subject:",
          newSubject.name
        );
      }
    }

    /*
     * Fetch all active subjects.
     */

    const subjects = await Subject.find({
      isActive: true
    })
      .select(
        "_id name category classes teacher"
      )
      .sort({ name: 1 });

    console.log(
      "Subjects returned:",
      subjects.map((subject) => ({
        id: subject._id,
        name: subject.name,
        classes: subject.classes,
        teacher: subject.teacher
      }))
    );

    console.log("==========================================");

    return res.status(200).json({
      success: true,
      subjects
    });

  } catch (error) {

    console.error("==========================================");
    console.error(
      "SUBJECT FETCH ERROR:"
    );
    console.error(
      "Message:",
      error.message
    );
    console.error(
      "Stack:",
      error.stack
    );
    console.error("==========================================");

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
});

/* =====================================================
   UPDATE TEACHER'S SUBJECT
===================================================== */
/* =====================================================
   UPDATE TEACHER'S ASSIGNED SUBJECT
   ===================================================== */

router.put("/teachers/:id/subject", async (req, res) => {
  try {
    const { subjectName } = req.body;
    const teacherId = req.params.id;

    console.log("==========================================");
    console.log("UPDATE TEACHER SUBJECT");
    console.log("Teacher ID:", teacherId);
    console.log("Subject Name:", subjectName);

    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required",
      });
    }

    // -------------------------------------------------
    // FIND TEACHER
    // -------------------------------------------------

    const teacher =
      await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // -------------------------------------------------
    // GET TEACHER'S ASSIGNED CLASSES
    // -------------------------------------------------

    const teacherClasses =
      Array.isArray(
        teacher.classesAssigned
      )
        ? teacher.classesAssigned
        : [];

    console.log(
      "Teacher classes:",
      teacherClasses
    );

    // -------------------------------------------------
    // FIND SUBJECT
    // -------------------------------------------------

    let subject =
      await Subject.findOne({
        name: {
          $regex:
            `^${subjectName.trim()}$`,
          $options: "i",
        },
      });

    // -------------------------------------------------
    // CREATE SUBJECT IF IT DOESN'T EXIST
    // -------------------------------------------------

    if (!subject) {
      subject =
        await Subject.create({
          name:
            subjectName.trim(),

          category:
            "Regular",

          price:
            "Free",

          classes:
            teacherClasses,

          teacher:
            teacherId,

          isActive:
            true,
        });

    } else {

      // -------------------------------------------------
      // ASSIGN TEACHER
      // -------------------------------------------------

      subject.teacher =
        teacherId;

      // -------------------------------------------------
      // IMPORTANT:
      // COPY TEACHER'S ASSIGNED CLASSES
      // INTO SUBJECT
      // -------------------------------------------------

      subject.classes =
        teacherClasses;

      subject.isActive =
        true;

      await subject.save();
    }

    // -------------------------------------------------
    // REMOVE THIS TEACHER'S OLD SUBJECT REFERENCES
    // -------------------------------------------------

    teacher.subjects = [
      subject._id
    ];

    await teacher.save();

    // -------------------------------------------------
    // VERIFY DATA
    // -------------------------------------------------

    const updatedSubject =
      await Subject.findById(
        subject._id
      ).populate(
  "teacher",
  "firstName lastName email bankDetails"
)
    const updatedTeacher =
      await Teacher.findById(
        teacherId
      )
        .select("-password")
        .populate(
          "subjects",
          "name category classes teacher"
        );

    console.log(
      "Updated Subject:",
      {
        name:
          updatedSubject.name,

        classes:
          updatedSubject.classes,

        teacher:
          updatedSubject.teacher,
      }
    );

    console.log(
      "Updated Teacher:",
      {
        name:
          `${updatedTeacher.firstName} ${updatedTeacher.lastName}`,

        classes:
          updatedTeacher.classesAssigned,

        subjects:
          updatedTeacher.subjects,
      }
    );

    console.log("==========================================");

    return res.json({
      success: true,

      message:
        "Teacher subject updated successfully",

      teacher:
        updatedTeacher,

      subject:
        updatedSubject,
    });

  } catch (error) {

    console.error(
      "=========================================="
    );

    console.error(
      "SUBJECT UPDATE ERROR:",
      error
    );

    console.error(
      "=========================================="
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to update teacher subject",

      error:
        error.message,
    });
  }
});

/* =====================================================
   ADMIN — GET STUDENT PAYMENTS
===================================================== */

router.get("/payments/students", protect, requireAdmin, async (req, res) => {
  try {
    const payments = await StudentPayment.find()
      .populate(
        "student",
        "firstName lastName email class"
      )
      .sort({
        paymentMonth: -1,
        createdAt: -1
      });

    return res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error(
      "Student payments fetch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student payments",
      error: error.message
    });
  }
});

/* =====================================================
   ADMIN — GET TEACHER PAYMENTS
===================================================== */

router.get("/payments/teachers", protect, requireAdmin, async (req, res) => {
  try {
    const payments = await TeacherPayment.find()
      .populate(
        "teacher",
        "firstName lastName email"
      )
      .sort({
        paymentMonth: -1,
        createdAt: -1
      });

    return res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error(
      "Fetch teacher payments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher payments",
      error: error.message
    });
  }
});

/* =====================================================
   ADMIN — GET FEE STRUCTURE
===================================================== */

router.get("/payments/fees", protect, requireAdmin, async (req, res) => {
  try {
    const feeStructures = await FeeStructure.find()
      .sort({
        academicYear: -1,
        className: 1
      });

    return res.json({
      success: true,
      feeStructures
    });

  } catch (error) {
    console.error(
      "Fetch fee structure error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee structure",
      error: error.message
    });
  }
});

// =====================================================
// ADMIN — ADD CLASS 5 FEE STRUCTURE
// =====================================================

router.post("/payments/fees/add-class-5", protect, requireAdmin, async (req, res) => {
  try {
    const existingFee = await FeeStructure.findOne({
      academicYear: "2026-2027",
      className: "Class 5"
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: "Class 5 fee structure already exists"
      });
    }

    const feeStructure = await FeeStructure.create({
      academicYear: "2026-2027",
      className: "Class 5",
      monthlyFee: 2000,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: "Class 5 fee structure added successfully",
      feeStructure
    });

  } catch (error) {
    console.error("Add Class 5 fee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add Class 5 fee structure",
      error: error.message
    });
  }
});

/* =====================================================
   ADMIN — UPDATE FEE STRUCTURE
===================================================== */

/* =====================================================
   ADMIN — UPDATE FEE STRUCTURE
===================================================== */

/* =====================================================
   ADMIN — UPDATE FEE STRUCTURE
===================================================== */

router.put("/payments/fees/:feeId", protect, requireAdmin, async (req, res) => {
  try {
    const { feeId } = req.params;
    const { academicYear, monthlyFee, isActive } = req.body;

    const feeStructure = await FeeStructure.findById(feeId);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found"
      });
    }

    // Validate Academic Year
    if (
      academicYear === undefined ||
      String(academicYear).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Academic year is required"
      });
    }

    // Validate Monthly Fee
    if (
      monthlyFee === undefined ||
      monthlyFee === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly fee is required"
      });
    }

    const fee = Number(monthlyFee);

    if (Number.isNaN(fee) || fee < 0) {
      return res.status(400).json({
        success: false,
        message: "Monthly fee must be a valid number"
      });
    }

    // Update allowed fields
    feeStructure.academicYear = String(academicYear).trim();
    feeStructure.monthlyFee = fee;

    if (typeof isActive === "boolean") {
      feeStructure.isActive = isActive;
    }

    await feeStructure.save();

    return res.json({
      success: true,
      message: "Fee structure updated successfully",
      feeStructure
    });

  } catch (error) {
    console.error(
      "Update fee structure error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update fee structure",
      error: error.message
    });
  }
});

/* =====================================================
   ADMIN — MARK STUDENT PAYMENT AS PAID
   (Legacy endpoint - kept for compatibility)
===================================================== */

router.put(
  "/payments/students/:paymentId/mark-paid",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { transactionReference } = req.body;

      const payment =
        await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      if (payment.status === "Paid") {
        return res.status(400).json({
          success: false,
          message: "Payment is already marked as paid"
        });
      }

      if (!transactionReference) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required to verify funds before marking as paid"
        });
      }

      /* Find the transaction to verify.
         The reference must be supplied by the caller. */
      const txnIndex = payment.transactions.findIndex(
        (txn) => txn.transactionReference === transactionReference
      );

      if (txnIndex < 0) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found"
        });
      }

      const transaction = payment.transactions[txnIndex];

      if (transaction.status === "Verified") {
        return res.json({
          success: true,
          message: "Transaction already verified",
          payment,
          transaction,
          fullyPaid: payment.status === "Paid",
        });
      }

      if (transaction.status !== "Submitted") {
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be verified. Current status: ${transaction.status}`
        });
      }

      // Core verification and update logic (concurrency-safe).
      // Atomically flip the Submitted transaction to Verified and add its
      // amount to amountPaid exactly once. Proceed only if the update
      // actually modified a document.
      const verificationResult = await verifyTransactionAtomically(
        paymentId,
        transaction._id,
        transaction.amount,
        req.user._id
      );

      let updatedPayment;
      let updatedTransaction;

      if (verificationResult.modifiedCount === 0) {
        // No transaction was atomically updated. Reload the payment and
        // distinguish an already-verified transaction from a missing
        // transaction or one in another status. Never increment amountPaid
        // again.
        const fresh = await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );
        if (!fresh) {
          return res.status(404).json({
            success: false,
            message: "Payment record not found"
          });
        }
        const freshTxn = fresh.transactions.find(
          (txn) => txn.transactionReference === transactionReference
        );
        if (!freshTxn) {
          return res.status(404).json({
            success: false,
            message: "Transaction not found"
          });
        }
        if (freshTxn.status === "Verified") {
          return res.json({
            success: true,
            message: "Transaction already verified",
            payment: fresh,
            transaction: freshTxn,
            fullyPaid: fresh.status === "Paid",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be verified. Current status: ${freshTxn.status}`
        });
      }

      // Reload the latest payment document before recomputing status, so we
      // never save a stale document that could overwrite the atomic increment.
      updatedPayment = await StudentPayment.findById(paymentId).populate(
        "student",
        "firstName lastName email class"
      );
      if (!updatedPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }
      updatedTransaction = updatedPayment.transactions.find(
        (txn) => txn.transactionReference === transactionReference
      );

      // Recompute document-level status from the reloaded transactions,
      // mirroring the previous partial-payment logic.
      recomputePaymentStatus(updatedPayment);

      // If fully paid, allocate a unique bill number from the atomic
      // BillCounter. The counter is idempotent: an already-assigned bill
      // number is reused, so repeated requests cannot generate a second bill number.
      if (updatedPayment.status === "Paid") {
        if (!updatedPayment.billNumber) {
          const newBill = await allocateBillNumber();
          // Atomically set the bill number only if it hasn't been set yet.
          // This prevents duplicate bill numbers under concurrent approvals.
          const result = await StudentPayment.updateOne(
            { _id: updatedPayment._id, billNumber: "" },
            { $set: { billNumber: newBill } }
          );
          if (result.modifiedCount > 0) {
            updatedPayment.billNumber = newBill;
          } else {
            // Another request already allocated a bill number; use it.
            const fresh = await StudentPayment.findById(updatedPayment._id);
            if (fresh) {
              updatedPayment.billNumber = fresh.billNumber;
            }
          }
        }

        if (!updatedPayment.receiptGeneratedAt) {
          updatedPayment.receiptGeneratedAt = new Date();
        }
      }

      await updatedPayment.save();

      return res.json({
        success: true,
        message: "Transaction verified and payment marked as paid",
        payment: updatedPayment,
        transaction: updatedTransaction,
        fullyPaid: updatedPayment.status === "Paid",
      });

    } catch (error) {
      console.error(
        "Mark student payment as paid error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to mark payment as paid",
        error: error.message
      });
    }
  }
);


/* =====================================================
   ADMIN — REJECT STUDENT PAYMENT TRANSACTION
   Rejects a submitted transaction with a reason
===================================================== */

router.put(
  "/payments/students/:paymentId/reject",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { transactionReference, rejectionReason } = req.body;

      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
      }

      if (!transactionReference || !transactionReference.trim()) {
        return res.status(400).json({
          success: false,
          message: "Transaction reference is required"
        });
      }

      const payment =
        await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      // Find the transaction to reject
      const txnIndex = payment.transactions.findIndex(
        (txn) => txn.transactionReference === transactionReference.trim()
      );

      if (txnIndex < 0) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found"
        });
      }

      const transaction = payment.transactions[txnIndex];

      if (transaction.status !== "Submitted") {
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be rejected. Current status: ${transaction.status}`
        });
      }

      // Update transaction status
      transaction.status = "Rejected";
      transaction.rejectionReason = rejectionReason.trim();
      transaction.verifiedAt = new Date();
      transaction.verifiedBy = req.user._id;

      // Update overall payment status
      const hasSubmitted = payment.transactions.some(
        (txn) => txn.status === "Submitted"
      );
      const allVerified =
        payment.transactions.length > 0 &&
        payment.transactions.every((txn) => txn.status === "Verified");
      const allRejected =
        payment.transactions.length > 0 &&
        payment.transactions.every((txn) => txn.status === "Rejected");

      if (allRejected) {
        payment.status = "Rejected";
      } else if (hasSubmitted) {
        payment.status = "Submitted";
      } else if (allVerified && payment.amountPaid >= payment.monthlyFee) {
        payment.status = "Paid";
      } else {
        payment.status = "Pending";
      }

      // Record admin who rejected
      payment.verifiedBy = req.user._id;
      payment.verifiedAt = new Date();

      await payment.save();

      // Send rejection email to student
      const studentName =
        `${payment.student?.firstName || ""} ${
          payment.student?.lastName || ""
        }`.trim();

      const rejectionDate = transaction.verifiedAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      try {
        await transporter.sendMail({
          from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
          to: payment.student.email,
          subject: "CEITCS Course Fee Payment Transaction - Rejected",
          html: `
            <div style="
              font-family: Arial, sans-serif;
              background-color: #ffffff;
              color: #333333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.7;
            ">
              <h2 style="color: #2f4b8f; margin-bottom: 5px;">
                CeiT Academy - Online Tuition
              </h2>

              <p style="color: #666666; margin-top: 0; margin-bottom: 25px;">
                CEITCS Course Fee Payment Transaction - Rejected
              </p>

              <p>Dear ${studentName},</p>

              <p>
                We regret to inform you that your course fee payment transaction has been <strong>rejected</strong> by our admin team.
              </p>

              <div style="
                background-color: #fff1f1;
                border-left: 4px solid #d9534f;
                padding: 15px 18px;
                margin: 20px 0;
              ">
                <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${payment.className}</p>
                <p style="margin: 5px 0;"><strong>Monthly Fee:</strong> ₹${payment.monthlyFee}</p>
                <p style="margin: 5px 0;"><strong>Verified Amount Paid:</strong> ₹${payment.amountPaid || 0}</p>
                <p style="margin: 5px 0;"><strong>Transaction Reference (UTR):</strong> ${transaction.transactionReference}</p>
                <p style="margin: 5px 0;"><strong>Submitted Amount:</strong> ₹${transaction.amount}</p>
                <p style="margin: 5px 0;"><strong>Rejection Date:</strong> ${rejectionDate}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #d9534f;">Rejected</span></p>
              </div>

              <p>
                <strong>Reason for rejection:</strong>
              </p>

              <div style="
                background-color: #f5f5f5;
                padding: 15px 18px;
                border-left: 4px solid #d9534f;
                margin: 10px 0 20px 0;
              ">
                ${rejectionReason.trim()}
              </div>

              <p>
                Please review the reason mentioned above. You may contact the institute administration for clarification or resubmit your payment proof with the correct details through the student payment portal.
              </p>

              <p>
                If you believe this was an error, please contact the administration directly.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #dddddd;
                  margin: 30px 0;
                "
              />

              <p>
                Regards,<br />
                <strong>Admin</strong><br />
                <strong>CeiT Academy - Online Tuition</strong>
              </p>

              <p
                style="
                  color: #888888;
                  font-size: 13px;
                  margin-top: 30px;
                "
              >
                This is an automated email from CeiT Academy - Online Tuition.
                Please do not reply directly to this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(
          "Failed to send student payment rejection email:",
          emailError?.message || emailError
        );
      }

      return res.json({
        success: true,
        message: "Transaction rejected successfully",
        payment,
        transaction: payment.transactions[txnIndex]
      });

    } catch (error) {
      console.error(
        "Reject transaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to reject transaction",
        error: error.message
      });
    }
  }
);


/* =====================================================
   ADMIN — APPROVE STUDENT PAYMENT TRANSACTION
   Verifies a submitted transaction and adds to verified total
===================================================== */

router.put(
  "/payments/students/:paymentId/approve",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { transactionReference } = req.body;

      const payment =
        await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      /* Find the transaction to approve.

         The reference is normally supplied by the admin dashboard.
         If it is omitted, fall back to the single pending submission
         so existing callers keep working. When several submissions
         are pending the caller must name one explicitly. */
      const pendingTransactions = payment.transactions.filter(
        (txn) => txn.status === "Submitted"
      );

      let txnIndex = -1;

      if (transactionReference) {
        txnIndex = payment.transactions.findIndex(
          (txn) => txn.transactionReference === transactionReference
        );

        if (txnIndex < 0) {
          return res.status(404).json({
            success: false,
            message: "Transaction not found"
          });
        }

      } else if (pendingTransactions.length === 1) {
        txnIndex = payment.transactions.indexOf(pendingTransactions[0]);

      } else if (pendingTransactions.length > 1) {
        return res.status(400).json({
          success: false,
          message:
            "Multiple submissions are pending. Specify the transaction reference to approve."
        });

      } else {
        return res.status(400).json({
          success: false,
          message: "No submitted transaction is awaiting verification"
        });
      }

      const transaction = payment.transactions[txnIndex];
      const approvedTransaction = transaction;

      if (transaction.status === "Verified") {
        // Idempotent: this transaction was already approved. Return the
        // current state without reprocessing, so repeated approval requests
        // cannot generate duplicate bills or send duplicate notifications.
        return res.json({
          success: true,
          message: "Transaction already approved",
          payment,
          transaction,
          fullyPaid: payment.status === "Paid",
        });
      }

      if (transaction.status !== "Submitted") {
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be approved. Current status: ${transaction.status}`
        });
      }

      // Core verification and update logic (concurrency-safe).
      // Atomically flip the Submitted transaction to Verified and add its
      // amount to amountPaid exactly once. Proceed only if the update
      // actually modified a document.
      const verificationResult = await verifyTransactionAtomically(
        paymentId,
        transaction._id,
        transaction.amount,
        req.user._id
      );

      let updatedPayment;
      let updatedTransaction;

      if (verificationResult.modifiedCount === 0) {
        // No transaction was atomically updated. Reload the payment and
        // distinguish an already-verified transaction from a missing
        // transaction or one in another status. Never increment amountPaid
        // again.
        const fresh = await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );
        if (!fresh) {
          return res.status(404).json({
            success: false,
            message: "Payment record not found"
          });
        }
        const freshTxn = fresh.transactions.find(
          (txn) => txn.transactionReference === transactionReference
        );
        if (!freshTxn) {
          return res.status(404).json({
            success: false,
            message: "Transaction not found"
          });
        }
        if (freshTxn.status === "Verified") {
          // Idempotent: this transaction was already approved.
          return res.json({
            success: true,
            message: "Transaction already approved",
            payment: fresh,
            transaction: freshTxn,
            fullyPaid: fresh.status === "Paid",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be approved. Current status: ${freshTxn.status}`
        });
      }

      // Reload the latest payment document before recomputing status, so we
      // never save a stale document that could overwrite the atomic increment.
      updatedPayment = await StudentPayment.findById(paymentId).populate(
        "student",
        "firstName lastName email class"
      );
      if (!updatedPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }
      updatedTransaction = updatedPayment.transactions.find(
        (txn) => txn.transactionReference === transactionReference
      );

      // Recompute document-level status from the reloaded transactions,
      // mirroring the previous partial-payment logic.
      recomputePaymentStatus(updatedPayment);

      await updatedPayment.save();

      // If fully paid, allocate a unique bill number from the atomic
      // BillCounter. The counter is idempotent: an already-assigned bill
      // number is reused, so repeated approval requests cannot generate
      // a second bill number.
      if (updatedPayment.status === "Paid") {
        if (!updatedPayment.billNumber) {
          const newBill = await allocateBillNumber();
          // Atomically set the bill number only if it hasn't been set yet.
          // This prevents duplicate bill numbers under concurrent approvals.
          const result = await StudentPayment.updateOne(
            { _id: updatedPayment._id, billNumber: "" },
            { $set: { billNumber: newBill } }
          );
          if (result.modifiedCount > 0) {
            updatedPayment.billNumber = newBill;
          } else {
            // Another request already allocated a bill number; use it.
            const fresh = await StudentPayment.findById(updatedPayment._id);
            if (fresh) {
              updatedPayment.billNumber = fresh.billNumber;
            }
          }
        }

        if (!updatedPayment.receiptGeneratedAt) {
          updatedPayment.receiptGeneratedAt = new Date();
        }

        await updatedPayment.save();
      }

      const billNumber = updatedPayment.status === "Paid" ? (updatedPayment.billNumber || "") : "";

      // Send approval email to student
      const studentName =
        `${updatedPayment.student?.firstName || ""} ${
          updatedPayment.student?.lastName || ""
        }`.trim();

      const approvalDate = updatedPayment.verifiedAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const paymentMethodDisplay = updatedTransaction.method === "UPI_ID" ? "UPI ID" : "QR Code";
      const upiIdDisplay = updatedTransaction.method === "UPI_ID" && updatedPayment.studentUpiId
        ? updatedPayment.studentUpiId
        : "N/A";

      const approvalSubject = updatedPayment.status === "Paid"
        ? "CEITCS Course Fee Payment - PAID"
        : "CEITCS Course Fee Payment Transaction - Approved";

      try {
        await transporter.sendMail({
          from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
          to: updatedPayment.student.email,
          subject: approvalSubject,
          html: `
            <div style="
              font-family: Arial, sans-serif;
              background-color: #ffffff;
              color: #333333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.7;
            ">
              <h2 style="color: #2f4b8f; margin-bottom: 5px;">
                CeiT Academy - Online Tuition
              </h2>

              <p style="color: #666666; margin-top: 0; margin-bottom: 25px;">
                ${approvalSubject}
              </p>

              <p>Dear ${studentName},</p>

              <p>
                We are pleased to inform you that your course fee payment transaction has been <strong>approved</strong> by our admin team.
              </p>

              <div style="
                background-color: #e8f5e9;
                border-left: 4px solid #4caf50;
                padding: 15px 18px;
                margin: 20px 0;
              ">
                <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${updatedPayment.className}</p>
                <p style="margin: 5px 0;"><strong>Monthly Fee:</strong> ₹${updatedPayment.monthlyFee}</p>
                <p style="margin: 5px 0;"><strong>Verified Amount Paid:</strong> ₹${updatedPayment.amountPaid || 0}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethodDisplay}</p>
                ${updatedTransaction.method === "UPI_ID" ? `<p style="margin: 5px 0;"><strong>UPI ID:</strong> ${upiIdDisplay}</p>` : ""}
                <p style="margin: 5px 0;"><strong>Transaction Reference (UTR):</strong> ${updatedTransaction.transactionReference}</p>
                ${billNumber ? `<p style="margin: 5px 0;"><strong>Bill Number:</strong> ${billNumber}</p>` : ""}
                <p style="margin: 5px 0;"><strong>Approval Date:</strong> ${approvalDate}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #4caf50;">${updatedPayment.status === "Paid" ? "Paid" : "Partially Verified"}</span></p>
              </div>

              <p>
                Your payment has been successfully verified. ${updatedPayment.status === "Paid" ? "This month's tuition fee is now fully paid." : "Your payment is partially verified; the remaining balance will be updated upon further verification."}
              </p>

              <p>
                ${updatedPayment.status === "Paid" ? "You can download your official receipt from the Payments page." : "You will receive a receipt once the full payment is verified."}
              </p>

              <p>
                If you have any questions, please contact the administration.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #dddddd;
                  margin: 30px 0;
                "
              />

              <p>
                Regards,<br />
                <strong>Admin</strong><br />
                <strong>CeiT Academy - Online Tuition</strong>
              </p>

              <p
                style="
                  color: #888888;
                  font-size: 13px;
                  margin-top: 30px;
                "
              >
                This is an automated email from CeiT Academy - Online Tuition.
                Please do not reply directly to this email.
              </p>
            </div>
          `,
        });

        console.log(
          "📧 Student payment approval email sent to:",
          updatedPayment.student.email
        );
      } catch (emailError) {
        console.error(
          "Failed to send student payment approval email:",
          emailError
        );
      }

      /* -----------------------------------------------------
          COMPANY NOTIFICATION EMAIL

          The company inbox must be notified when an admin
          verifies a student payment. The verified amount is
          taken from the approved transaction (a trusted
          backend source), never invented.
       ----------------------------------------------------- */

      const companyEmail = process.env.COMPANY_EMAIL;

      if (companyEmail) {
        const verifiedAmount =
          updatedTransaction?.amount !== undefined &&
          updatedTransaction?.amount !== null
            ? `₹${Number(updatedTransaction.amount).toLocaleString("en-IN")}`
            : "Not recorded";

        const verificationDate = (updatedPayment.verifiedAt || new Date()).toLocaleString(
          "en-IN",
          { timeZone: "Asia/Kolkata" }
        );

        const paymentStatus =
          updatedPayment.status === "Paid"
            ? "Paid"
            : "Partially Verified";

        try {
          await transporter.sendMail({
            from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
            to: companyEmail,
            subject: `Payment Verified - ${paymentStatus}`,
            html: `
              <div style="
                font-family: Arial, sans-serif;
                background-color: #ffffff;
                color: #333333;
                max-width: 650px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.7;
              ">
                <h2 style="color: #2f4b8f; margin-bottom: 5px;">
                  CeiT Academy - Online Tuition
                </h2>

                <p style="color: #666666; margin-top: 0; margin-bottom: 25px;">
                  Payment Verified - ${paymentStatus}
                </p>

                <p>
                  An admin has verified a student payment transaction.
                </p>

                <div style="
                  background-color: #e8f5e9;
                  border-left: 4px solid #4caf50;
                  padding: 15px 18px;
                  margin: 20px 0;
                ">
                  <p style="margin: 5px 0;"><strong>Student Name:</strong> ${updatedPayment.student?.firstName || ""} ${updatedPayment.student?.lastName || ""}</p>
                  <p style="margin: 5px 0;"><strong>Student ID:</strong> ${updatedPayment.student?._id?.toString() || "-"}</p>
                  <p style="margin: 5px 0;"><strong>Student Email:</strong> ${updatedPayment.student?.email || "-"}</p>
                  <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${updatedPayment.student?.class || updatedPayment.className || "-"}</p>
                  <p style="margin: 5px 0;"><strong>Applicable Tuition Fee:</strong> ₹${updatedPayment.monthlyFee}</p>
                  <p style="margin: 5px 0;"><strong>Verified Amount Paid:</strong> ${verifiedAmount}</p>
                  <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethodDisplay}</p>
                  ${updatedTransaction.method === "UPI_ID" ? `<p style="margin: 5px 0;"><strong>UPI ID:</strong> ${upiIdDisplay}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>Transaction Reference / UTR:</strong> ${updatedTransaction?.transactionReference || "-"}</p>
                  <p style="margin: 5px 0;"><strong>Verification Date:</strong> ${verificationDate}</p>
                  <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: #4caf50;">${paymentStatus}</span></p>
                  <p style="margin: 5px 0;"><strong>Payment Record ID:</strong> ${updatedPayment._id}</p>
                </div>

                <hr
                  style="
                    border: none;
                    border-top: 1px solid #dddddd;
                    margin: 30px 0;
                  "
                />

                <p>
                  Regards,<br />
                  <strong>System</strong><br />
                  <strong>CeiT Academy - Online Tuition</strong>
                </p>

                <p
                  style="
                    color: #888888;
                    font-size: 13px;
                    margin-top: 30px;
                  "
                >
                  This is an automated email from CeiT Academy - Online Tuition.
                  Please do not reply directly to this email.
                </p>
              </div>
            `,
          });

          console.log(
            "📧 Company payment verification notification sent to:",
            companyEmail,
            "| Payment ID:",
            updatedPayment._id
          );
        } catch (emailError) {
          console.error(
            "Failed to send company payment verification notification:",
            {
              paymentId: updatedPayment._id,
              recipient: companyEmail,
              error: errorError?.message || errorError,
            }
          );
        }
      }

      return res.json({
        success: true,
        message: "Transaction approved successfully",
        payment: updatedPayment,
        transaction: updatedTransaction,
        fullyPaid: updatedPayment.status === "Paid"
      });

    } catch (error) {
      console.error(
        "Approve transaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to approve transaction",
        error: error.message
      });
    }
  }
);

/* =====================================================
   ADMIN — GENERATE RECEIPT FOR PAID PAYMENT
   Generates a PDF receipt for verified Paid payments.
   Idempotent: reuses an existing bill number; allocates a
   unique one from the atomic BillCounter only when missing,
   so concurrent requests cannot create duplicate bill numbers.
===================================================== */

router.post(
  "/payments/students/:paymentId/generate-receipt",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const payment =
        await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      if (payment.status !== "Paid") {
        return res.status(400).json({
          success: false,
          message: `Receipt can only be generated for paid payments. Current status: ${payment.status}`
        });
      }

      // Reuse an existing bill number; allocate a unique one only when missing.
      // BillCounter allocation is atomic, so concurrent allocations cannot
      // hand out the same bill number. The conditional updateOne makes the
      // assignment idempotent when approvals race.
      let billNumber = payment.billNumber;
      if (!billNumber) {
        billNumber = await allocateBillNumber();
        const result = await StudentPayment.updateOne(
          { _id: payment._id, billNumber: "" },
          { $set: { billNumber } }
        );
        if (result.modifiedCount > 0) {
          payment.billNumber = billNumber;
        } else {
          const fresh = await StudentPayment.findById(payment._id);
          if (fresh) {
            payment.billNumber = fresh.billNumber;
            billNumber = payment.billNumber;
          }
        }
      }

      if (!payment.receiptGeneratedAt) {
        payment.receiptGeneratedAt = new Date();
      }

      await payment.save();

      const pdfBuffer = await generateReceiptPdf(payment, billNumber);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${billNumber}.pdf"`,
        "Content-Length": pdfBuffer.length,
      });
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Generate receipt error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate receipt",
        error: error.message
      });
    }
  }
);

/* =====================================================
   ADMIN — EMAIL RECEIPT TO STUDENT AND ADMIN
   Sends the generated receipt as a PDF attachment.
   Only issued after the payment is verified and marked Paid.
===================================================== */

router.post(
  "/payments/students/:paymentId/email-receipt",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const payment =
        await StudentPayment.findById(paymentId).populate(
          "student",
          "firstName lastName email class"
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      if (payment.status !== "Paid") {
        return res.status(400).json({
          success: false,
          message: `Receipt can only be emailed for paid payments. Current status: ${payment.status}`
        });
      }

      // Reuse an existing bill number; allocate a unique one only when missing.
      // BillCounter allocation is atomic; the conditional updateOne makes the
      // assignment idempotent under concurrent requests.
      let billNumber = payment.billNumber;
      if (!billNumber) {
        billNumber = await allocateBillNumber();
        const result = await StudentPayment.updateOne(
          { _id: payment._id, billNumber: "" },
          { $set: { billNumber } }
        );
        if (result.modifiedCount > 0) {
          payment.billNumber = billNumber;
        } else {
          const fresh = await StudentPayment.findById(payment._id);
          if (fresh) {
            payment.billNumber = fresh.billNumber;
            billNumber = payment.billNumber;
          }
        }
      }

      if (!payment.receiptGeneratedAt) {
        payment.receiptGeneratedAt = new Date();
      }

      await payment.save();

      const pdfBuffer = await generateReceiptPdf(payment, billNumber);

      const studentName =
        `${payment.student?.firstName || ""} ${
          payment.student?.lastName || ""
        }`.trim();

      const studentEmail = payment.student?.email || "";
      const studentClass = payment.student?.class || payment.className || "-";
      const amountPaid = payment.amountPaid || payment.monthlyFee || 0;
      const transactionRef = payment.transactionReference || "-";
      const verificationDate = payment.verifiedAt
        ? payment.verifiedAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : payment.paidAt
        ? payment.paidAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          });
      const receiptDate = payment.receiptGeneratedAt
        ? payment.receiptGeneratedAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          });

      const adminEmail = process.env.ADMIN_EMAIL;
      const emailResults = { student: false, admin: false, company: false };

      try {
        const info = await transporter.sendMail({
          from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
          to: studentEmail,
          subject: `CEITCS Course Fee Receipt - ${billNumber}`,
          html: `
            <div style="
              font-family: Arial, sans-serif;
              background-color: #ffffff;
              color: #333333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.7;
            ">
              <h2 style="color: #2f4b8f; margin-bottom: 5px;">
                CeiT Academy - Online Tuition
              </h2>

              <p style="color: #666666; margin-top: 0; margin-bottom: 25px;">
                CEITCS Course Fee Receipt
              </p>

              <p>Dear ${studentName},</p>

              <p>
                Your course fee payment has been verified and approved. Please find your official receipt attached as a PDF.
              </p>

              <div style="
                background-color: #e8f5e9;
                border-left: 4px solid #4caf50;
                padding: 15px 18px;
                margin: 20px 0;
              ">
                <p style="margin: 5px 0;"><strong>Bill Number:</strong> ${billNumber}</p>
                <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${studentClass}</p>
                <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amountPaid.toLocaleString("en-IN")}</p>
                <p style="margin: 5px 0;"><strong>Transaction Reference:</strong> ${transactionRef}</p>
                <p style="margin: 5px 0;"><strong>Verification Date:</strong> ${verificationDate}</p>
                <p style="margin: 5px 0;"><strong>Receipt Date:</strong> ${receiptDate}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #4caf50;">Paid</span></p>
              </div>

              <p>
                This receipt serves as proof of payment for your records. Please keep it for future reference.
              </p>

              <hr
                style="
                  border: none;
                  border-top: 1px solid #dddddd;
                  margin: 30px 0;
                "
              />

              <p>
                Regards,<br />
                <strong>Admin</strong><br />
                <strong>CeiT Academy - Online Tuition</strong>
              </p>

              <p
                style="
                  color: #888888;
                  font-size: 13px;
                  margin-top: 30px;
                "
              >
                This is an automated email from CeiT Academy - Online Tuition.
                Please do not reply directly to this email.
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `receipt-${billNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        emailResults.student = true;
        console.log(
          "📧 Receipt email sent to student:",
          {
            to: studentEmail,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
          }
        );
      } catch (emailError) {
        console.error(
          "Failed to send receipt email to student:",
          emailError?.message || emailError
        );
      }

      // Send email to admin if configured
      if (adminEmail) {
        try {
          const info = await transporter.sendMail({
            from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `CEITCS Course Fee Receipt Generated - ${billNumber}`,
            html: `
              <div style="
                font-family: Arial, sans-serif;
                background-color: #ffffff;
                color: #333333;
                max-width: 650px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.7;
              ">
                <h2 style="color: #2f4b8f; margin-bottom: 5px;">
                  CeiT Academy - Online Tuition
                </h2>

                <p style="color: #666666; margin-top: 0; margin-bottom: 25px;">
                  CEITCS Course Fee Receipt Generated
                </p>

                <p>
                  An official receipt has been generated for a student payment.
                </p>

                <div style="
                  background-color: #f0f4ff;
                  border-left: 4px solid #2f4b8f;
                  padding: 15px 18px;
                  margin: 20px 0;
                ">
                  <p style="margin: 5px 0;"><strong>Bill Number:</strong> ${billNumber}</p>
                  <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                  <p style="margin: 5px 0;"><strong>Student Email:</strong> ${studentEmail}</p>
                  <p style="margin: 5px 0;"><strong>Student ID:</strong> ${payment.student?._id?.toString() || "-"}</p>
                  <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${studentClass}</p>
                  <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amountPaid.toLocaleString("en-IN")}</p>
                  <p style="margin: 5px 0;"><strong>Transaction Reference:</strong> ${transactionRef}</p>
                  <p style="margin: 5px 0;"><strong>Verification Date:</strong> ${verificationDate}</p>
                  <p style="margin: 5px 0;"><strong>Receipt Date:</strong> ${receiptDate}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #4caf50;">Paid</span></p>
                </div>

                <p>
                  The receipt PDF is attached for your records.
                </p>

                <hr
                  style="
                    border: none;
                    border-top: 1px solid #dddddd;
                    margin: 30px 0;
                  "
                />

                <p>
                  Regards,<br />
                  <strong>System</strong><br />
                  <strong>CeiT Academy - Online Tuition</strong>
                </p>

                <p
                  style="
                    color: #888888;
                    font-size: 13px;
                    margin-top: 30px;
                  "
                >
                  This is an automated email from CeiT Academy - Online Tuition.
                  Please do not reply directly to this email.
                </p>
              </div>
            `,
            attachments: [
              {
                filename: `receipt-${billNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          });

          emailResults.admin = true;
          console.log(
            "📧 Receipt email sent to admin:",
            {
              to: adminEmail,
              messageId: info.messageId,
              accepted: info.accepted,
              rejected: info.rejected,
            }
          );
        } catch (emailError) {
          console.error(
            "Failed to send receipt email to admin:",
            emailError?.message || emailError
          );
        }
      }

      // Send email to company if configured
      const companyEmail = process.env.COMPANY_EMAIL;
      if (companyEmail) {
        try {
          const info = await transporter.sendMail({
            from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
            to: companyEmail,
            subject: `CEITCS Course Fee Receipt Generated - ${billNumber}`,
            html: `
              <div style="
                font-family: Arial, sans-serif;
                background-color: #ffffff;
                color: #333333;
                max-width: 650px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.7;
              ">
                <h2 style="color: #2f4b8f; margin-bottom: 5px;">
                  CeiT Academy - Online Tuition
                </h2>

                <p style="color: #666666; margin-top: 0; margin-bottom: 25px;">
                  CEITCS Course Fee Receipt Generated (Company Copy)
                </p>

                <p>
                  An official receipt has been generated for a student payment.
                </p>

                <div style="
                  background-color: #f0f4ff;
                  border-left: 4px solid #2f4b8f;
                  padding: 15px 18px;
                  margin: 20px 0;
                ">
                  <p style="margin: 5px 0;"><strong>Bill Number:</strong> ${billNumber}</p>
                  <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                  <p style="margin: 5px 0;"><strong>Student Email:</strong> ${studentEmail}</p>
                  <p style="margin: 5px 0;"><strong>Student ID:</strong> ${payment.student?._id?.toString() || "-"}</p>
                  <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${studentClass}</p>
                  <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amountPaid.toLocaleString("en-IN")}</p>
                  <p style="margin: 5px 0;"><strong>Transaction Reference:</strong> ${transactionRef}</p>
                  <p style="margin: 5px 0;"><strong>Verification Date:</strong> ${verificationDate}</p>
                  <p style="margin: 5px 0;"><strong>Receipt Date:</strong> ${receiptDate}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #4caf50;">Paid</span></p>
                </div>

                <p>
                  The receipt PDF is attached for your records.
                </p>

                <hr
                  style="
                    border: none;
                    border-top: 1px solid #dddddd;
                    margin: 30px 0;
                  "
                />

                <p>
                  Regards,<br />
                  <strong>System</strong><br />
                  <strong>CeiT Academy - Online Tuition</strong>
                </p>

                <p
                  style="
                    color: #888888;
                    font-size: 13px;
                    margin-top: 30px;
                  "
                >
                  This is an automated email from CeiT Academy - Online Tuition.
                  Please do not reply directly to this email.
                </p>
              </div>
            `,
            attachments: [
              {
                filename: `receipt-${billNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          });

          emailResults.company = true;
          console.log(
            "📧 Receipt email sent to company:",
            {
              to: companyEmail,
              messageId: info.messageId,
              accepted: info.accepted,
              rejected: info.rejected,
            }
          );
        } catch (emailError) {
          console.error(
            "Failed to send receipt email to company:",
            emailError?.message || emailError
          );
        }
      }

      return res.json({
        success: true,
        message: "Receipt emailed successfully",
        billNumber,
        emailResults
      });

    } catch (error) {
      console.error("Email receipt error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to email receipt",
        error: error.message
      });
    }
  }
);

/* =====================================================
   DELETE TEACHER
===================================================== */
router.delete("/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Delete teacher error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

/* =====================================================
   ADMIN — GENERATE CURRENT MONTH STUDENT PAYMENTS
===================================================== */

router.post("/payments/students/generate", protect, requireAdmin, async (req, res) => {
  try {
    const now = new Date();

    const academicYear =
      now.getMonth() + 1 >= 4
        ? `${now.getFullYear()}-${now.getFullYear() + 1}`
        : `${now.getFullYear() - 1}-${now.getFullYear()}`;

    const paymentMonth =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;

    // Get all approved and active students
    const students = await Student.find({
      approvalStatus: "Approved",
      isActive: true
    });

    let createdCount = 0;

    for (const student of students) {
      const className = String(student.class || "")
  .replace(/^Class\s*/i, "")
  .replace(/th$|st$|nd$|rd$/i, "")
  .trim();

      // Get fee for student's class
      const fee = await FeeStructure.findOne({
        academicYear,
        className,
        isActive: true
      });

      // Skip students whose class has no fee structure
      if (!fee) {
        continue;
      }

      // Check whether this month's record already exists
      const existingPayment = await StudentPayment.findOne({
        student: student._id,
        academicYear,
        paymentMonth
      });

      // Don't create duplicates
      if (existingPayment) {
        continue;
      }

      await StudentPayment.create({
        student: student._id,
        className,
        academicYear,
        paymentMonth,
        monthlyFee: fee.monthlyFee,
        amountPaid: 0,
        status: "Pending"
      });

      createdCount++;
    }

    return res.json({
      success: true,
      message: "Student payments generated successfully",
      createdCount,
      paymentMonth,
      academicYear
    });

  } catch (error) {
    console.error(
      "Student payment generation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate student payments",
      error: error.message
    });
  }
});

/* =====================================================
   ADMIN — CREATE CURRENT MONTH TEACHER PAYMENT
===================================================== */

router.post("/teacher-payments/generate-all", protect, requireAdmin, async (req, res) => {
  try {
    const now = new Date();

    const paymentMonth =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const ratePerStudent = 1500;

    const teachers = await Teacher.find({
      isApproved: true
    });

    const createdPayments = [];
    const skippedPayments = [];

    for (const teacher of teachers) {

      const teacherClasses = Array.isArray(teacher.classesAssigned)
        ? teacher.classesAssigned
        : [];

      if (teacherClasses.length === 0) {
        skippedPayments.push({
          teacherId: teacher._id,
          reason: "No classes assigned"
        });
        continue;
      }

      const existingPayment = await TeacherPayment.findOne({
        teacher: teacher._id,
        paymentMonth
      });

      if (existingPayment) {
        skippedPayments.push({
          teacherId: teacher._id,
          reason: "Payment already generated"
        });
        continue;
      }

      const students = await Student.find({
        class: { $in: teacherClasses },
        approvalStatus: "Approved",
        isActive: true
      }).select("class");

      const classCounts = {};

      students.forEach((student) => {
        const className = student.class;

        if (!classCounts[className]) {
          classCounts[className] = 0;
        }

        classCounts[className]++;
      });

      const classBreakdown = Object.entries(classCounts)
        .map(([className, studentCount]) => ({
          className,
          studentCount,
          classSalary: studentCount * ratePerStudent
        }))
        .sort((a, b) =>
          a.className.localeCompare(
            b.className,
            undefined,
            { numeric: true }
          )
        );

      const studentCount = students.length;
      const calculatedAmount = studentCount * ratePerStudent;

      const payment = await TeacherPayment.create({
        teacher: teacher._id,
        paymentMonth,
        studentCount,
        classBreakdown,
        ratePerStudent,
        calculatedAmount,
        status: "Pending"
      });

      createdPayments.push(payment);
    }

    return res.status(201).json({
      success: true,
      message: "Teacher payments generated successfully",
      paymentMonth,
      createdCount: createdPayments.length,
      skippedCount: skippedPayments.length,
      payments: createdPayments,
      skipped: skippedPayments
    });

  } catch (error) {
    console.error("Teacher payment generation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate teacher payments",
      error: error.message
    });
  }
});router.post("/teacher-payments/generate-all", async (req, res) => {
  try {
    const now = new Date();

    const paymentMonth =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const ratePerStudent = 1500;

    const teachers = await Teacher.find({
      isApproved: true
    });

    const createdPayments = [];
    const skippedPayments = [];

    for (const teacher of teachers) {

      const teacherClasses = Array.isArray(teacher.classesAssigned)
        ? teacher.classesAssigned
        : [];

      if (teacherClasses.length === 0) {
        skippedPayments.push({
          teacherId: teacher._id,
          reason: "No classes assigned"
        });
        continue;
      }

      const existingPayment = await TeacherPayment.findOne({
        teacher: teacher._id,
        paymentMonth
      });

      if (existingPayment) {
        skippedPayments.push({
          teacherId: teacher._id,
          reason: "Payment already generated"
        });
        continue;
      }

      const students = await Student.find({
        class: { $in: teacherClasses },
        approvalStatus: "Approved",
        isActive: true
      }).select("class");

      const classCounts = {};

      students.forEach((student) => {
        const className = student.class;

        if (!classCounts[className]) {
          classCounts[className] = 0;
        }

        classCounts[className]++;
      });

      const classBreakdown = Object.entries(classCounts)
        .map(([className, studentCount]) => ({
          className,
          studentCount,
          classSalary: studentCount * ratePerStudent
        }))
        .sort((a, b) =>
          a.className.localeCompare(
            b.className,
            undefined,
            { numeric: true }
          )
        );

      const studentCount = students.length;
      const calculatedAmount = studentCount * ratePerStudent;

      const payment = await TeacherPayment.create({
        teacher: teacher._id,
        paymentMonth,
        studentCount,
        classBreakdown,
        ratePerStudent,
        calculatedAmount,
        status: "Pending"
      });

      createdPayments.push(payment);
    }

    return res.status(201).json({
      success: true,
      message: "Teacher payments generated successfully",
      paymentMonth,
      createdCount: createdPayments.length,
      skippedCount: skippedPayments.length,
      payments: createdPayments,
      skipped: skippedPayments
    });

  } catch (error) {
    console.error("Teacher payment generation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate teacher payments",
      error: error.message
    });
  }
});

module.exports = router;
