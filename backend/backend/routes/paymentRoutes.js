const express = require("express");

const Student = require("../models/Student");
const FeeStructure = require("../models/FeeStructure");
const StudentPayment = require("../models/StudentPayment");

const router = express.Router();


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

        payment,
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
   SUBMIT QR PAYMENT

   POST /api/payments/student/:studentId/submit

   Student:
   1. Scans institute QR
   2. Makes payment
   3. Enters UTR / transaction reference
   4. Uploads payment screenshot
   5. Submits payment

   Admin later verifies the payment.
========================================================= */

router.post(
  "/student/:studentId/submit",
  async (req, res) => {

    try {

      const {
        transactionReference,
        paymentScreenshot,
      } = req.body;


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
         VALIDATE SCREENSHOT
      ----------------------------------------------------- */

      if (!paymentScreenshot) {

        return res.status(400).json({
          success: false,
          message:
            "Payment screenshot is required",
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

      const student =
        await Student.findById(
          req.params.studentId
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
          });

      }


      /* -----------------------------------------------------
         DO NOT ALLOW DUPLICATE PAYMENT
      ----------------------------------------------------- */

      if (
        payment.status === "Paid"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "This month's fee is already paid",
        });
      }


      /* -----------------------------------------------------
         DO NOT CREATE MULTIPLE SUBMISSIONS

         If already Submitted, tell student that
         admin verification is pending.
      ----------------------------------------------------- */

      if (
        payment.status === "Submitted"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Payment has already been submitted and is awaiting admin verification",
        });
      }


      /* -----------------------------------------------------
         SYNC CURRENT FEE

         If Admin changed the fee before submission,
         use the latest fee.
      ----------------------------------------------------- */

      payment.monthlyFee =
        fee.monthlyFee;

      payment.className =
        className;


      /* -----------------------------------------------------
         SAVE TRANSACTION REFERENCE
      ----------------------------------------------------- */

      payment.transactionReference =
        transactionReference.trim();


      /* -----------------------------------------------------
         SAVE PAYMENT SCREENSHOT
      ----------------------------------------------------- */

      payment.paymentScreenshot =
        paymentScreenshot;


      /* -----------------------------------------------------
         SUBMISSION DATE
      ----------------------------------------------------- */

      payment.submittedAt =
        new Date();


      /* -----------------------------------------------------
         PAYMENT STATUS

         Important:
         Student submission is NOT automatically Paid.

         Admin must verify it first.
      ----------------------------------------------------- */

      payment.status =
        "Submitted";


      /* -----------------------------------------------------
         AMOUNT PAID

         Keep amountPaid as 0 until Admin verifies
         the payment.
      ----------------------------------------------------- */

      payment.amountPaid = 0;


      /* -----------------------------------------------------
         SAVE
      ----------------------------------------------------- */

      await payment.save();


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
          "Failed to submit payment",
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
            req.params.studentId,
        }).sort({
          paymentMonth: -1,
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
   EXPORT ROUTER
========================================================= */

module.exports = router;