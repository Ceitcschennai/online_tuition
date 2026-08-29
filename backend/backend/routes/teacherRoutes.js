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
      const { status } = req.body;

      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid teacher ID",
        });
      }

      if (
        !["Approved", "Rejected"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
        });
      }

      const updateData =
        status === "Approved"
          ? {
              isApproved: true,
              isRejected: false,
              isActive: true,
            }
          : {
              isApproved: false,
              isRejected: true,
              isActive: false,
            };

      const teacher =
        await Teacher.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
          }
        ).select("-password");

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher not found",
        });
      }

      const customerId =
        teacher._id.toString();

      try {
        if (
          AnalyticsAgent &&
          typeof AnalyticsAgent.logInteraction ===
            "function"
        ) {
          await AnalyticsAgent.logInteraction({
            customerId,

            message:
              `Teacher ${teacher.firstName} ${teacher.lastName} was ${status}`,

            type:
              "approval",
          });
        }
      } catch (analyticsError) {
        console.error(
          "Approval analytics error:",
          analyticsError.message
        );
      }

      try {
        if (
          db.readyState === 1 &&
          db.db
        ) {
          const tasks =
            await db.db
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
                typeof ActionAgent.closeTask ===
                  "function"
              ) {
                await ActionAgent.closeTask(
                  task._id
                );
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

      try {
        await transporter.sendMail({
          from:
            process.env.EMAIL_USER,

          to:
            teacher.email,

          subject:
            `Your Teacher Account is ${status}`,

          html: `
            <h2>
              Hello ${teacher.firstName},
            </h2>

            <p>
              Your teacher account has been
              <b>${status}</b>.
            </p>

            ${
              status === "Approved"
                ? `
                  <p>
                    You can now login and start teaching.
                  </p>
                `
                : `
                  <p>
                    Please contact the administrator for more details.
                  </p>
                `
            }
          `,
        });
      } catch (emailError) {
        console.error(
          "Approval email failed:",
          emailError.message
        );
      }

      return res.json({
        success: true,

        message:
          `Teacher ${status.toLowerCase()} successfully`,

        teacher,
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
          "Approval failed",
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
   EXPORT ROUTER
================================================= */

module.exports = router;