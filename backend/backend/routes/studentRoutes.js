const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const router = express.Router();

const Student = require("../models/Student");
const upload = require("../middleware/upload");
const transporter = require("../config/email");
const Activity = require("../models/Activity");

const {
  ActionAgent,
  AnalyticsAgent,
  KnowledgeAgent,
} = require("../agents/crewAgents");

const mongoose = require("mongoose");
const db = mongoose.connection;

/* =================================================
   COMPANY
================================================= */

const COMPANY_NAME = "CeiT Academy - Online Tuition";

/* =================================================
   HELPER — LOCAL VALIDATION
================================================= */

function normalizeSalutation(val) {
  if (!val) return null;

  const map = {
    mr: "Mr.",
    ms: "Ms.",
    miss: "Miss.",
    mrs: "Mrs.",
    dr: "Dr.",
  };

  const clean = val
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();

  return map[clean] || val;
}

function validateStudent(body, hasFile) {
  const errors = {};
  const normalized = { ...body };

  // =================================================
  // SALUTATION
  // =================================================

  const normSal = normalizeSalutation(
    body.salutation
  );

  const validSal = [
    "Mr.",
    "Miss.",
    "Mrs.",
    "Dr.",
    "Ms.",
  ];

  if (
    !normSal ||
    !validSal.includes(normSal)
  ) {
    errors.salutation =
      "Must be Mr. / Miss. / Mrs. / Dr.";
  } else {
    normalized.salutation = normSal;
  }

  // =================================================
  // FIRST NAME
  // =================================================

  const fn = (
    body.firstName || ""
  ).trim();

  if (
    fn.length < 2 ||
    !/^[a-zA-Z]+$/.test(fn)
  ) {
    errors.firstName =
      "Min 2 letters, letters only";
  } else {
    normalized.firstName = fn;
  }

  // =================================================
  // LAST NAME
  // =================================================

  const ln = (
    body.lastName || ""
  ).trim();

  if (
    ln.length < 1 ||
    !/^[a-zA-Z]+$/.test(ln)
  ) {
    errors.lastName =
      "Letters only";
  } else {
    normalized.lastName = ln;
  }

  // =================================================
  // MOBILE
  // =================================================

  const mob = (
    body.mobile || ""
  )
    .toString()
    .trim();

  if (!/^[6-9]\d{9}$/.test(mob)) {
    errors.mobile =
      "Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
  } else {
    normalized.mobile = mob;
  }

  // =================================================
  // EMAIL
  // =================================================

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const em = (
    body.email || ""
  )
    .trim()
    .toLowerCase();

  if (!emailRegex.test(em)) {
    errors.email =
      "Invalid email format";
  } else {
    normalized.email = em;
  }

  // =================================================
  // PASSWORD
  // =================================================

  const pw = body.password || "";

  if (pw.length < 8) {
    errors.password =
      "Password must be at least 8 characters";
  }

  // =================================================
  // TIMEZONE
  // =================================================

  if (
    !body.timezone ||
    body.timezone.trim() === ""
  ) {
    errors.timezone =
      "Timezone is required";
  } else {
    normalized.timezone =
      body.timezone.trim();
  }

  // =================================================
  // SYLLABUS
  // =================================================

  if (
    !body.syllabus ||
    body.syllabus.trim() === ""
  ) {
    errors.syllabus =
      "Syllabus is required";
  } else {
    normalized.syllabus =
      body.syllabus.trim();
  }

  // =================================================
  // CLASS
  // =================================================

  const classVal = (
    body.class ||
    body.studentClass ||
    ""
  )
    .toString()
    .trim();

  if (!classVal) {
    errors.class =
      "Class is required";
  } else {
    normalized.class = classVal;
  }

  // =================================================
  // EMIS NUMBER
  // =================================================

  const emis = (
    body.emisNumber || ""
  )
    .toString()
    .trim();

  if (emis === "") {
    // EMIS is optional
    normalized.emisNumber = "";
  } else if (emis.length < 4) {
    errors.emisNumber =
      "EMIS Number must contain at least 4 characters";
  } else {
    normalized.emisNumber = emis;
  }

  // =================================================
  // FILE
  // =================================================

  if (!hasFile) {
    errors._file =
      "ID Proof is required";
  }

  const valid =
    Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    normalized,
    summary: valid
      ? "All valid"
      : `Failed: ${Object.keys(
          errors
        ).join(", ")}`,
  };
}

/* =================================================
   STUDENT REGISTER
================================================= */

router.post(
  "/register",
  upload.single("proof"),
  async (req, res) => {

    const proof = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    try {

      // =================================================
      // VALIDATION
      // =================================================

      const validation = validateStudent(
        req.body,
        !!req.file
      );

      if (!validation.valid) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.errors,
          summary: validation.summary,
        });
      }

      const {
        salutation,
        firstName,
        lastName,
        mobile,
        timezone,
        email,
        password,
        class: studentClass,
        syllabus,
        emisNumber,
      } = validation.normalized;

      const { group } = req.body;

      // =================================================
      // CHECK DUPLICATE EMAIL
      // =================================================

      const existingStudent =
        await Student.findOne({
          email,
        });

      if (existingStudent) {
        return res.status(409).json({
          message: "Email already registered",
        });
      }

      // =================================================
      // HASH PASSWORD
      // =================================================

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // =================================================
      // CREATE STUDENT
      // =================================================

      const newStudent =
        new Student({
          salutation,
          firstName,
          lastName,
          mobile,
          timezone,
          email,
          password: hashedPassword,
          class: studentClass,
          group,
          syllabus,
          emisNumber,
          proof,
          approvalStatus: "Pending",
          isActive: false,
        });

      await newStudent.save();

      // =================================================
      // CUSTOMER RECORD
      // =================================================

      const customerId =
        newStudent._id.toString();

      await db.db
        .collection("customers")
        .insertOne({
          customerId,
          name: `${firstName} ${lastName}`,
          email,
          role: "student",
          createdAt: new Date(),
        });

      // =================================================
      // ACTION AGENT
      // =================================================

      await ActionAgent.createTask({
        customerId,
        issue:
          "New student registration — pending admin approval",
        status: "open",
      });

      // =================================================
      // ANALYTICS
      // =================================================

      await AnalyticsAgent.logInteraction({
        customerId,
        message:
          `Student registered: ${firstName} ${lastName}`,
        type: "registration",
      });

      // =================================================
      // ACTIVITY LOG
      // =================================================

      await Activity.create({
        type: "student",
        message:
          `New student registered: ${firstName} ${lastName}`,
        time: new Date(),
      });

      // =================================================
      // EMAIL ADMIN
      // =================================================

      try {

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL,

          subject:
            "New Student Registration Alert",

          html: `
            <div style="
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            ">

              <h2>${COMPANY_NAME}</h2>

              <h3>New Student Registration</h3>

              <p>
                <b>Name:</b>
                ${firstName} ${lastName}
              </p>

              <p>
                <b>Email:</b>
                ${email}
              </p>

              <p>
                <b>Class:</b>
                ${studentClass}
              </p>

              <p>
                <b>Syllabus:</b>
                ${syllabus}
              </p>

              <p>
                <b>Status:</b>
                Pending Admin Approval
              </p>

              <p>
                Please review the student's registration
                from the admin dashboard.
              </p>

              <br />

              <p>
                Regards,<br />
                <strong>Admin</strong><br />
                <strong>${COMPANY_NAME}</strong>
              </p>

            </div>
          `,
        });

        console.log(
          "📧 New student registration email sent to admin:",
          process.env.ADMIN_EMAIL
        );

      } catch (emailError) {

        console.error(
          "Admin registration email failed:",
          emailError.message
        );
      }

      // =================================================
      // EMAIL STUDENT
      // REGISTRATION RECEIVED
      // =================================================

      let registrationEmailSent = false;

      try {

        await transporter.sendMail({

          from: process.env.EMAIL_USER,

          to: email,

          subject:
            "CeiT Academy - Online Tuition | Registration Received",
html: `
  <div
    style="
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f4f6f8;
      padding: 30px 15px;
    "
  >

    <div
      style="
        max-width: 650px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 10px;
        padding: 35px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      "
    >

      <h2
        style="
          color: #2c3e50;
          margin-bottom: 5px;
        "
      >
        ${COMPANY_NAME}
      </h2>

      <p
        style="
          color: #777;
          margin-top: 0;
          font-size: 14px;
        "
      >
        Student Registration Confirmation
      </p>

      <hr
        style="
          border: none;
          border-top: 1px solid #e5e5e5;
          margin: 20px 0;
        "
      >

      <p
        style="
          font-size: 16px;
          color: #333;
        "
      >
        Dear ${firstName},
      </p>

      <p
        style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        "
      >
        Thank you for registering with
        <strong>${COMPANY_NAME}</strong>.
      </p>

      <p
        style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        "
      >
        We have successfully received your
        registration details and submitted documents.
      </p>

      <div
        style="
          background-color: #fff8e6;
          border-left: 5px solid #f0ad4e;
          padding: 15px 18px;
          margin: 25px 0;
        "
      >

        <p
          style="
            margin: 0;
            color: #8a6d3b;
            font-size: 17px;
            font-weight: bold;
          "
        >
          Profile Status: PENDING ADMIN APPROVAL
        </p>

      </div>

      <p
        style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        "
      >
        Your student profile is currently waiting
        for admin approval.
        Our admin team will review your registration
        details and the documents submitted by you.
      </p>

      <p
        style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        "
      >
        Once your profile has been reviewed and
        approved, you will receive another email
        confirming that your student account is
        ready to use.
      </p>

      <p
        style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        "
      >
        Please wait for the approval confirmation
        email before attempting to log in.
      </p>

      <p
        style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        "
      >
        After receiving the approval email, you can
        log in to the
        <strong>${COMPANY_NAME}</strong>
        portal using your registered email address
        and password.
      </p>

      <hr
        style="
          border: none;
          border-top: 1px solid #e5e5e5;
          margin: 30px 0 20px;
        "
      >

      <p
        style="
          font-size: 14px;
          color: #777;
          line-height: 1.6;
          margin-bottom: 0;
        "
      >
        Thank you for choosing
        <strong>${COMPANY_NAME}</strong>.
      </p>

      <p
        style="
          font-size: 14px;
          color: #777;
          line-height: 1.6;
        "
      >
        Regards,<br />
        <strong>Admin</strong><br />
        <strong>${COMPANY_NAME}</strong>
      </p>

    </div>

  </div>
`,
  });
        registrationEmailSent = true;

        console.log(
          "📧 Registration confirmation email sent to student:",
          email
        );

      } catch (emailError) {

        console.error(
          "Student registration email failed:",
          emailError.message
        );
      }

      // =================================================
      // SEND NEW STUDENT REGISTRATION
      // EMAIL TO COMPANY
      // =================================================

      try {

        if (process.env.COMPANY_EMAIL) {

          console.log(
            "📧 SENDING STUDENT REGISTRATION EMAIL TO COMPANY:",
            process.env.COMPANY_EMAIL
          );

          const registrationDate =
            newStudent.createdAt
              ? new Date(
                  newStudent.createdAt
                ).toLocaleString("en-IN")
              : new Date().toLocaleString(
                  "en-IN"
                );

          await transporter.sendMail({
            from: `"CeiT Academy - Online Tuition" <${process.env.EMAIL_USER}>`,

            to: process.env.COMPANY_EMAIL,

            subject:
              "CeiT Academy - New Student Registration",

            html: `
              <div style="
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f6f8;
                padding: 30px 15px;
              ">

                <div style="
                  max-width: 650px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 10px;
                  padding: 35px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                ">

                  <h2 style="
                    color: #2c3e50;
                    margin-bottom: 5px;
                  ">
                    CeiT Academy - Online Tuition
                  </h2>

                  <p style="
                    color: #777;
                    margin-top: 0;
                    font-size: 14px;
                  ">
                    New Student Registration
                  </p>

                  <hr style="
                    border: none;
                    border-top: 1px solid #e5e5e5;
                    margin: 20px 0;
                  ">

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    A new student registration has been
                    submitted and is waiting for
                    administrator review.
                  </p>

                  <div style="
                    background-color: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 25px 0;
                  ">

                    <p style="margin: 8px 0;">
                      <strong>Student Name:</strong>
                      ${newStudent.firstName} ${newStudent.lastName}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>Student Email:</strong>
                      ${newStudent.email}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>Phone Number:</strong>
                      ${newStudent.mobile || "-"}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>Registration Date:</strong>
                      ${registrationDate}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>Status:</strong>
                      Pending Admin Approval
                    </p>

                  </div>

                  <p style="
                    font-size: 15px;
                    color: #555;
                    line-height: 1.6;
                  ">
                    Please review the student registration
                    details and the submitted document, then
                    approve or reject the registration.
                  </p>

                  <hr style="
                    border: none;
                    border-top: 1px solid #e5e5e5;
                    margin: 30px 0 20px;
                  ">

                  <p style="
                    font-size: 14px;
                    color: #555;
                    line-height: 1.6;
                  ">
                    Regards,<br>
                    <strong>
                      CeiT Academy - Online Tuition
                    </strong>
                  </p>

                  <p style="
                    font-size: 12px;
                    color: #999;
                    margin-top: 25px;
                  ">
                    This is an automated email from
                    CeiT Academy - Online Tuition.
                  </p>

                </div>
              </div>
            `,
          });

          console.log(
            "✅ STUDENT REGISTRATION EMAIL SENT TO COMPANY:",
            process.env.COMPANY_EMAIL
          );
        }

      } catch (emailError) {

        console.error(
          "❌ STUDENT REGISTRATION EMAIL TO COMPANY FAILED:",
          emailError.message
        );
      }

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(201).json({

        success: true,

        message:
          registrationEmailSent
            ? "Registration successful. A confirmation email has been sent. Please wait for admin approval."
            : "Registration successful. Please wait for admin approval.",

        registrationEmailSent,

        student: {

          id: newStudent._id,

          firstName:
            newStudent.firstName,

          lastName:
            newStudent.lastName,

          email:
            newStudent.email,

          class:
            newStudent.class,

          approvalStatus:
            newStudent.approvalStatus,

        },

      });

    } catch (err) {

      console.error(
        "Student Registration Error:",
        err
      );

      return res.status(500).json({

        success: false,

        message:
          err.message ||
          "Server error during student registration",

      });

    }
  }
);

/* =================================================
   SEARCH STUDENTS BY NAME
================================================= */

router.get(
  "/search",
  async (req, res) => {
    try {

      const { name } =
        req.query;

      if (
        !name ||
        !name.trim()
      ) {
        return res.status(400).json({
          message:
            "Search query is required",
        });
      }

      const regex =
        new RegExp(
          name.trim(),
          "i"
        );

      const students =
        await Student.find({
          $or: [
            {
              firstName: regex,
            },
            {
              lastName: regex,
            },
          ],

          approvalStatus:
            "Approved",
        })
          .select(
            "firstName lastName class email mobile"
          )
          .limit(10);

      res.json({
        success: true,
        students,
      });

    } catch (err) {

      console.error(
        "Student search error:",
        err
      );

      res.status(500).json({
        message:
          "Search failed",
      });
    }
  }
);

/* =================================================
   GET ALL APPROVED STUDENTS IN A CLASS

   Used by:
   - Take Attendance
   - Check Participant Attendance
================================================= */

router.get(
  "/by-class/:class",
  async (req, res) => {
    try {

      const {
        class: className,
      } = req.params;

      if (
        !className ||
        !className.trim()
      ) {
        return res.status(400).json({
          message:
            "Class is required",
        });
      }

      const regex =
        new RegExp(
          `^${className.trim()}$`,
          "i"
        );

      const students =
        await Student.find({
          class: regex,
          approvalStatus:
            "Approved",
        })
          .select(
            "firstName lastName class email mobile status"
          )
          .sort({
            firstName: 1,
            lastName: 1,
          });

      res.json({
        success: true,
        students,
      });

    } catch (err) {

      console.error(
        "Fetch students by class error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to fetch students for this class",
      });
    }
  }
);

/* =================================================
   ADMIN — GET ALL PENDING STUDENTS
================================================= */

router.get(
  "/admin/pending",
  async (req, res) => {
    try {

      const students =
        await Student.find({
          approvalStatus:
            "Pending",
        })
          .select("-password")
          .sort({
            createdAt: -1,
          });

      res.json({
        success: true,
        students,
      });

    } catch (err) {

      console.error(
        "Pending students error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to fetch students",
      });
    }
  }
);

/* =================================================
   ADMIN — APPROVE / REJECT STUDENT
================================================= */

router.put(
  "/admin/:id/approve",
  async (req, res) => {
    try {

      const {
        status,
        reason,
      } = req.body;

      // =================================================
      // VALIDATE STATUS
      // =================================================

      if (!["Approved", "Rejected", "Reject Document"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
        });
      }

      // =================================================
      // VALIDATE REJECTION REASON
      // =================================================

      if (
        status === "Rejected" &&
        !reason?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason is required",
        });
      }

      // =================================================
      // FIND STUDENT
      // =================================================

      const student =
        await Student.findById(
          req.params.id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      // =================================================
// UPDATE APPROVAL STATUS
// =================================================

if (status === "Approved") {

  student.approvalStatus = "Approved";
  student.isActive = true;
  student.activationRequested = false;

  student.documentReuploadToken = null;
  student.documentReuploadExpires = null;

} else if (status === "Reject Document") {

  student.approvalStatus = "Pending";
  student.isActive = false;
  student.activationRequested = false;

  student.documentReuploadToken =
    crypto.randomBytes(32).toString("hex");

  student.documentReuploadExpires =
    new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );
} else {

  student.approvalStatus = "Rejected";
  student.isActive = false;
  student.activationRequested = false;

  student.documentReuploadToken = null;
  student.documentReuploadExpires = null;

}

await student.save();

      // =================================================
      // ANALYTICS
      // =================================================

      try {

        await AnalyticsAgent.logInteraction({
          customerId:
            student._id.toString(),

          message:
            `Student ${student.firstName} ${student.lastName} was ${status}`,

          type:
            "approval",
        });

      } catch (analyticsError) {

        console.error(
          "Student approval analytics error:",
          analyticsError.message
        );
      }

      // =================================================
      // CLOSE OPEN TASKS
      // =================================================

      try {

        const tasks =
          await db.db
            .collection("tasks")
            .find({
              customerId:
                student._id.toString(),

              status:
                "open",
            })
            .toArray();

        for (
          const task of tasks
        ) {

          try {

            await ActionAgent.closeTask(
              task._id
            );

          } catch (taskError) {

            console.error(
              "Failed to close task:",
              taskError.message
            );

          }
        }

      } catch (taskError) {

        console.error(
          "Task processing error:",
          taskError.message
        );
      }

      // =================================================
      // EMAIL STUDENT
      // APPROVED / REJECTED
      // =================================================

      let emailSent = false;
      let emailErrorMessage = "";

      try {

        const reuploadLink =
  `${process.env.FRONTEND_URL}/login?reuploadToken=${student.documentReuploadToken}&role=student`;

        const emailSubject =
  status === "Approved"
    ? `${COMPANY_NAME} | Student Profile Approved`
    : status === "Reject Document"
      ? `${COMPANY_NAME} | Document Re-upload Required`
      : `${COMPANY_NAME} | Student Profile Rejected`;

        const emailHtml =
          status === "Approved"
            ? `
              <div
                style="
                  font-family: Arial, sans-serif;
                  line-height: 1.7;
                  color: #333;
                  max-width: 650px;
                  margin: 0 auto;
                  padding: 20px;
                "
              >

                <h2 style="color: #4b3f9f;">
                  ${COMPANY_NAME}
                </h2>

                <h3>
                  Student Profile Approved
                </h3>

                <p>
                  Dear ${student.firstName},
                </p>

                <p>
                  Your student profile has been
                  <strong>approved</strong> by the administrator.
                </p>

                <p>
                  Your account is now active and ready to use.
                </p>

                <p>
                  You can now log in to the
                  <strong>${COMPANY_NAME}</strong>
                  portal using your registered email address
                  and password.
                </p>

                <p>
                  Thank you for joining
                  <strong>${COMPANY_NAME}</strong>.
                </p>

                <br />

                <p>
                  Regards,<br />
                  <strong>Admin</strong><br />
                  <strong>${COMPANY_NAME}</strong>
                </p>

              </div>
            `
                        : status === "Reject Document"
  ? `
    <div
      style="
        font-family: Arial, sans-serif;
        line-height: 1.7;
        color: #333;
        max-width: 650px;
        margin: 0 auto;
        padding: 20px;
      "
    >

      <h2 style="color: #1f3c88; margin-bottom: 5px;">
        ${COMPANY_NAME}
      </h2>

      <p style="color: #666; margin-top: 0;">
        Student Document Notification
      </p>

      <hr style="border: 0; border-top: 1px solid #ddd;" />

      <p>
        Dear ${student.firstName},
      </p>

      <p>
        We have reviewed your student registration submitted to
        <strong>${COMPANY_NAME}</strong>.
      </p>

      <div
        style="
          background: #fff7e6;
          border-left: 4px solid #f0ad4e;
          padding: 15px 18px;
          margin: 20px 0;
        "
      >

        <h3 style="margin-top: 0; color: #9a6700;">
          Document Re-upload Required
        </h3>

        <p style="margin-bottom: 0;">
          The document you uploaded could not be accepted by the
          administrator. Please upload a new and valid student ID
          document for verification.
        </p>

      </div>

      <p>
        Your student profile has been kept in
        <strong>Pending</strong> status until the new document is
        submitted and reviewed.
      </p>

      <p>
        Please click the button below to open your registration form.
      </p>

      <p>
        Your existing registration details will already be filled in.
        You only need to upload a new document and submit the form again.
      </p>

      <p style="text-align: center; margin: 30px 0;">

        <a
          href="${reuploadLink}"
          style="
            display: inline-block;
            background: #087ff5;
            color: #ffffff;
            text-decoration: none;
            padding: 13px 28px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 15px;
          "
        >
          Re-upload Document
        </a>

      </p>

      <div
        style="
          border: 1px solid #ddd;
          background: #fafafa;
          padding: 15px 18px;
          margin: 20px 0;
          border-radius: 5px;
        "
      >

        <strong>Important:</strong>

        <p style="margin-bottom: 0;">
          Please make sure the complete document is visible,
          clear, readable and not cropped or blurred.
        </p>

      </div>

      <p>
        This re-upload link is valid for
        <strong>24 hours</strong>.
      </p>

      <hr style="border: 0; border-top: 1px solid #ddd;" />

      <p>
        Regards,<br />
        <strong>Admin</strong><br />
        <strong>${COMPANY_NAME}</strong>
      </p>

      <p
        style="
          color: #888;
          font-size: 12px;
          margin-top: 25px;
        "
      >
        This is an automated email from
        ${COMPANY_NAME}. Please do not reply directly to this email.
      </p>

    </div>
  `
            : `
              <div
                style="
                  font-family: Arial, sans-serif;
                  line-height: 1.7;
                  color: #333;
                  max-width: 650px;
                  margin: 0 auto;
                  padding: 20px;
                "
              >

                <h2 style="color: #4b3f9f;">
                  ${COMPANY_NAME}
                </h2>

                <h3>
                  Student Profile Rejected
                </h3>

                <p>
                  Dear ${student.firstName},
                </p>

                <p>
                  We regret to inform you that your
                  student profile has been
                  <strong>rejected</strong> by the administrator.
                </p>

                <p>
                  <strong>
                    Reason for rejection:
                  </strong>
                </p>

                <div
                  style="
                    background: #f5f5f5;
                    padding: 15px;
                    border-left: 4px solid #d9534f;
                    margin: 10px 0;
                  "
                >
                  ${reason.trim()}
                </div>

                <p>
                  Please review the reason mentioned above
                  and take the necessary action.
                </p>

                <p>
                  If you need further assistance,
                  please contact the administrator.
                </p>

                <br />

                <p>
                  Regards,<br />
                  <strong>Admin</strong><br />
                  <strong>${COMPANY_NAME}</strong>
                </p>

              </div>
            `;

        const mailInfo =
          await transporter.sendMail({
            from:
              process.env.EMAIL_USER,

            to:
              student.email,

            subject:
              emailSubject,

            html:
              emailHtml,
          });

        emailSent = true;

        console.log(
          "📧 Student approval/rejection email sent successfully:",
          {
            messageId:
              mailInfo.messageId,

            to:
              student.email,

            status,
          }
        );

      } catch (emailError) {

        emailErrorMessage =
          emailError?.message ||
          "Unknown email error";

        console.error(
          "Student approval/rejection email failed:",
          emailError
        );
      }

      // =================================================
      // SEND COMPANY NOTIFICATION EMAIL
      // (APPROVED / REJECT DOCUMENT / REJECTED)
      // =================================================

      const isApproved =
        status === "Approved";

      const isRejectDocument =
        status === "Reject Document";

      const studentLogPrefix =
        isApproved
          ? "STUDENT APPROVAL"
          : isRejectDocument
            ? "STUDENT DOCUMENT REJECTION"
            : "STUDENT REGISTRATION REJECTION";

      try {

        if (process.env.COMPANY_EMAIL) {

          const actionDate =
            new Date().toLocaleString(
              "en-IN"
            );

          const statusLabel =
            isApproved
              ? "Approved"
              : isRejectDocument
                ? "Document Re-upload Required"
                : "Rejected";

          const companySubject =
            isApproved
              ? "CeiT Academy - Student Registration Approved"
              : isRejectDocument
                ? "CeiT Academy - Student Document Re-upload Required"
                : "CeiT Academy - Student Registration Rejected";

          const companyIntro =
            isApproved
              ? `The administrator has approved the student's registration.`
              : isRejectDocument
                ? `The document submitted by the student was rejected and the student has been asked to upload a corrected document.`
                : `The student's registration has been rejected by the administrator.`;

          const companyReuploadLink =
            isRejectDocument &&
            process.env.FRONTEND_URL &&
            student.documentReuploadToken
              ? `${process.env.FRONTEND_URL}/login?reuploadToken=${student.documentReuploadToken}&role=student`
              : "-";

          console.log(
            `📧 SENDING ${studentLogPrefix} EMAIL TO COMPANY:`,
            process.env.COMPANY_EMAIL
          );

          await transporter.sendMail({
            from: `"CeiT Academy - Online Tuition" <${process.env.EMAIL_USER}>`,

            to: process.env.COMPANY_EMAIL,

            subject: companySubject,

            html: `
              <div style="
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f6f8;
                padding: 30px 15px;
              ">

                <div style="
                  max-width: 650px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 10px;
                  padding: 35px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                ">

                  <h2 style="
                    color: #2c3e50;
                    margin-bottom: 5px;
                  ">
                    CeiT Academy - Online Tuition
                  </h2>

                  <p style="
                    color: #777;
                    margin-top: 0;
                    font-size: 14px;
                  ">
                    Student Status Update
                  </p>

                  <hr style="
                    border: none;
                    border-top: 1px solid #e5e5e5;
                    margin: 20px 0;
                  ">

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    ${companyIntro}
                  </p>

                  <div style="
                    background-color: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 25px 0;
                  ">

                    <p style="margin: 8px 0;">
                      <strong>Student Name:</strong>
                      ${student.firstName} ${student.lastName}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>Student Email:</strong>
                      ${student.email}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>Status:</strong>
                      ${statusLabel}
                    </p>

                    <p style="margin: 8px 0;">
                      <strong>
                        ${
                          isRejectDocument
                            ? "Date/Time"
                            : isApproved
                              ? "Approval Date/Time"
                              : "Rejection Date/Time"
                        }:
                      </strong>
                      ${actionDate}
                    </p>

                    ${
                      !isApproved
                        ? `
                    <p style="margin: 8px 0;">
                      <strong>
                        ${
                          isRejectDocument
                            ? "Re-upload Link:"
                            : "Rejection Reason:"
                        }
                      </strong>
                      ${
                        isRejectDocument
                          ? companyReuploadLink
                          : reason || "-"
                      }
                    </p>
                    `
                        : ""
                    }

                  </div>

                  <p style="
                    font-size: 15px;
                    color: #555;
                    line-height: 1.6;
                  ">
                    This is an automated status
                    notification for your records.
                  </p>

                  <hr style="
                    border: none;
                    border-top: 1px solid #e5e5e5;
                    margin: 30px 0 20px;
                  ">

                  <p style="
                    font-size: 14px;
                    color: #555;
                    line-height: 1.6;
                  ">
                    Regards,<br>
                    <strong>
                      CeiT Academy - Online Tuition
                    </strong>
                  </p>

                  <p style="
                    font-size: 12px;
                    color: #999;
                    margin-top: 25px;
                  ">
                    This is an automated email from
                    CeiT Academy - Online Tuition.
                  </p>

                </div>
              </div>
            `,
          });

          console.log(
            `✅ ${studentLogPrefix} EMAIL SENT TO COMPANY:`,
            process.env.COMPANY_EMAIL
          );
        }

      } catch (companyEmailError) {

        console.error(
          `❌ ${studentLogPrefix} EMAIL TO COMPANY FAILED:`,
          companyEmailError.message
        );
      }

      // =================================================
      // ACTIVITY
      // =================================================

      try {

        await Activity.create({
          type:
            "student",

          message:
            `Student ${student.firstName} ${student.lastName} was ${status}`,

          time:
            new Date(),
        });

      } catch (activityError) {

        console.error(
          "Activity log error:",
          activityError.message
        );
      }

      // =================================================
      // RESPONSE
      // =================================================

      return res.json({

        success: true,

        message:
  status === "Approved"
    ? emailSent
      ? "Student approved successfully and approval email sent."
      : "Student approved successfully, but approval email could not be sent."
    : status === "Reject Document"
      ? emailSent
        ? "Document rejection notification sent successfully."
        : "Document rejection notification could not be sent."
      : emailSent
        ? "Student rejected successfully and rejection email sent."
        : "Student rejected successfully, but rejection email could not be sent.",
        emailSent,

        ...(emailSent
          ? {}
          : {
              emailError:
                emailErrorMessage,
            }),

        student,

      });

    } catch (err) {

      console.error(
        "Student approval error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Approval/rejection failed",
      });
    }
  }
);
/* =================================================
   ADMIN — ACTIVATE / DEACTIVATE STUDENT
================================================= */

router.put(
  "/admin/:id/status",
  async (req, res) => {
    try {
      const { action } = req.body;

      if (!["activate", "deactivate"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid action",
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

      /* =========================================
         ONLY APPROVED STUDENTS CAN BE
         ACTIVATED / DEACTIVATED
      ========================================= */

      if (student.approvalStatus !== "Approved") {
        return res.status(400).json({
          success: false,
          message:
            "Only approved students can be activated or deactivated",
        });
      }

      /* =========================================
         UPDATE ACTIVE STATUS
      ========================================= */

      if (action === "activate") {

        student.isActive = true;
        student.activationRequested = false;

      } else {

        student.isActive = false;
        student.activationRequested = false;

      }

      await student.save();

      /* =========================================
         ACTIVITY LOG
      ========================================= */

      try {

        await Activity.create({
          type: "student",

          message:
            `Student ${student.firstName} ${student.lastName} was ${
              action === "activate"
                ? "activated"
                : "deactivated"
            }`,

          time: new Date(),
        });

      } catch (activityError) {

        console.error(
          "Student status activity error:",
          activityError.message
        );

      }

      return res.json({
        success: true,

        message:
          action === "activate"
            ? "Student activated successfully"
            : "Student deactivated successfully",

        student: {
          _id: student._id,

          approvalStatus:
            student.approvalStatus,

          isActive:
            student.isActive,

          activationRequested:
            student.activationRequested,
        },
      });

    } catch (error) {

      console.error(
        "Student status update error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update student status",

        error: error.message,
      });

    }
  }
);


/* =================================================
   STUDENT REQUEST ACTIVATION
================================================= */

router.post(
  "/request-activation/:studentId",
  async (req, res) => {

    try {

      const { studentId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          studentId
        )
      ) {

        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });

      }

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

      /* =========================================
         ONLY APPROVED STUDENTS CAN REQUEST
         ACTIVATION
      ========================================= */

      if (
        student.approvalStatus !==
        "Approved"
      ) {

        return res.status(403).json({
          success: false,
          message:
            "Only approved students can request activation",
        });

      }

      /* =========================================
         STUDENT MUST BE DEACTIVATED
      ========================================= */

      if (student.isActive) {

        return res.status(400).json({
          success: false,
          message:
            "Your student account is already active",
        });

      }

      /* =========================================
         ALREADY REQUESTED
      ========================================= */

      if (
        student.activationRequested
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Activation request has already been submitted",
        });

      }

      /* =========================================
         CREATE ACTIVATION REQUEST
      ========================================= */

      student.activationRequested =
        true;

      student.isActive = false;

      await student.save();

      /* =========================================
         ACTIVITY LOG
      ========================================= */

      try {

        await Activity.create({
          type: "student",

          message:
            `Student ${student.firstName} ${student.lastName} requested account activation`,

          time: new Date(),
        });

      } catch (activityError) {

        console.error(
          "Student activation request activity error:",
          activityError.message
        );

      }

      return res.json({
        success: true,

        message:
          "Activation request submitted successfully. Please wait for admin approval.",

        student: {

          _id:
            student._id,

          approvalStatus:
            student.approvalStatus,

          isActive:
            student.isActive,

          activationRequested:
            student.activationRequested,

        },
      });

    } catch (error) {

      console.error(
        "Student activation request error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Failed to submit activation request",

        error:
          error.message,

      });

    }
  }
);


/* =================================================
   ADMIN — GET STUDENT ACTIVATION REQUESTS
================================================= */

router.get(
  "/admin/activation-requests",
  async (req, res) => {

    try {

      const students =
        await Student.find({

          approvalStatus:
            "Approved",

          isActive:
            false,

          activationRequested:
            true,

        })
        .select("-password")
        .sort({
          createdAt: -1,
        });

      return res.json({

        success: true,

        students,

      });

    } catch (error) {

      console.error(
        "Fetch student activation requests error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch student activation requests",

        error:
          error.message,

      });

    }
  }
);
/* =================================================
   STUDENT DASHBOARD
================================================= */

router.get(
  "/:id/dashboard",
  async (req, res) => {
    try {

      // =================================================
      // GET STUDENT
      // =================================================

      const student =
        await Student.findById(
          req.params.id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      // =================================================
      // REQUIRED MODELS
      // =================================================

      const Teacher =
        require("../models/Teacher");

      const AttendanceSession =
        require("../models/AttendanceSession");

      const AttendanceRecord =
        require("../models/AttendanceRecord");

      // =================================================
      // SUBJECTS AVAILABLE FOR STUDENT'S CLASS
      // =================================================

      const assignedTeachers =
        await Teacher.find({
          classesAssigned:
            student.class,

          isApproved: true,

        }).populate(
          "subjects",
          "name"
        );

      const enrolledSubjects =
        [];

      assignedTeachers.forEach(
        teacher => {

          teacher.subjects?.forEach(
            subject => {

              if (
                subject?.name &&
                !enrolledSubjects.includes(
                  subject.name
                )
              ) {

                enrolledSubjects.push(
                  subject.name
                );

              }

            }
          );

        }
      );

      // =================================================
      // ATTENDANCE PROGRESS
      //
      // Example:
      //
      // Total classes = 2
      // Attended       = 1
      //
      // 1 / 2 * 100 = 50%
      // =================================================

      const attendanceSessions =
        await AttendanceSession.find({
          class:
            student.class,

          status:
            "completed",

        }).select("_id");

      const totalClasses =
        attendanceSessions.length;

      let attendedClasses = 0;

      // =================================================
      // FIND STUDENT ATTENDANCE
      // =================================================

      if (
        totalClasses > 0
      ) {

        const sessionIds =
          attendanceSessions.map(
            session =>
              session._id
          );

        const attendanceRecords =
          await AttendanceRecord.find({
            studentId:
              student._id,

            sessionId: {
              $in: sessionIds,
            },

          }).select(
            "sessionId status"
          );

        // Count only Present records.
        attendedClasses =
          attendanceRecords.filter(
            record =>
              String(
                record.status
              ).toLowerCase() ===
              "present"
          ).length;
      }

      // =================================================
      // CALCULATE ATTENDANCE %
      // =================================================

      const attendancePercentage =
        totalClasses > 0
          ? Math.round(
              (
                attendedClasses /
                totalClasses
              ) * 100
            )
          : 0;

      // =================================================
      // ANALYTICS
      // =================================================

      const summary =
        await AnalyticsAgent.getSummary(
          req.params.id
        );

      // =================================================
      // DASHBOARD RESPONSE
      // =================================================

      res.json({
        success: true,

        stats: {

          // Number of subjects
          // available for student's class
          enrolledSubjects:
            enrolledSubjects.length,

          // Assignment counts are calculated
          // in StudentDashboard.js using the
          // assignments API.
          pendingAssignments: 0,

          completedAssignments: 0,

          // REAL ATTENDANCE %
          attendance:
            attendancePercentage,

          lastPayment:
            student.status ===
            "Paid"
              ? "Paid"
              : "Pending",

          totalInteractions:
            summary.totalInteractions,

          lastContact:
            summary.lastContact,
        },

        // =================================================
        // ATTENDANCE DETAILS
        // Useful for debugging / future UI
        // =================================================

        attendanceDetails: {

          totalClasses:
            totalClasses,

          attendedClasses:
            attendedClasses,

          attendancePercentage:
            attendancePercentage,
        },

        // =================================================
        // SUBJECT LIST
        // =================================================

        enrolledSubjectsList:
          enrolledSubjects,

        // =================================================
// STUDENT
// =================================================
student: {
  id: student._id,

  firstName: student.firstName,

  lastName: student.lastName,

  email: student.email,

  mobile: student.mobile,

  class: student.class,

  group: student.group,

  syllabus: student.syllabus,

  status: student.status,

  approvalStatus: student.approvalStatus,

  isActive: student.isActive,

  activationRequested: student.activationRequested,
},
     
      });

    } catch (err) {

      console.error(
        "Dashboard Error:",
        err
      );

      res.status(500).json({
        success: false,

        message:
          "Failed to fetch dashboard data",
      });
    }
  }
);

/* =================================================
   GET SINGLE STUDENT
================================================= */

router.get(
  "/:id",
  async (req, res) => {
    try {

      const student =
        await Student.findById(
          req.params.id
        ).select("-password");

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found",
        });
      }

      res.json(student);

    } catch (err) {

      console.error(
        "Get student error:",
        err
      );

      res.status(500).json({
        message:
          "❌ Failed to fetch student",
      });
    }
  }
);

// =================================================
// GET STUDENT DETAILS FOR DOCUMENT RE-UPLOAD
// =================================================

router.get(
  "/document-reupload/:token",
  async (req, res) => {
    try {

      const { token } = req.params;

      const student = await Student.findOne({
        documentReuploadToken: token,
        documentReuploadExpires: {
          $gt: new Date()
        }
      }).select(
        "-password -documentReuploadToken -documentReuploadExpires"
      );

      if (!student) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired document re-upload link."
        });
      }

      return res.json({
        success: true,
        student: {
          title: student.salutation,
          firstName: student.firstName,
          lastName: student.lastName,
          mobile: student.mobile,
          syllabus: student.syllabus,
          studentClass: student.class,
          timezone: student.timezone,
          email: student.email,
          emisNumber: student.emisNumber
        }
      });

    } catch (error) {

      console.error(
        "Get re-upload student details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load student details."
      });
    }
  }
);


router.post(
  "/document-reupload/:token",
  upload.single("proof"),
  async (req, res) => {
  try {
    const { token } = req.params;
    if (!req.file) {
  return res.status(400).json({
    success: false,
    message: "Please upload the replacement ID proof."
  });
}

    const student = await Student.findOne({
      documentReuploadToken: token,
      documentReuploadExpires: { $gt: new Date() }
    });

    if (!student) {
      return res.status(400).json({
        message: "Invalid or expired document re-upload link."
      });
    }

    const proof =
  `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

student.proof = proof;

student.approvalStatus = "Pending";
student.isActive = false;
student.activationRequested = false;

student.documentReuploadToken = null;
student.documentReuploadExpires = null;

    await student.save();

    res.json({
      message: "Document re-upload request accepted.",
      studentId: student._id
    });

  } catch (error) {
    console.error("Document re-upload error:", error);

    res.status(500).json({
      message: "Server error."
    });
  }
});

module.exports = router;