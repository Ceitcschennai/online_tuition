const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const multer = require("multer");
const mongoose = require("mongoose");

const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const ClassSession = require("../models/ClassSession");
const Activity = require("../models/Activity");
const transporter = require("../config/email");

const {
  ActionAgent,
  AnalyticsAgent,
  KnowledgeAgent,
} = require("../agents/crewAgents");

const db = mongoose.connection;

/* =================================================
   MULTER CONFIG
================================================= */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/* =================================================
   HELPER - CHECK VALID MONGODB ID
================================================= */

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* =================================================
   HELPER - NORMALIZE SALUTATION
================================================= */

function normalizeSalutation(value) {
  if (!value) {
    return null;
  }

  const map = {
    mr: "Mr.",
    ms: "Ms.",
    mrs: "Mrs.",
    dr: "Dr.",
  };

  const clean = value
    .toString()
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();

  return map[clean] || value.toString().trim();
}

/* =================================================
   HELPER - NORMALIZE CLASSES
================================================= */

function normalizeClasses(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => item.toString().trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => item.toString().trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Normal string handling
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/* =================================================
   HELPER - GET SUBJECT CLASSES

   If the subject has no classes assigned,
   fall back to the teacher's assigned classes.
================================================= */

function getSubjectClasses(subject, teacherClasses = []) {
  const subjectClasses = normalizeClasses(subject.classes);

  if (subjectClasses.length > 0) {
    return subjectClasses;
  }

  return normalizeClasses(teacherClasses);
}

/* =================================================
   HELPER - VALIDATE TEACHER
================================================= */

function validateTeacher(body) {
  const errors = {};

  const normalized = {
    ...body,
  };

  /* =========================
     SALUTATION
  ========================= */

  if (body.salutation) {
    const salutation = normalizeSalutation(body.salutation);

    const validSalutations = [
      "Mr.",
      "Ms.",
      "Mrs.",
      "Dr.",
      "Mr",
      "Ms",
      "Mrs",
      "Dr",
    ];

    if (salutation && validSalutations.includes(salutation)) {
      normalized.salutation = salutation;
    }
  }

  /* =========================
     FIRST NAME
  ========================= */

  const firstName = (body.firstName || "").trim();

  if (
    firstName.length < 2 ||
    !/^[a-zA-Z\s]+$/.test(firstName)
  ) {
    errors.firstName =
      "First name must contain at least 2 letters";
  } else {
    normalized.firstName = firstName;
  }

  /* =========================
     LAST NAME
  ========================= */

  const lastName = (body.lastName || "").trim();

  if (
    lastName.length < 1 ||
    !/^[a-zA-Z\s]+$/.test(lastName)
  ) {
    errors.lastName =
      "Last name must contain letters only";
  } else {
    normalized.lastName = lastName;
  }

  /* =========================
     EMAIL
  ========================= */

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const email = (body.email || "")
    .trim()
    .toLowerCase();

  if (!emailRegex.test(email)) {
    errors.email =
      "Please enter a valid email address";
  } else {
    normalized.email = email;
  }

  /* =========================
     PASSWORD
  ========================= */

  const password = body.password || "";

  if (password.length < 8) {
    errors.password =
      "Password must be at least 8 characters";
  } else {
    normalized.password = password;
  }

  /* =========================
     MOBILE
  ========================= */

  const mobile = (body.mobile || "")
    .toString()
    .trim();

  if (
    mobile &&
    !/^[0-9]{7,15}$/.test(mobile)
  ) {
    errors.mobile =
      "Mobile number must contain 7 to 15 digits";
  } else {
    normalized.mobile = mobile;
  }

  /* =========================
     TIMEZONE
  ========================= */

  if (
    body.timezone &&
    body.timezone.toString().trim()
  ) {
    normalized.timezone =
      body.timezone.toString().trim();
  }

  /* =========================
     QUALIFICATION
  ========================= */

  if (
    body.qualification &&
    body.qualification.toString().trim()
  ) {
    normalized.qualification =
      body.qualification.toString().trim();
  }

  /* =========================
     PREFERRED SUBJECT
  ========================= */

  if (
    body.preferredSubject &&
    body.preferredSubject.toString().trim()
  ) {
    normalized.preferredSubject =
      body.preferredSubject.toString().trim();
  }

  /* =========================
     CLASSES
  ========================= */

  normalized.classes =
    normalizeClasses(body.classes);

  normalized.classesAssigned =
    normalizeClasses(
      body.classesAssigned ||
      body.classes
    );

  return {
    errors,
    normalized,
  };
}

/* =================================================
   TEACHER REGISTRATION
================================================= */

router.post(
  "/register",
  upload.any(),
  async (req, res) => {
    try {
      const {
        errors,
        normalized,
      } = validateTeacher(req.body);

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Please correct the validation errors",
          errors,
        });
      }

      const existingTeacher =
        await Teacher.findOne({
          email: normalized.email,
        });

      if (existingTeacher) {
        return res.status(409).json({
          success: false,
          message:
            "A teacher with this email already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          normalized.password,
          10
        );
const certificateFile = req.files?.find(
  (file) => file.fieldname === "degreeCertificate"
);

const degreeCertificate = certificateFile
  ? `data:${certificateFile.mimetype};base64,${certificateFile.buffer.toString("base64")}`
  : "";

      const teacher =
        await Teacher.create({
          salutation:
            normalized.salutation,

          firstName:
            normalized.firstName,

          lastName:
            normalized.lastName,

          email:
            normalized.email,

          password:
            hashedPassword,

          mobile:
            normalized.mobile,

          timezone:
            normalized.timezone,

          qualification:
            normalized.qualification,

          preferredSubject:
            normalized.preferredSubject,

          classesAssigned:
            normalized.classesAssigned,

          degreeCertificate:
            degreeCertificate,

          isApproved:
            false,

          isRejected:
            false,

          isActive:
            true,
        });

      try {
        await Activity.create({
          type: "teacher",
          message:
            `New teacher registration: ${teacher.firstName} ${teacher.lastName}`,
          time: new Date(),
        });
      } catch (activityError) {
        console.error(
          "Teacher activity error:",
          activityError.message
        );
      }

      try {
        if (
          ActionAgent &&
          typeof ActionAgent.createTask ===
            "function"
        ) {
          await ActionAgent.createTask({
            customerId:
              teacher._id.toString(),

            issue:
              `New teacher registration requires approval: ${teacher.firstName} ${teacher.lastName}`,

            status:
              "open",
          });
        }
      } catch (agentError) {
        console.error(
          "Teacher ActionAgent error:",
          agentError.message
        );
      }

      try {
        if (
          AnalyticsAgent &&
          typeof AnalyticsAgent.logInteraction ===
            "function"
        ) {
          await AnalyticsAgent.logInteraction({
            customerId:
              teacher._id.toString(),

            message:
              `Teacher registered: ${teacher.firstName} ${teacher.lastName}`,

            type:
              "registration",
          });
        }
      } catch (analyticsError) {
        console.error(
          "Teacher analytics error:",
          analyticsError.message
        );
      }

      try {
        const ADMIN_EMAIL =
          process.env.ADMIN_EMAIL;

        if (ADMIN_EMAIL) {
          await transporter.sendMail({
            from:
              process.env.EMAIL_USER,

            to:
              ADMIN_EMAIL,

            subject:
              "New Teacher Registration",

            html: `
              <h2>New Teacher Registered</h2>

              <p>
                <b>Name:</b>
                ${teacher.firstName} ${teacher.lastName}
              </p>

              <p>
                <b>Email:</b>
                ${teacher.email}
              </p>

              <p>
                <b>Qualification:</b>
                ${teacher.qualification || "-"}
              </p>

              <p>
                <b>Preferred Subject:</b>
                ${teacher.preferredSubject || "-"}
              </p>

              <p>
                <b>Classes:</b>
                ${(teacher.classesAssigned || []).join(", ") || "-"}
              </p>

              <p>
                <b>Status:</b>
                Pending Admin Approval
              </p>
            `,
          });
        }
      } catch (emailError) {
        console.error(
          "Admin email failed:",
          emailError.message
        );
      }

            // =================================================
      // SEND REGISTRATION CONFIRMATION EMAIL TO FACULTY
      // =================================================

      try {
        console.log(
          "📧 SENDING FACULTY REGISTRATION EMAIL TO:",
          teacher.email
        );

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: teacher.email,
          subject: "CeiT Academy - Faculty Registration Received",

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
                  Faculty Registration Confirmation
                </p>

                <hr style="
                  border: none;
                  border-top: 1px solid #e5e5e5;
                  margin: 20px 0;
                ">

                <p style="
                  font-size: 16px;
                  color: #333;
                ">
                  Dear ${teacher.firstName} ${teacher.lastName},
                </p>

                <p style="
                  font-size: 16px;
                  color: #333;
                  line-height: 1.6;
                ">
                  Thank you for registering as a faculty member with
                  <strong>CeiT Academy - Online Tuition</strong>.
                </p>

                <p style="
                  font-size: 16px;
                  color: #333;
                  line-height: 1.6;
                ">
                  We have successfully received your registration details
                  and submitted documents.
                </p>

                <div style="
                  background-color: #fff8e6;
                  border-left: 5px solid #f0ad4e;
                  padding: 15px 18px;
                  margin: 25px 0;
                ">

                  <p style="
                    margin: 0;
                    color: #8a6d3b;
                    font-size: 17px;
                    font-weight: bold;
                  ">
                    Profile Status: PENDING ADMIN APPROVAL
                  </p>

                </div>

                <p style="
                  font-size: 16px;
                  color: #333;
                  line-height: 1.6;
                ">
                  Your profile is currently waiting for admin approval.
                  Our admin team will review your registration details
                  and the documents submitted by you.
                </p>

                <p style="
                  font-size: 16px;
                  color: #333;
                  line-height: 1.6;
                ">
                  Once your profile has been reviewed and approved,
                  you will receive another email confirming that your
                  faculty account is ready to use.
                </p>

                <p style="
                  font-size: 16px;
                  color: #333;
                  line-height: 1.6;
                ">
                  Please wait for the approval confirmation email before
                  attempting to log in.
                </p>

                <p style="
                  font-size: 16px;
                  color: #333;
                  line-height: 1.6;
                ">
                  After your profile is approved, you can log in using
                  your registered email address and password.
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
                  <strong>Admin</strong><br>
                  <strong>CeiT Academy - Online Tuition</strong>
                </p>

                <p style="
                  font-size: 12px;
                  color: #999;
                  margin-top: 25px;
                ">
                  This is an automated email from
                  CeiT Academy - Online Tuition.
                  Please do not reply directly to this email.
                </p>

              </div>
            </div>
          `,
        });

        console.log(
          "✅ FACULTY REGISTRATION EMAIL SENT TO:",
          teacher.email
        );

      } catch (emailError) {
        console.error(
          "❌ FACULTY REGISTRATION EMAIL FAILED:",
          emailError.message
        );
      }

      return res.status(201).json({
        success: true,

        message:
          "Teacher registered successfully. Waiting for admin approval.",

        teacher: {
          id:
            teacher._id,

          firstName:
            teacher.firstName,

          lastName:
            teacher.lastName,

          email:
            teacher.email,

          qualification:
            teacher.qualification,

          timezone:
            teacher.timezone,

          preferredSubject:
            teacher.preferredSubject,

          classesAssigned:
            teacher.classesAssigned || [],

          isApproved:
            teacher.isApproved,

          isRejected:
            teacher.isRejected,
        },
      });

    } catch (err) {
      console.error(
        "TEACHER REGISTRATION ERROR:",
        err
      );

      if (err.name === "ValidationError") {
        const errors = {};

        Object.keys(err.errors).forEach((key) => {
          errors[key] =
            err.errors[key].message;
        });

        return res.status(400).json({
          success: false,
          message:
            "Database validation failed",
          errors,
        });
      }

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "A teacher with this email already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Unable to register teacher",
      });
    }
  }
);

/* =================================================
   GET PENDING TEACHERS
================================================= */

router.get(
  "/admin/pending",
  async (req, res) => {
    try {
      const teachers =
        await Teacher.find({
          isApproved: false,
          isRejected: false,
        })
          .select("-password")
          .populate(
            "subjects",
            "name category classes"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        teachers,
      });

    } catch (err) {
      console.error(
        "Fetch pending teachers error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch pending teachers",
      });
    }
  }
);

/* =================================================
   GET APPROVED TEACHERS
================================================= */

router.get(
  "/",
  async (req, res) => {
    try {
      const teachers =
        await Teacher.find({
          isApproved: true,
        })
          .select("-password")
          .populate(
            "subjects",
            "name category classes"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        teachers,
      });

    } catch (err) {
      console.error(
        "Fetch teachers error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch teachers",
      });
    }
  }
);

/* =================================================
   APPROVE / REJECT TEACHER
================================================= */

router.put(
  "/admin/teacher/:id/approve",
  async (req, res) => {
    try {
      const { status, reason } = req.body;

      // =================================================
      // VALIDATE TEACHER ID
      // =================================================

      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID",
        });
      }

      // =================================================
      // VALIDATE STATUS
      // =================================================

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      // =================================================
      // VALIDATE REJECTION REASON
      // =================================================

      if (status === "Rejected" && !reason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      // =================================================
      // FIND TEACHER
      // =================================================

      const teacher = await Teacher.findById(
        req.params.id
      );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // =================================================
      // UPDATE TEACHER STATUS
      // =================================================

      if (status === "Approved") {
        teacher.isApproved = true;
        teacher.isRejected = false;
        teacher.isActive = true;
      } else {
        teacher.isApproved = false;
        teacher.isRejected = true;
        teacher.isActive = false;
      }

      await teacher.save();

      // =================================================
      // CUSTOMER ID
      // =================================================

      const customerId = teacher._id.toString();

      // =================================================
      // ANALYTICS
      // =================================================

      try {
        if (
          AnalyticsAgent &&
          typeof AnalyticsAgent.logInteraction === "function"
        ) {
          await AnalyticsAgent.logInteraction({
            customerId,
            message:
              `Teacher ${teacher.firstName} ${teacher.lastName} was ${status}`,
            type: "approval",
          });
        }
      } catch (analyticsError) {
        console.error(
          "Approval analytics error:",
          analyticsError.message
        );
      }

      // =================================================
      // CLOSE OPEN TASKS
      // =================================================

      try {
        if (db.readyState === 1 && db.db) {
          const tasks = await db.db
            .collection("tasks")
            .find({
              customerId,
              status: "open",
            })
            .toArray();

          for (const task of tasks) {
            try {
              if (
                ActionAgent &&
                typeof ActionAgent.closeTask === "function"
              ) {
                await ActionAgent.closeTask(task._id);
              }
            } catch (taskError) {
              console.error(
                "Task closing error:",
                taskError.message
              );
            }
          }
        }
      } catch (taskError) {
        console.error(
          "Fetch tasks error:",
          taskError.message
        );
      }

      // =================================================
      // ACTIVITY LOG
      // =================================================

      try {
        await Activity.create({
          type: "teacher",
          message:
            `Teacher ${teacher.firstName} ${teacher.lastName} was ${status}`,
          time: new Date(),
        });
      } catch (activityError) {
        console.error(
          "Approval activity error:",
          activityError.message
        );
      }

      // =================================================
      // SEND EMAIL TO TEACHER
      // =================================================

      let emailSent = false;
      let emailErrorMessage = "";

      try {
        console.log(
          "📧 SENDING FACULTY EMAIL TO:",
          teacher.email
        );

        const emailSubject =
          status === "Approved"
            ? "Online Tuition - Faculty Profile Approved"
            : "Online Tuition - Faculty Profile Rejected";

        const emailHtml =
          status === "Approved"
            ? `
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
                    Online Tuition
                  </h2>

                  <p style="
                    color: #777;
                    margin-top: 0;
                    font-size: 14px;
                  ">
                    Faculty Account Notification
                  </p>

                  <hr style="
                    border: none;
                    border-top: 1px solid #e5e5e5;
                    margin: 20px 0;
                  ">

                  <p style="
                    font-size: 16px;
                    color: #333;
                  ">
                    Dear ${teacher.firstName} ${teacher.lastName},
                  </p>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    We are pleased to inform you that your faculty
                    registration profile with
                    <strong>Online Tuition</strong>
                    has been successfully reviewed and approved
                    by the administrator.
                  </p>

                  <div style="
                    background-color: #eaf8ef;
                    border-left: 5px solid #28a745;
                    padding: 15px 18px;
                    margin: 25px 0;
                  ">
                    <p style="
                      margin: 0;
                      color: #218838;
                      font-size: 17px;
                      font-weight: bold;
                    ">
                      Profile Status: APPROVED
                    </p>
                  </div>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    Your faculty account is now active.
                  </p>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    You can now log in to the
                    <strong>Online Tuition Portal</strong>
                    using your registered email address and password.
                  </p>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    After logging in, you will be able to access
                    your faculty portal and use the features
                    available for your account.
                  </p>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    We welcome you to
                    <strong>Online Tuition</strong>
                    and look forward to your contribution to
                    our learning community.
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
                    <strong>Admin</strong><br>
                    <strong>Online Tuition</strong>
                  </p>

                  <p style="
                    font-size: 12px;
                    color: #999;
                    margin-top: 25px;
                  ">
                    This is an automated email from Online Tuition.
                    Please do not reply directly to this email.
                  </p>

                </div>
              </div>
            `
            : `
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
                    Online Tuition
                  </h2>

                  <p style="
                    color: #777;
                    margin-top: 0;
                    font-size: 14px;
                  ">
                    Faculty Account Notification
                  </p>

                  <hr style="
                    border: none;
                    border-top: 1px solid #e5e5e5;
                    margin: 20px 0;
                  ">

                  <p style="
                    font-size: 16px;
                    color: #333;
                  ">
                    Dear ${teacher.firstName} ${teacher.lastName},
                  </p>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    Thank you for registering as a faculty member
                    with <strong>Online Tuition</strong>.
                  </p>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    After reviewing your registration profile,
                    the administrator has decided not to approve
                    your faculty application at this time.
                  </p>

                  <div style="
                    background-color: #fff3f3;
                    border-left: 5px solid #dc3545;
                    padding: 15px 18px;
                    margin: 25px 0;
                  ">

                    <p style="
                      margin: 0 0 10px 0;
                      color: #c82333;
                      font-size: 17px;
                      font-weight: bold;
                    ">
                      Profile Status: REJECTED
                    </p>

                    <p style="
                      margin: 0;
                      color: #333;
                      font-size: 15px;
                      line-height: 1.6;
                    ">
                      <strong>Reason:</strong>
                      ${reason.trim()}
                    </p>

                  </div>

                  <p style="
                    font-size: 16px;
                    color: #333;
                    line-height: 1.6;
                  ">
                    Please review the above feedback carefully.
                    If you require further clarification regarding
                    your application, please contact the administrator
                    of <strong>Online Tuition</strong>.
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
                    <strong>Admin</strong><br>
                    <strong>Online Tuition</strong>
                  </p>

                  <p style="
                    font-size: 12px;
                    color: #999;
                    margin-top: 25px;
                  ">
                    This is an automated email from Online Tuition.
                    Please do not reply directly to this email.
                  </p>

                </div>
              </div>
            `;

        const mailInfo = await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: teacher.email,
          subject: emailSubject,
          html: emailHtml,
        });

        emailSent = true;

        console.log(
          "✅ FACULTY EMAIL SENT SUCCESSFULLY",
          {
            messageId: mailInfo.messageId,
            to: teacher.email,
            status,
          }
        );

      } catch (emailError) {
        emailErrorMessage =
          emailError?.message ||
          "Unknown email error";

        console.error(
          "❌ FACULTY EMAIL FAILED:",
          emailError
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
              ? "Teacher approved successfully and approval email sent."
              : "Teacher approved successfully, but approval email could not be sent."
            : emailSent
              ? "Teacher rejected successfully and rejection email sent."
              : "Teacher rejected successfully, but rejection email could not be sent.",

        emailSent,

        ...(emailSent
          ? {}
          : {
              emailError: emailErrorMessage,
            }),

        teacher: teacher.toObject
          ? teacher.toObject()
          : teacher,
      });

    } catch (err) {
      console.error(
        "Teacher approval error:",
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
   TEACHER DASHBOARD STATS
================================================= */

router.get(
  "/dashboard/stats/:teacherId",
  async (req, res) => {
    try {
      const { teacherId } =
        req.params;

      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid teacher ID",
        });
      }

      const teacher =
        await Teacher.findById(
          teacherId
        ).select(
          "firstName lastName classesAssigned subjects isApproved isRejected"
        );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher not found",
        });
      }

      const teacherClasses =
        normalizeClasses(
          teacher.classesAssigned
        );

      const assignedSubjects =
        await Subject.find({
          teacher: teacherId,
          isActive: true,
        })
          .select(
            "name classes category"
          )
          .sort({
            name: 1,
          });

      const subjectNames =
        assignedSubjects.map(
          (subject) => subject.name
        );

      const subjectClasses =
        assignedSubjects.flatMap(
          (subject) =>
            normalizeClasses(
              subject.classes
            )
        );

      const allClasses =
        [
          ...new Set([
            ...teacherClasses,
            ...subjectClasses,
          ]),
        ];

      let summary = {
        totalInteractions: 0,
        lastContact: null,
      };

      try {
        if (
          AnalyticsAgent &&
          typeof AnalyticsAgent.getSummary ===
            "function"
        ) {
          const result =
            await AnalyticsAgent.getSummary(
              teacherId
            );

          if (result) {
            summary = result;
          }
        }
      } catch (analyticsError) {
        console.error(
          "Dashboard analytics error:",
          analyticsError.message
        );
      }

      const recentActivities =
        await Activity.find({
          type: "teacher",
        })
          .sort({
            time: -1,
          })
          .limit(5);

      return res.json({
        success: true,

        stats: {
          totalStudents: 0,
          assignmentsToReview: 0,
          pendingQueries: 0,
          attendanceRate: 0,

          totalInteractions:
            summary.totalInteractions || 0,

          lastContact:
            summary.lastContact || null,
        },

        teacherInfo: {
          name:
            `${teacher.firstName || ""} ${
              teacher.lastName || ""
            }`.trim(),

          classes:
            allClasses,

          subjects:
            subjectNames,

          assignedSubjects:
            assignedSubjects.map(
              (subject) => ({
                _id:
                  subject._id,

                name:
                  subject.name,

                /*
                  IMPORTANT FIX:

                  If subject.classes is empty,
                  use teacher.classesAssigned.

                  Example:
                  Subject: English
                  subject.classes: []

                  Teacher:
                  classesAssigned: ["Class 9"]

                  Result:
                  classes: ["Class 9"]
                */
                classes:
                  getSubjectClasses(
                    subject,
                    teacherClasses
                  ),

                category:
                  subject.category ||
                  "Regular",
              })
            ),
        },

        recentActivities,
      });

    } catch (err) {
      console.error(
        "Teacher dashboard error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Dashboard fetch failed",
        error:
          err.message,
      });
    }
  }
);

/* =================================================
   GET TEACHER SUBJECTS

   Single route only.
   The duplicate route from the old file
   has been removed.
================================================= */

router.get(
  "/subjects/:teacherId",
  async (req, res) => {
    try {
      const { teacherId } =
        req.params;

      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid teacher ID",
        });
      }

      const teacher =
        await Teacher.findById(
          teacherId
        )
          .select(
            "isApproved isRejected subjects classesAssigned"
          )
          .populate(
            "subjects",
            "name category classes"
          );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher not found",
        });
      }

      if (!teacher.isApproved) {
        return res.status(403).json({
          success: false,
          message:
            "Account not approved yet",
        });
      }

      const teacherClasses =
        normalizeClasses(
          teacher.classesAssigned
        );

      const directSubjects =
        await Subject.find({
          teacher: teacherId,
          isActive: true,
        })
          .select(
            "name category classes"
          )
          .sort({
            name: 1,
          });

      const rawSubjects =
        directSubjects.length > 0
          ? directSubjects
          : (teacher.subjects || []);

      /*
        Add fallback classes to every subject.
      */

      const subjects =
        rawSubjects.map((subject) => ({
          _id:
            subject._id,

          name:
            subject.name,

          category:
            subject.category ||
            "Regular",

          classes:
            getSubjectClasses(
              subject,
              teacherClasses
            ),
        }));

      return res.json({
        success: true,
        subjects,
      });

    } catch (err) {
      console.error(
        "Fetch teacher subjects error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch subjects",
      });
    }
  }
);

/* =================================================
   CREATE CLASS SESSION
================================================= */

router.post(
  "/create-class",
  async (req, res) => {
    try {
      const {
        teacherId,
        subjectId,
        title,
        description,
        meetLink,
        classDate,
        durationMinutes,
      } = req.body;

      if (
        !teacherId ||
        !subjectId ||
        !title ||
        !meetLink ||
        !classDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Teacher, subject, title, meeting link and class date are required",
        });
      }

      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid teacher ID",
        });
      }

      if (!isValidObjectId(subjectId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subject ID",
        });
      }

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

      if (!teacher.isApproved) {
        return res.status(403).json({
          success: false,
          message:
            "Teacher account is not approved",
        });
      }

      const subject =
        await Subject.findOne({
          _id: subjectId,
          isActive: true,
        });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message:
            "Subject not found",
        });
      }

      const session =
        await ClassSession.create({
          teacher:
            teacherId,

          subject:
            subjectId,

          title:
            title.trim(),

          description:
            description
              ? description.trim()
              : "",

          meetLink:
            meetLink.trim(),

          classDate,

          durationMinutes:
            Number(durationMinutes) || 60,
        });

      try {
        await Activity.create({
          type: "teacher",

          message:
            `Teacher ${teacher.firstName} ${teacher.lastName} created class session: ${title}`,

          time:
            new Date(),
        });
      } catch (activityError) {
        console.error(
          "Class activity error:",
          activityError.message
        );
      }

      try {
        if (
          ActionAgent &&
          typeof ActionAgent.createTask ===
            "function"
        ) {
          await ActionAgent.createTask({
            customerId:
              teacherId,

            issue:
              `Class session created: ${title}`,

            status:
              "open",
          });
        }
      } catch (agentError) {
        console.error(
          "Create class ActionAgent error:",
          agentError.message
        );
      }

      try {
        if (
          AnalyticsAgent &&
          typeof AnalyticsAgent.logInteraction ===
            "function"
        ) {
          await AnalyticsAgent.logInteraction({
            customerId:
              teacherId,

            message:
              `Teacher created class session: ${title}`,

            type:
              "class_creation",
          });
        }
      } catch (analyticsError) {
        console.error(
          "Create class AnalyticsAgent error:",
          analyticsError.message
        );
      }

      return res.status(201).json({
        success: true,

        message:
          "Class session created successfully",

        session,
      });

    } catch (err) {
      console.error(
        "Create class error:",
        err
      );

      return res.status(500).json({
        success: false,

        message:
          err.message ||
          "Failed to create class",
      });
    }
  }
);

/* =================================================
   GET TEACHER'S OWN CLASSES
================================================= */

router.get(
  "/my-classes/:teacherId",
  async (req, res) => {
    try {
      const { teacherId } =
        req.params;

      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid teacher ID",
        });
      }

      const sessions =
        await ClassSession.find({
          teacher:
            teacherId,
        })
          .populate(
            "subject",
            "name category classes"
          )
          .sort({
            classDate: 1,
          });

      return res.json({
        success: true,
        sessions,
      });

    } catch (err) {
      console.error(
        "Fetch teacher classes error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch classes",
      });
    }
  }
);

/* =================================================
   GET ACTIVE CLASSES FOR STUDENTS
================================================= */

router.get(
  "/student/classes",
  async (req, res) => {
    try {
      const sessions =
        await ClassSession.find({
          isActive: true,
        })
          .populate(
            "subject",
            "name"
          )
          .populate(
            "teacher",
            "firstName lastName"
          )
          .sort({
            classDate: 1,
          });

      return res.json({
        success: true,
        sessions,
      });

    } catch (err) {
      console.error(
        "Student classes error:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch classes",
      });
    }
  }
);

/* =================================================
   GET TEACHER PROFILE
================================================= */

router.get(
  "/profile/:teacherId",
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID"
        });
      }

      const teacher = await Teacher.findById(teacherId)
        .select("-password")
        .populate(
          "subjects",
          "name category classes"
        );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found"
        });
      }

      return res.json({
        success: true,
        teacher
      });

    } catch (error) {
      console.error(
        "Teacher profile fetch error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch teacher profile"
      });
    }
  }
);

/* =================================================
   UPDATE TEACHER BANK DETAILS
================================================= */

router.put(
  "/profile/:teacherId/bank-details",
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const {
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        accountType
      } = req.body;

      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID"
        });
      }

      const teacher = await Teacher.findById(teacherId);

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found"
        });
      }

      teacher.bankDetails = {
        accountHolderName:
          accountHolderName?.trim() || "",
        bankName:
          bankName?.trim() || "",
        accountNumber:
          accountNumber?.trim() || "",
        ifscCode:
          ifscCode?.trim().toUpperCase() || "",
        accountType:
          accountType || ""
      };

      await teacher.save();

      return res.json({
        success: true,
        message: "Bank details updated successfully",
        bankDetails: teacher.bankDetails
      });

    } catch (error) {
      console.error(
        "Bank details update error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update bank details"
      });
    }
  }
);

/* =================================================
   EXPORT ROUTER
================================================= */

module.exports = router;