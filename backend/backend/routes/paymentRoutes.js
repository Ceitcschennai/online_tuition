const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Student = require("../models/Student");
const FeeStructure = require("../models/FeeStructure");
const StudentPayment = require("../models/StudentPayment");

const router = express.Router();

/* =========================================================
   RAZORPAY
========================================================= */

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
========================================================= */

router.get(
  "/student/:studentId/current",
  async (req, res) => {
    try {
      /* -----------------------------------------------------
         FIND STUDENT
      ----------------------------------------------------- */

      const student = await Student.findById(
        req.params.studentId
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
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
          message: "Student class is not configured"
        });
      }

      /* -----------------------------------------------------
         CURRENT ACADEMIC YEAR
      ----------------------------------------------------- */

      const academicYear = getAcademicYear();

      /* -----------------------------------------------------
         CURRENT PAYMENT MONTH
      ----------------------------------------------------- */

      const paymentMonth = getPaymentMonth();

      /* -----------------------------------------------------
         GET CURRENT FEE STRUCTURE

         Always use the latest active fee configured
         by Admin.
      ----------------------------------------------------- */

      const fee = await FeeStructure.findOne({
        academicYear,
        className,
        isActive: true
      });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            `Fee structure not configured for Class ${className}`
        });
      }

      /* -----------------------------------------------------
         FIND CURRENT MONTH PAYMENT
      ----------------------------------------------------- */

      let payment = await StudentPayment.findOne({
        student: student._id,
        academicYear,
        paymentMonth
      });

      /* -----------------------------------------------------
         CREATE PAYMENT IF IT DOES NOT EXIST
      ----------------------------------------------------- */

      if (!payment) {
        payment = await StudentPayment.create({
          student: student._id,
          className,
          academicYear,
          paymentMonth,
          monthlyFee: fee.monthlyFee,
          amountPaid: 0,
          status: "Pending"
        });
      }

      /* -----------------------------------------------------
         SYNC CURRENT UNPAID PAYMENT WITH FEE STRUCTURE

         Example:

         Admin changes Class 9:
         ₹3,000 -> ₹2,000

         If the student's current payment is still unpaid,
         update the payment to ₹2,000.

         IMPORTANT:
         Paid historical payments are NEVER changed.
      ----------------------------------------------------- */

      if (
        payment.status !== "Paid" &&
        (
          payment.monthlyFee !== fee.monthlyFee ||
          payment.className !== className
        )
      ) {
        payment.monthlyFee = fee.monthlyFee;
        payment.className = className;

        await payment.save();
      }

      /* -----------------------------------------------------
         RETURN CURRENT PAYMENT
      ----------------------------------------------------- */

      return res.json({
        success: true,

        student: {
          id: student._id,
          name:
            `${student.firstName || ""} ${student.lastName || ""}`.trim(),
          className
        },

        fee: {
          monthlyFee: fee.monthlyFee,
          academicYear,
          paymentMonth
        },

        payment
      });

    } catch (error) {
      console.error(
        "Current student fee error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load student fee"
      });
    }
  }
);

/* =========================================================
   CREATE RAZORPAY ORDER
   POST /api/payments/student/:studentId/create-order
========================================================= */

router.post(
  "/student/:studentId/create-order",
  async (req, res) => {
    try {
      /* -----------------------------------------------------
         FIND STUDENT
      ----------------------------------------------------- */

      const student = await Student.findById(
        req.params.studentId
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      /* -----------------------------------------------------
         ONLY APPROVED STUDENTS CAN PAY
      ----------------------------------------------------- */

      if (
        student.approvalStatus !== "Approved"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Student account is not approved"
        });
      }

      /* -----------------------------------------------------
         CLASS
      ----------------------------------------------------- */

      const className = normalizeClass(
        student.class
      );

      if (!className) {
        return res.status(400).json({
          success: false,
          message: "Student class is not configured"
        });
      }

      /* -----------------------------------------------------
         CURRENT ACADEMIC YEAR
      ----------------------------------------------------- */

      const academicYear = getAcademicYear();

      /* -----------------------------------------------------
         CURRENT PAYMENT MONTH
      ----------------------------------------------------- */

      const paymentMonth = getPaymentMonth();

      /* -----------------------------------------------------
         GET LATEST FEE STRUCTURE
      ----------------------------------------------------- */

      const fee = await FeeStructure.findOne({
        academicYear,
        className,
        isActive: true
      });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            `Fee structure not configured for Class ${className}`
        });
      }

      /* -----------------------------------------------------
         FIND CURRENT PAYMENT
      ----------------------------------------------------- */

      let payment = await StudentPayment.findOne({
        student: student._id,
        academicYear,
        paymentMonth
      });

      /* -----------------------------------------------------
         DO NOT ALLOW PAYMENT IF ALREADY PAID
      ----------------------------------------------------- */

      if (
        payment &&
        payment.status === "Paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This month's fee is already paid"
        });
      }

      /* -----------------------------------------------------
         CREATE PAYMENT IF NECESSARY
      ----------------------------------------------------- */

      if (!payment) {
        payment = await StudentPayment.create({
          student: student._id,
          className,
          academicYear,
          paymentMonth,
          monthlyFee: fee.monthlyFee,
          amountPaid: 0,
          status: "Pending"
        });
      }

      /* -----------------------------------------------------
         SYNC PAYMENT WITH LATEST FEE

         This protects against Admin changing the fee
         after the payment record was created.
      ----------------------------------------------------- */

      if (
        payment.status !== "Paid" &&
        (
          payment.monthlyFee !== fee.monthlyFee ||
          payment.className !== className
        )
      ) {
        payment.monthlyFee = fee.monthlyFee;
        payment.className = className;

        await payment.save();
      }

      /* -----------------------------------------------------
         CREATE RAZORPAY ORDER

         Always use the latest FeeStructure amount.
      ----------------------------------------------------- */

      const order = await razorpay.orders.create({
        amount: fee.monthlyFee * 100,
        currency: "INR",

        receipt:
          `student_${student._id}_${paymentMonth}`,

        notes: {
          studentId: String(student._id),
          paymentMonth,
          academicYear,
          className
        }
      });

      /* -----------------------------------------------------
         SAVE RAZORPAY ORDER ID
      ----------------------------------------------------- */

      payment.razorpayOrderId =
        order.id;

      payment.status = "Created";

      await payment.save();

      /* -----------------------------------------------------
         RETURN ORDER
      ----------------------------------------------------- */

      return res.json({
        success: true,

        // Public Razorpay key only
        key:
          process.env.RAZORPAY_KEY_ID,

        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency
        },

        student: {
          name:
            `${student.firstName || ""} ${student.lastName || ""}`.trim(),
          email: student.email,
          mobile: student.mobile
        }
      });

    } catch (error) {
      console.error(
        "Razorpay order error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create payment order"
      });
    }
  }
);

/* =========================================================
   VERIFY RAZORPAY PAYMENT
   POST /api/payments/student/:studentId/verify
========================================================= */

router.post(
  "/student/:studentId/verify",
  async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      /* -----------------------------------------------------
         VALIDATE RAZORPAY RESPONSE
      ----------------------------------------------------- */

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Incomplete payment response"
        });
      }

      /* -----------------------------------------------------
         FIND PAYMENT
      ----------------------------------------------------- */

      const payment =
        await StudentPayment.findOne({
          student:
            req.params.studentId,

          razorpayOrderId:
            razorpay_order_id
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment record not found"
        });
      }

      /* -----------------------------------------------------
         GENERATE SIGNATURE
      ----------------------------------------------------- */

      const generatedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env.RAZORPAY_KEY_SECRET
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest("hex");

      /* -----------------------------------------------------
         VERIFY SIGNATURE
      ----------------------------------------------------- */

      if (
        generatedSignature !==
        razorpay_signature
      ) {
        payment.status = "Failed";

        await payment.save();

        return res.status(400).json({
          success: false,
          message:
            "Payment signature verification failed"
        });
      }

      /* -----------------------------------------------------
         PAYMENT SUCCESSFUL
      ----------------------------------------------------- */

      payment.razorpayPaymentId =
        razorpay_payment_id;

      payment.razorpaySignature =
        razorpay_signature;

      payment.amountPaid =
        payment.monthlyFee;

      payment.status = "Paid";

      payment.paidAt =
        new Date();

      await payment.save();

      /* -----------------------------------------------------
         RETURN SUCCESS
      ----------------------------------------------------- */

      return res.json({
        success: true,

        message:
          "Payment verified successfully",

        payment
      });

    } catch (error) {
      console.error(
        "Payment verification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to verify payment"
      });
    }
  }
);

/* =========================================================
   SUBMIT QR PAYMENT
   POST /api/payments/student/:studentId/submit
========================================================= */

router.post(
  "/student/:studentId/submit",
  async (req, res) => {
    try {
      const {
        transactionReference,
        paymentScreenshot
      } = req.body;

      /* -----------------------------------------------------
         VALIDATE TRANSACTION REFERENCE
      ----------------------------------------------------- */

      if (!transactionReference) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required"
        });
      }

      /* -----------------------------------------------------
         VALIDATE SCREENSHOT
      ----------------------------------------------------- */

      if (!paymentScreenshot) {
        return res.status(400).json({
          success: false,
          message:
            "Payment screenshot is required"
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
         FIND STUDENT
      ----------------------------------------------------- */

      const student = await Student.findById(
        req.params.studentId
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      /* -----------------------------------------------------
         FIND CURRENT FEE
      ----------------------------------------------------- */

      const className = normalizeClass(
        student.class
      );

      const fee = await FeeStructure.findOne({
        academicYear,
        className,
        isActive: true
      });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            `Fee structure not configured for Class ${className}`
        });
      }

      /* -----------------------------------------------------
         FIND CURRENT PAYMENT
      ----------------------------------------------------- */

      let payment =
        await StudentPayment.findOne({
          student: req.params.studentId,
          academicYear,
          paymentMonth
        });

      if (!payment) {
        payment = await StudentPayment.create({
          student: student._id,
          className,
          academicYear,
          paymentMonth,
          monthlyFee: fee.monthlyFee,
          amountPaid: 0,
          status: "Pending"
        });
      }

      /* -----------------------------------------------------
         DO NOT ALLOW DUPLICATE PAYMENT
      ----------------------------------------------------- */

      if (payment.status === "Paid") {
        return res.status(400).json({
          success: false,
          message:
            "This month's fee is already paid"
        });
      }

      /* -----------------------------------------------------
         SYNC CURRENT FEE

         If Admin changed the fee before the student
         submits the QR payment, use the latest amount.
      ----------------------------------------------------- */

      if (
        payment.monthlyFee !== fee.monthlyFee ||
        payment.className !== className
      ) {
        payment.monthlyFee = fee.monthlyFee;
        payment.className = className;
      }

      /* -----------------------------------------------------
         SAVE QR PAYMENT DETAILS
      ----------------------------------------------------- */

      payment.transactionReference =
        transactionReference.trim();

      payment.paymentScreenshot =
        paymentScreenshot;

      payment.submittedAt =
        new Date();

      payment.status =
        "Submitted";

      await payment.save();

      /* -----------------------------------------------------
         RETURN SUCCESS
      ----------------------------------------------------- */

      return res.json({
        success: true,

        message:
          "Payment submitted successfully. Admin will verify your payment.",

        payment
      });

    } catch (error) {
      console.error(
        "QR payment submission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit payment"
      });
    }
  }
);

/* =========================================================
   STUDENT PAYMENT HISTORY
   GET /api/payments/student/:studentId/history
========================================================= */

router.get(
  "/student/:studentId/history",
  async (req, res) => {
    try {
      const payments =
        await StudentPayment.find({
          student:
            req.params.studentId
        })
          .sort({
            paymentMonth: -1
          });

      return res.json({
        success: true,
        payments
      });

    } catch (error) {
      console.error(
        "Payment history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load payment history"
      });
    }
  }
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;