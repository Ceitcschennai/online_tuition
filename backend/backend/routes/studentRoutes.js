const express = require("express");
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

  if (!/^[1-9]\d{9}$/.test(mob)) {
    errors.mobile =
      "Must be exactly 10 digits, not starting with 0";
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
                Registration Received
              </h3>

              <p>
                Dear ${firstName},
              </p>

              <p>
                Thank you for registering with
                <strong>${COMPANY_NAME}</strong>.
              </p>

              <p>
                Your registration has been
                <strong>successfully received</strong>.
              </p>

              <p>
                Your profile is currently
                <strong>waiting for admin approval</strong>.
              </p>

              <p>
                Our admin team will review your
                registration details and submitted documents.
              </p>

              <p>
                Once your profile has been approved,
                we will send you another email confirming
                that your account is ready to use.
              </p>

              <p>
                After receiving the approval email,
                you can log in to the
                <strong>${COMPANY_NAME}</strong>
                portal using your registered email address
                and password.
              </p>

              <p>
                Please wait for the approval confirmation
                before attempting to log in.
              </p>

              <br />

              <p>
                Thank you for choosing
                <strong>${COMPANY_NAME}</strong>.
              </p>

              <p>
                Regards,<br />
                <strong>Admin</strong><br />
                <strong>${COMPANY_NAME}</strong>
              </p>

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

      if (
        !["Approved", "Rejected"].includes(
          status
        )
      ) {
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

      student.approvalStatus =
        status;

      student.isActive =
        status === "Approved";

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

        const emailSubject =
          status === "Approved"
            ? `${COMPANY_NAME} | Student Profile Approved`
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

          id:
            student._id,

          firstName:
            student.firstName,

          lastName:
            student.lastName,

          class:
            student.class,

          approvalStatus:
            student.approvalStatus,
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

module.exports = router;