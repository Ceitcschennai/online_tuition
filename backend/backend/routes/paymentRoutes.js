const express = require("express");

const Student = require("../models/Student");
const FeeStructure = require("../models/FeeStructure");
const StudentPayment = require("../models/StudentPayment");
const transporter = require("../config/email");
const { protect } = require("../middleware/authMiddleware");
const {
  generateReceiptPdf,
} = require("../utils/receiptPdf");

const router = express.Router();

/*
  The authenticated student's ID is the single source of truth.
  Student payment routes accept :studentId in the URL for route
  compatibility, but every database operation uses the ID encoded
  in the verified JWT (req.user._id). A student can therefore only
  ever read or modify their own payment records.
*/
const getAuthenticatedStudentId = (req) => {
  const id = req.user?._id || req.user?.id;
  return id ? id.toString() : null;
};


/* =========================================================
   HELPERS
========================================================= */

/*
  Convert values like:

  "Class 9"  -> "9"
  "9th"      -> "9"
  "Class 10" -> "10"
*/

const normalizeClass = (value) => {
  return String(value || "")
    .replace(/^Class\s*/i, "")
    .replace(/th$|st$|nd$|rd$/i, "")
    .trim();
};


/*
  Academic year:

  April 2026      -> 2026-2027
  September 2026  -> 2026-2027
  January 2027    -> 2026-2027
*/

const getAcademicYear = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 4) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
};


/*
  Payment month:

  September 2026 -> "2026-09"
*/

const getPaymentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};


/* =========================================================
   GET CURRENT STUDENT FEE

   GET /api/payments/student/:studentId/current

   Used by Student Payments page.
========================================================= */

router.get(
  "/student/:studentId/current",
  protect,
  async (req, res) => {
    try {
      const studentId = getAuthenticatedStudentId(req);

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }


      /* -----------------------------------------------------
         NORMALIZE CLASS
      ----------------------------------------------------- */

      const className = normalizeClass(
        student.class
      );

      if (!className) {
        return res.status(400).json({
          success: false,
          message: "Student class is not configured",
        });
      }


      /* -----------------------------------------------------
         CURRENT ACADEMIC YEAR
      ----------------------------------------------------- */

      const academicYear =
        getAcademicYear();


      /* -----------------------------------------------------
         CURRENT PAYMENT MONTH
      ----------------------------------------------------- */

      const paymentMonth =
        getPaymentMonth();


      /* -----------------------------------------------------
         GET CURRENT FEE STRUCTURE

         Always use the latest active fee
         configured by Admin.
      ----------------------------------------------------- */

      const fee =
        await FeeStructure.findOne({
          academicYear,
          className,
          isActive: true,
        });


      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            `Fee structure not configured for Class ${className}`,
        });
      }


      /* -----------------------------------------------------
         FIND CURRENT MONTH PAYMENT
      ----------------------------------------------------- */

      let payment =
        await StudentPayment.findOne({
          student: student._id,
          academicYear,
          paymentMonth,
        });


      /* -----------------------------------------------------
         CREATE PAYMENT IF IT DOES NOT EXIST
      ----------------------------------------------------- */

      if (!payment) {

        payment =
          await StudentPayment.create({
            student: student._id,
            className,
            academicYear,
            paymentMonth,
            monthlyFee: fee.monthlyFee,
            amountPaid: 0,
            status: "Pending",
          });

      }


      /* -----------------------------------------------------
         SYNC CURRENT UNPAID PAYMENT WITH FEE STRUCTURE

         If Admin changes the current fee, the unpaid
         payment should use the latest fee.

         Paid historical payments are NEVER changed.
      ----------------------------------------------------- */

      if (
        payment.status !== "Paid" &&
        (
          payment.monthlyFee !== fee.monthlyFee ||
          payment.className !== className
        )
      ) {

        payment.monthlyFee =
          fee.monthlyFee;

        payment.className =
          className;

        await payment.save();

      }


/* -----------------------------------------------------
          RETURN CURRENT PAYMENT
       ----------------------------------------------------- */

      const verifiedTotal = payment.amountPaid || 0;
      const outstandingBalance = payment.monthlyFee - verifiedTotal;
      const totalSubmitted = payment.transactions
        .filter((txn) => txn.status === "Submitted")
        .reduce((sum, txn) => sum + txn.amount, 0);
      const totalVerified = payment.transactions
        .filter((txn) => txn.status === "Verified")
        .reduce((sum, txn) => sum + txn.amount, 0);

      return res.json({
        success: true,

        student: {
          id: student._id,

          name:
            `${student.firstName || ""} ${
              student.lastName || ""
            }`.trim(),

          className,
        },

        fee: {
          monthlyFee: fee.monthlyFee,
          academicYear,
          paymentMonth,
        },

        payment: {
          ...payment.toObject(),
          verifiedTotal,
          outstandingBalance,
          totalSubmitted,
          totalVerified,
          canSubmitMore: outstandingBalance > 0 && payment.status !== "Paid"
        },
      });

    } catch (error) {

      console.error(
        "Current student fee error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load student fee",
      });
    }
  }
);


/* =========================================================
   GET UPI PAYMENT LINK FOR CURRENT STUDENT

   GET /api/payments/student/:studentId/upi-link

   Returns a UPI URI that prefills the payee address,
   payee name, exact amount (backend-calculated fee),
   currency INR, and a transaction reference for reconciliation.

   The student must be authenticated and approved.
   The UPI ID and payee name are read from environment variables.
   ========================================================= */

router.get(
  "/student/:studentId/upi-link",
  protect,
  async (req, res) => {
    try {
      const studentId = getAuthenticatedStudentId(req);

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      /* -----------------------------------------------------
         ONLY APPROVED STUDENTS CAN GET UPI LINK
       ----------------------------------------------------- */

      if (
        student.approvalStatus !== "Approved"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Student account is not approved",
        });
      }

      /* -----------------------------------------------------
         NORMALIZE CLASS
       ----------------------------------------------------- */

      const className = normalizeClass(
        student.class
      );

      if (!className) {
        return res.status(400).json({
          success: false,
          message: "Student class is not configured",
        });
      }

      /* -----------------------------------------------------
         CURRENT ACADEMIC YEAR & PAYMENT MONTH
       ----------------------------------------------------- */

      const academicYear = getAcademicYear();
      const paymentMonth = getPaymentMonth();

      /* -----------------------------------------------------
         GET CURRENT FEE STRUCTURE
       ----------------------------------------------------- */

      const fee = await FeeStructure.findOne({
        academicYear,
        className,
        isActive: true,
      });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            `Fee structure not configured for Class ${className}`,
        });
      }

      /* -----------------------------------------------------
         READ UPI CONFIGURATION FROM ENV
       ----------------------------------------------------- */

      const upiId = process.env.PAYEE_UPI_ID;
      const upiPayeeName = process.env.PAYEE_NAME || "CeiT Academy";

      if (!upiId) {
        return res.status(500).json({
          success: false,
          message: "UPI payment is not configured. Contact administrator.",
        });
      }

      /* -----------------------------------------------------
         BUILD UPI URI

         upi://pay?pa=<payee_address>&pn=<payee_name>&am=<amount>&cu=INR&tr=<txn_ref>&tn=<note>
       ----------------------------------------------------- */

      const amount = fee.monthlyFee;
      const transactionRef = `CEITCS-${studentId}-${Date.now()}`;
      const transactionNote = `CEITCS-${studentId}-${paymentMonth}`;

      const upiUri = [
        "upi://pay",
        `pa=${encodeURIComponent(upiId)}`,
        `pn=${encodeURIComponent(upiPayeeName)}`,
        `am=${encodeURIComponent(amount.toString())}`,
        "cu=INR",
        `tr=${encodeURIComponent(transactionRef)}`,
        `tn=${encodeURIComponent(transactionNote)}`,
      ].join("&");

      return res.json({
        success: true,
        upiUri,
        amount,
        transactionRef,
        academicYear,
        paymentMonth,
        className,
      });

    } catch (error) {

      console.error(
        "UPI link generation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate UPI payment link",
      });
    }
  }
);


/* =========================================================
   SUBMIT QR PAYMENT

   POST /api/payments/student/:studentId/submit

   Student:
   1. Scans institute QR
   2. Makes payment (full or partial)
   3. Enters UTR / transaction reference
   4. Enters amount paid
   5. Submits payment

   Admin later verifies the payment.
========================================================= */

router.post(
  "/student/:studentId/submit",
  protect,
  async (req, res) => {

    try {

const {
        transactionReference,
        amount,
        paymentScreenshot,
        paymentMethod,
        studentUpiId,
      } = req.body;

      // Safe development diagnostic - logs amount structure without secrets
      if (process.env.NODE_ENV === "development") {
        console.debug("Payment submission received:", {
          hasAmount: amount !== undefined,
          amountValue: amount,
          amountType: typeof amount,
          paymentMethod,
          hasStudentUpiId: !!studentUpiId,
        });
      }

      const studentId = getAuthenticatedStudentId(req);

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }


      /* -----------------------------------------------------
         VALIDATE TRANSACTION REFERENCE
       ----------------------------------------------------- */

      if (
        !transactionReference ||
        !transactionReference.trim()
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required",
        });
      }


      /* -----------------------------------------------------
         VALIDATE PAYMENT METHOD AND UPI ID
      ----------------------------------------------------- */

      const resolvedPaymentMethod = paymentMethod === "UPI_ID" ? "UPI_ID" : "QR";

      if (resolvedPaymentMethod === "UPI_ID") {
        if (!studentUpiId || !studentUpiId.trim()) {
          return res.status(400).json({
            success: false,
            message: "UPI ID is required for UPI ID payment method",
          });
        }

        // Basic UPI ID format validation (VPA format)
        const upiIdRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
        if (!upiIdRegex.test(studentUpiId.trim())) {
          return res.status(400).json({
            success: false,
            message: "Invalid UPI ID format. Expected format: username@provider (e.g., user@upi, 9876543210@bank)",
          });
        }
      }


      /* -----------------------------------------------------
         AMOUNT (OPTIONAL)

         The QR-based payment flow does not send an amount:
         the student pays the exact monthly fee shown on screen.
         If a client does send an amount it is kept (partial
         payment) and validated against the outstanding balance
         below.
       ----------------------------------------------------- */

      const requestedAmount =
        amount === undefined ||
        amount === null ||
        amount === ""
          ? null
          : Number(amount);

      if (
        requestedAmount !== null &&
        (
          !Number.isFinite(requestedAmount) ||
          requestedAmount <= 0
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Valid payment amount is required",
        });
      }


      /* -----------------------------------------------------
         CURRENT MONTH
      ----------------------------------------------------- */

      const paymentMonth =
        getPaymentMonth();

      const academicYear =
        getAcademicYear();


      /* -----------------------------------------------------
          FIND STUDENT (authenticated)
       ----------------------------------------------------- */

      const student =
        await Student.findById(
          studentId
        );


      if (!student) {

        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }


      /* -----------------------------------------------------
         ONLY APPROVED STUDENTS CAN SUBMIT
      ----------------------------------------------------- */

      if (
        student.approvalStatus !== "Approved"
      ) {

        return res.status(403).json({
          success: false,
          message:
            "Student account is not approved",
        });
      }


      /* -----------------------------------------------------
         NORMALIZE CLASS
      ----------------------------------------------------- */

      const className =
        normalizeClass(
          student.class
        );


      if (!className) {

        return res.status(400).json({
          success: false,
          message:
            "Student class is not configured",
        });
      }


      /* -----------------------------------------------------
         FIND CURRENT FEE
      ----------------------------------------------------- */

      const fee =
        await FeeStructure.findOne({
          academicYear,
          className,
          isActive: true,
        });


      if (!fee) {

        return res.status(404).json({
          success: false,
          message:
            `Fee structure not configured for Class ${className}`,
        });
      }


      /* -----------------------------------------------------
         FIND CURRENT PAYMENT
      ----------------------------------------------------- */

      let payment =
        await StudentPayment.findOne({
          student: student._id,
          academicYear,
          paymentMonth,
        });


/* -----------------------------------------------------
          CREATE PAYMENT IF NECESSARY
       ----------------------------------------------------- */

      if (!payment) {

        payment =
          await StudentPayment.create({
            student: student._id,
            className,
            academicYear,
            paymentMonth,
            monthlyFee: fee.monthlyFee,
            amountPaid: 0,
            status: "Pending",
            paymentMethod: resolvedPaymentMethod,
            studentUpiId: resolvedPaymentMethod === "UPI_ID" ? studentUpiId.trim() : "",
          });

      }


/* -----------------------------------------------------
         CALCULATE OUTSTANDING BALANCE
       ----------------------------------------------------- */

      const verifiedTotal = payment.amountPaid || 0;
      const outstandingBalance = payment.monthlyFee - verifiedTotal;

      if (outstandingBalance <= 0) {
        return res.status(400).json({
          success: false,
          message: "This month's fee is already fully paid",
        });
      }


      /* -----------------------------------------------------
          RESOLVE SUBMITTED AMOUNT

          When no amount is supplied the student is paying the
          full outstanding balance (the exact monthly fee shown
          on the payment page). The amount always comes from the
          backend fee, never from the client.
       ----------------------------------------------------- */

      const submittedAmount =
        requestedAmount === null
          ? outstandingBalance
          : requestedAmount;

      // Safe development diagnostic
      if (process.env.NODE_ENV === "development") {
        console.debug("Submitted amount resolved:", {
          requestedAmount,
          outstandingBalance,
          submittedAmount,
        });
      }

      if (submittedAmount > outstandingBalance) {
        return res.status(400).json({
          success: false,
          message: `Submitted amount exceeds outstanding balance of ₹${outstandingBalance}`,
        });
      }


      /* -----------------------------------------------------
         CHECK FOR DUPLICATE TRANSACTION REFERENCE
      ----------------------------------------------------- */

      const normalizedRef = transactionReference.trim();

      const isActiveDuplicate = payment.transactions.some(
        (txn) =>
          txn.transactionReference === normalizedRef &&
          txn.status !== "Rejected"
      );

      if (isActiveDuplicate) {
        return res.status(400).json({
          success: false,
          message: "This transaction reference has already been submitted",
        });
      }


      /* -----------------------------------------------------
         REJECTED TRANSACTION RESUBMISSION

         Allow resubmission for rejected transactions by clearing
         the rejection trail. Other transactions remain unchanged.
      ----------------------------------------------------- */

      const rejectedTxnIndex = payment.transactions.findIndex(
        (txn) =>
          txn.transactionReference === normalizedRef &&
          txn.status === "Rejected"
      );

      if (rejectedTxnIndex >= 0) {
        payment.transactions[rejectedTxnIndex].rejectionReason = "";
        payment.transactions[rejectedTxnIndex].verifiedBy = null;
        payment.transactions[rejectedTxnIndex].verifiedAt = null;
        payment.transactions[rejectedTxnIndex].status = "Submitted";
        payment.transactions[rejectedTxnIndex].amount = submittedAmount;
        payment.transactions[rejectedTxnIndex].submittedAt = new Date();
        payment.transactions[rejectedTxnIndex].method = resolvedPaymentMethod;
      } else {
        /* -----------------------------------------------------
           CREATE NEW TRANSACTION
        ----------------------------------------------------- */

        payment.transactions.push({
          transactionReference: normalizedRef,
          amount: submittedAmount,
          status: "Submitted",
          paymentScreenshot: paymentScreenshot || "",
          submittedAt: new Date(),
          method: resolvedPaymentMethod,
        });
      }


      /* -----------------------------------------------------
          SYNC CURRENT FEE
        ----------------------------------------------------- */

      payment.monthlyFee = fee.monthlyFee;
      payment.className = className;

      // Ensure paymentMethod and studentUpiId are set for existing records
      if (!payment.paymentMethod) {
        payment.paymentMethod = resolvedPaymentMethod;
      }
      if (resolvedPaymentMethod === "UPI_ID" && !payment.studentUpiId) {
        payment.studentUpiId = studentUpiId.trim();
      }


      /* -----------------------------------------------------
          SAVE SUBMITTED AMOUNT AND UTR

          submittedAmount = the actual amount the student paid.
          transactionReference = the student's UTR. Both are kept
          at the top level so the admin API and dashboard can read
          them without digging through the transactions array.
          amountPaid is NOT changed here; it only increases when an
          admin verifies the transaction.
       ----------------------------------------------------- */

      payment.submittedAmount = submittedAmount;
      payment.transactionReference = transactionReference.trim();

      // Safe development diagnostic
      if (process.env.NODE_ENV === "development") {
        console.debug("Payment before save:", {
          submittedAmount: payment.submittedAmount,
          transactionReference: payment.transactionReference,
          status: payment.status,
          monthlyFee: payment.monthlyFee,
          amountPaid: payment.amountPaid,
        });
      }


      /* -----------------------------------------------------
         UPDATE PAYMENT STATUS

         If any transaction is Submitted, overall status is Submitted.
         If all transactions are Verified, amountPaid >= monthlyFee,
         AND funds have been verified by admin, status is Paid.
       ----------------------------------------------------- */

      const hasSubmitted = payment.transactions.some(
        (txn) => txn.status === "Submitted"
      );

      const allVerified =
        payment.transactions.length > 0 &&
        payment.transactions.every((txn) => txn.status === "Verified");

      // Require fundsVerified before transitioning to Paid
      if (allVerified && payment.amountPaid >= payment.monthlyFee && payment.fundsVerified) {
        payment.status = "Paid";
      } else if (hasSubmitted) {
        payment.status = "Submitted";
      }


      /* -----------------------------------------------------
         SUBMISSION DATE (for the latest transaction)
       ----------------------------------------------------- */

      payment.submittedAt = new Date();


      /* -----------------------------------------------------
         SAVE
       ----------------------------------------------------- */

      await payment.save();


/* -----------------------------------------------------
           SEND EMAIL NOTIFICATIONS

           Send student acknowledgement and admin notification
           after successful payment submission.
           Email failures are logged but do not affect the payment.
        ----------------------------------------------------- */

      // Get the latest transaction for email
      const latestTxn = payment.transactions[payment.transactions.length - 1];

      const studentName =
        `${student.firstName || ""} ${student.lastName || ""}`.trim();

      const submissionDate = latestTxn.submittedAt
        ? latestTxn.submittedAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          });

      const paymentMethodDisplay = latestTxn.method === "UPI_ID" ? "UPI ID" : "QR Code";
      const upiIdDisplay = latestTxn.method === "UPI_ID" && payment.studentUpiId
        ? payment.studentUpiId
        : "N/A";

      // Student acknowledgement email
      try {
        await transporter.sendMail({
          from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: "CEITCS Course Fee Payment - Submission Received",
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
                CEITCS Course Fee Payment - Submission Received
              </p>

              <p>Dear ${studentName},</p>

              <p>
                Thank you for submitting your course fee payment. We have received
                your payment proof and it is now pending verification.
              </p>

              <div style="
                background-color: #f0f4ff;
                border-left: 4px solid #2f4b8f;
                padding: 15px 18px;
                margin: 20px 0;
              ">
                <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${className}</p>
                <p style="margin: 5px 0;"><strong>Monthly Fee:</strong> ₹${payment.monthlyFee}</p>
                <p style="margin: 5px 0;"><strong>Verified Amount Paid:</strong> ₹${payment.amountPaid || 0}</p>
                <p style="margin: 5px 0;"><strong>Outstanding Balance:</strong> ₹${outstandingBalance}</p>
                <p style="margin: 5px 0;"><strong>Submitted Amount:</strong> ₹${latestTxn.amount}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethodDisplay}</p>
                ${latestTxn.method === "UPI_ID" ? `<p style="margin: 5px 0;"><strong>UPI ID:</strong> ${upiIdDisplay}</p>` : ""}
                <p style="margin: 5px 0;"><strong>Payment Reference (UTR):</strong> ${latestTxn.transactionReference}</p>
                <p style="margin: 5px 0;"><strong>Submission Date:</strong> ${submissionDate}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #f0a500;">Pending Verification</span></p>
              </div>

              <p>
                <strong>Important:</strong> Your payment is not yet approved. Our admin team
                will verify the payment screenshot and transaction reference. Once verified,
                your payment status will be updated and a receipt will be generated.
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
          "📧 Student payment submission email sent to:",
          student.email
        );
      } catch (emailError) {
        console.error(
          "Failed to send student payment submission email:",
          emailError
        );
      }

      // Admin notification email
      const adminEmail = process.env.ADMIN_EMAIL;

      if (adminEmail) {
        try {
          await transporter.sendMail({
            from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: "CEITCS Course Fee Payment - Verification Required",
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
                  CEITCS Course Fee Payment - Verification Required
                </p>

                <p>
                  A student has submitted a course fee payment that requires
                  your verification.
                </p>

                <div style="
                  background-color: #fff8e6;
                  border-left: 4px solid #f0a500;
                  padding: 15px 18px;
                  margin: 20px 0;
                ">
                  <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                  <p style="margin: 5px 0;"><strong>Student Email:</strong> ${student.email}</p>
                  <p style="margin: 5px 0;"><strong>Student ID:</strong> ${student._id}</p>
                  <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${className}</p>
                  <p style="margin: 5px 0;"><strong>Payment ID:</strong> ${payment._id}</p>
                  <p style="margin: 5px 0;"><strong>Monthly Fee:</strong> ₹${payment.monthlyFee}</p>
                  <p style="margin: 5px 0;"><strong>Verified Amount Paid:</strong> ₹${payment.amountPaid || 0}</p>
                  <p style="margin: 5px 0;"><strong>Outstanding Balance:</strong> ₹${outstandingBalance}</p>
                  <p style="margin: 5px 0;"><strong>Submitted Amount:</strong> ₹${latestTxn.amount}</p>
                  <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethodDisplay}</p>
                  ${latestTxn.method === "UPI_ID" ? `<p style="margin: 5px 0;"><strong>UPI ID:</strong> ${upiIdDisplay}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>Payment Reference (UTR):</strong> ${latestTxn.transactionReference}</p>
                  <p style="margin: 5px 0;"><strong>Submission Date:</strong> ${submissionDate}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #f0a500;">Pending Verification</span></p>
                </div>

                <p>
                  Please review the payment screenshot and transaction reference
                  in the admin payment management page.
                </p>

                <p style="text-align: center; margin: 30px 0;">
                  <a
                    href="${process.env.FRONTEND_URL || "https://online-tuition-1wvb.vercel.app"}/admin/payments"
                    style="
                      display: inline-block;
                      background-color: #2f4b8f;
                      color: #ffffff;
                      text-decoration: none;
                      padding: 12px 24px;
                      border-radius: 6px;
                      font-weight: bold;
                      font-size: 14px;
                    "
                  >
                    View Payment Management
                  </a>
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
          });

          console.log(
            "📧 Admin payment verification email sent to:",
            adminEmail
          );
        } catch (emailError) {
          console.error(
            "Failed to send admin payment verification email:",
            emailError
          );
        }
      }

      /* -----------------------------------------------------
          COMPANY NOTIFICATION EMAIL

          The company inbox must be notified of every student
          payment submission. The amount shown is the amount the
          student reported paying (latest transaction), which is
          still UNVERIFIED at this point. It is never substituted
          with the tuition fee.
       ----------------------------------------------------- */

      const companyEmail = process.env.COMPANY_EMAIL;

      if (companyEmail) {
        // The submitted amount comes from the backend-resolved
        // latest transaction, a trusted source inside this
        // request. It is labelled as unverified because admin
        // verification has not happened yet.
        const submittedAmount = latestTxn?.amount;
        const submittedAmountDisplay =
          submittedAmount !== undefined && submittedAmount !== null
            ? `₹${Number(submittedAmount).toLocaleString("en-IN")}`
            : "Not recorded";

        try {
          await transporter.sendMail({
            from: `"CeiT Academy" <${process.env.EMAIL_USER}>`,
            to: companyEmail,
            subject: `Payment Submitted - Awaiting Verification`,
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
                  Payment Submitted - Awaiting Verification
                </p>

                <p>
                  A student has submitted a course fee payment. The
                  payment is <strong>not yet verified</strong> and is
                  awaiting admin approval.
                </p>

                <div style="
                  background-color: #fff8e6;
                  border-left: 4px solid #f0a500;
                  padding: 15px 18px;
                  margin: 20px 0;
                ">
                  <p style="margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
                  <p style="margin: 5px 0;"><strong>Student ID:</strong> ${student._id}</p>
                  <p style="margin: 5px 0;"><strong>Student Email:</strong> ${student.email}</p>
                  <p style="margin: 5px 0;"><strong>Course/Class:</strong> ${className}</p>
                  <p style="margin: 5px 0;"><strong>Applicable Tuition Fee:</strong> ₹${payment.monthlyFee}</p>
                  <p style="margin: 5px 0;"><strong>Amount Paid (Unverified):</strong> ${submittedAmountDisplay}</p>
                  <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethodDisplay}</p>
                  ${latestTxn.method === "UPI_ID" ? `<p style="margin: 5px 0;"><strong>UPI ID:</strong> ${upiIdDisplay}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>Transaction Reference / UTR:</strong> ${latestTxn.transactionReference}</p>
                  <p style="margin: 5px 0;"><strong>Submission Date:</strong> ${submissionDate}</p>
                  <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: #f0a500;">Submitted - Awaiting Admin Verification</span></p>
                  <p style="margin: 5px 0;"><strong>Payment Record ID:</strong> ${payment._id}</p>
                </div>

                <p>
                  <em>Note: The amount paid shown above is the amount
                  the student reported at submission time. It has
                  not been verified by an admin yet.</em>
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
          });

          console.log(
            "📧 Company payment submission notification sent to:",
            companyEmail,
            "| Payment ID:",
            payment._id
          );
        } catch (emailError) {
          console.error(
            "Failed to send company payment submission notification:",
            {
              paymentId: payment._id,
              recipient: companyEmail,
              error: emailError?.message || emailError,
            }
          );
        }
      }


      /* -----------------------------------------------------
          RETURN SUCCESS
       ----------------------------------------------------- */

      return res.json({
        success: true,

        message:
          "Payment submitted successfully. Admin will verify your payment.",

        payment,
      });

    } catch (error) {

      console.error(
        "QR payment submission error:",
        error
      );
return res.status(500).json({
        success: false,
        message:
          "Failed to load payment history",
      });
    }
  }
);

/* =========================================================
   STUDENT — DOWNLOAD RECEIPT FOR PAID PAYMENT
   Generates a PDF receipt for student's own approved payments.
   Idempotent: reuses existing bill number if already generated.
======================================================= */

/* =========================================================
   STUDENT — PAYMENT HISTORY
   Returns the authenticated student's own payment records,
   newest month first. The student ID is taken from the
   verified JWT, never from the URL parameter.
   ========================================================= */

router.get(
  "/student/:studentId/history",
  protect,
  async (req, res) => {

    try {

      const studentId = getAuthenticatedStudentId(req);

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const payments =
        await StudentPayment.find({
          student: studentId,
        }).sort({
          paymentMonth: -1,
          createdAt: -1,
        });


      return res.json({
        success: true,
        payments,
      });

    } catch (error) {

      console.error(
        "Payment history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load payment history",
      });
    }
  }
);

/* =========================================================
   STUDENT — DOWNLOAD RECEIPT FOR PAID PAYMENT
   Generates a PDF receipt for student's own approved payments.
   Idempotent: reuses existing bill number if already generated.
   ======================================================= */

router.get(
  "/student/:studentId/payment/:paymentId/receipt",
  protect,
  async (req, res) => {
    try {
      const studentId = getAuthenticatedStudentId(req);
      const { paymentId } = req.params;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const payment =
        await StudentPayment.findOne({
          _id: paymentId,
          student: studentId
        }).populate("student", "firstName lastName email class");

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

      // Reuse the payment's existing bill number. A Paid payment must
      // already have a bill number allocated during the canonical approval
      // process. If missing, it indicates a data integrity issue.
      const billNumber = payment.billNumber;
      if (!billNumber) {
        return res.status(400).json({
          success: false,
          message: "Payment is marked Paid but has no bill number. Cannot generate receipt."
        });
      }

      // Set receipt generation timestamp if not already set
      if (!payment.receiptGeneratedAt) {
        payment.receiptGeneratedAt = new Date();
        await payment.save();
      }

      // Generate PDF receipt using the shared official receipt format
      const pdfBuffer = await generateReceiptPdf(payment, billNumber);

      // Send PDF as response
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${billNumber}.pdf"`,
        "Content-Length": pdfBuffer.length,
      });
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Student download receipt error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate receipt",
        error: error.message
      });
    }
  }
);

/* =========================================================
   EXPORT ROUTER
======================================================= */

module.exports = router;