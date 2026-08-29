// const express = require("express");
// const bcrypt = require("bcrypt");
// const router = express.Router();

// const Student = require("../models/Student");
// const upload = require("../middleware/upload");
// const transporter = require("../config/email");
// const Activity = require("../models/Activity");

// const {
//   ActionAgent,
//   AnalyticsAgent,
//   KnowledgeAgent,
// } = require("../agents/crewAgents");

// const mongoose = require("mongoose");
// const db = mongoose.connection;

// /* =================================================
//    HELPER — local validation (no API needed)
// ================================================= */
// function normalizeSalutation(val) {
//   if (!val) return null;
//   const map = { mr: "Mr.", ms: "Ms.", miss: "Miss.", mrs: "Mrs.", dr: "Dr." };
//   const clean = val.toLowerCase().replace(/\.$/, "").trim();
//   return map[clean] || val;
// }

// function validateStudent(body, hasFile) {
//   const errors = {};
//   const normalized = { ...body };

//   // salutation
//   const normSal = normalizeSalutation(body.salutation);
//   // ✅ "Miss." is now the standard option going forward; "Ms." stays valid
//   // so existing student records saved before this change don't break.
//   const validSal = ["Mr.", "Miss.", "Mrs.", "Dr.", "Ms."];
//   if (!normSal || !validSal.includes(normSal)) {
//     errors.salutation = "Must be Mr. / Miss. / Mrs. / Dr.";
//   } else {
//     normalized.salutation = normSal;
//   }

//   // firstName
//   const fn = (body.firstName || "").trim();
//   if (fn.length < 2 || !/^[a-zA-Z]+$/.test(fn)) {
//     errors.firstName = "Min 2 letters, letters only";
//   } else {
//     normalized.firstName = fn;
//   }

//   // lastName
//   const ln = (body.lastName || "").trim();
//   if (ln.length < 1 || !/^[a-zA-Z]+$/.test(ln)) {
//     errors.lastName = "Letters only";
//   } else {
//     normalized.lastName = ln;
//   }

//   // mobile
//   const mob = (body.mobile || "").toString().trim();
//   if (!/^[1-9]\d{9}$/.test(mob)) {
//     errors.mobile = "Must be exactly 10 digits, not starting with 0";
//   } else {
//     normalized.mobile = mob;
//   }

//   // email
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   const em = (body.email || "").trim().toLowerCase();
//   if (!emailRegex.test(em)) {
//     errors.email = "Invalid email format";
//   } else {
//     normalized.email = em;
//   }

//   // password — min 8 chars only
//   const pw = body.password || "";
//   if (pw.length < 8) {
//     errors.password = "Password must be at least 8 characters";
//   }

//   // timezone — accept any non-empty value
//   if (!body.timezone || body.timezone.trim() === "") {
//     errors.timezone = "Timezone is required";
//   } else {
//     normalized.timezone = body.timezone.trim();
//   }

//   // syllabus — accept any non-empty value
//   if (!body.syllabus || body.syllabus.trim() === "") {
//     errors.syllabus = "Syllabus is required";
//   } else {
//     normalized.syllabus = body.syllabus.trim();
//   }

//   // class — accept any non-empty value
//   const classVal = (body.class || body.studentClass || "").toString().trim();
//   if (!classVal) {
//     errors.class = "Class is required";
//   } else {
//     normalized.class = classVal;
//   }

//   // emisNumber — min 4 chars
//   const emis = (body.emisNumber || "").toString().trim();
//   if (emis.length < 4) {
//     errors.emisNumber = "Minimum 4 characters";
//   } else {
//     normalized.emisNumber = emis;
//   }

//   // file
//   if (!hasFile) {
//     errors._file = "ID Proof is required";
//   }

//   const valid = Object.keys(errors).length === 0;
//   return {
//     valid,
//     errors,
//     normalized,
//     summary: valid ? "All valid" : `Failed: ${Object.keys(errors).join(", ")}`,
//   };
// }

// /* =================================================
//    STUDENT REGISTER
// ================================================= */
// router.post("/register", upload.single("proof"), async (req, res) => {
//   const proof = req.file?.filename;

//   try {
//     const validation = validateStudent(req.body, !!req.file);

//     if (!validation.valid) {
//       return res.status(400).json({
//         message: "Validation failed",
//         errors: validation.errors,
//         summary: validation.summary,
//       });
//     }

//     const {
//       salutation, firstName, lastName, mobile, timezone,
//       email, password, class: studentClass, syllabus, emisNumber,
//     } = validation.normalized;

//     const { group } = req.body;

//     // Check duplicate email
//     const existingStudent = await Student.findOne({ email });
//     if (existingStudent) {
//       return res.status(409).json({ message: "Email already registered" });
//     }

//     // Hash password & save
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newStudent = new Student({
//       salutation,
//       firstName,
//       lastName,
//       mobile,
//       timezone,
//       email,
//       password: hashedPassword,
//       class: studentClass,
//       group,
//       syllabus,
//       emisNumber,
//       proof,
//       approvalStatus: "Pending",
//       isActive: false,
//     });

//     await newStudent.save();

//     const customerId = newStudent._id.toString();

//     // KnowledgeAgent — insert into customers collection
//     await db.db.collection("customers").insertOne({
//       customerId,
//       name: `${firstName} ${lastName}`,
//       email,
//       role: "student",
//       createdAt: new Date(),
//     });

//     // ActionAgent
//     await ActionAgent.createTask({
//       customerId,
//       issue: "New student registration — pending admin approval",
//       status: "open",
//     });

//     // AnalyticsAgent
//     await AnalyticsAgent.logInteraction({
//       customerId,
//       message: `Student registered: ${firstName} ${lastName}`,
//       type: "registration",
//     });

//     // Activity log
//     await Activity.create({
//       type: "student",
//       message: `New student registered: ${firstName} ${lastName}`,
//       time: new Date(),
//     });

//     // Email admin (non-blocking)
//     try {
//       await transporter.sendMail({
//         from: process.env.EMAIL_USER,
//         to: process.env.ADMIN_EMAIL,
//         subject: "New Student Registration Alert",
//         html: `
//           <h2>New Student Registered</h2>
//           <p><b>Name:</b> ${firstName} ${lastName}</p>
//           <p><b>Email:</b> ${email}</p>
//           <p><b>Class:</b> ${studentClass}</p>
//           <p><b>Syllabus:</b> ${syllabus}</p>
//           <p>Status: Pending Approval</p>
//         `,
//       });
//     } catch (emailError) {
//       console.error("Email sending failed:", emailError);
//     }

//     return res.status(201).json({
//       success: true,
//       message: "✅ Registration successful. Waiting for admin approval.",
//       student: {
//         id: newStudent._id,
//         firstName: newStudent.firstName,
//         lastName: newStudent.lastName,
//         email: newStudent.email,
//         class: newStudent.class,
//         approvalStatus: newStudent.approvalStatus,
//       },
//     });

//   } catch (err) {
//     console.error("Student Registration Error:", err);
//     res.status(500).json({ message: "❌ Server error" });
//   }
// });


// /* =================================================
//    SEARCH STUDENTS BY NAME
// ================================================= */
// router.get("/search", async (req, res) => {
//   try {
//     const { name } = req.query;
//     if (!name || !name.trim()) {
//       return res.status(400).json({ message: "Search query is required" });
//     }
//     const regex = new RegExp(name.trim(), "i");
//     const students = await Student.find({
//       $or: [{ firstName: regex }, { lastName: regex }],
//       approvalStatus: "Approved",
//     })
//       .select("firstName lastName class email mobile")
//       .limit(10);
//     res.json({ success: true, students });
//   } catch (err) {
//     console.error("Student search error:", err);
//     res.status(500).json({ message: "Search failed" });
//   }
// });


// /* =================================================
//    GET ALL APPROVED STUDENTS IN A CLASS
//    Used by: Take Attendance (teacher) and
//    Check Participant Attendance (admin dashboard)
// ================================================= */
// router.get("/by-class/:class", async (req, res) => {
//   try {
//     const { class: className } = req.params;
//     if (!className || !className.trim()) {
//       return res.status(400).json({ message: "Class is required" });
//     }

//     const regex = new RegExp(`^${className.trim()}$`, "i"); // case-insensitive exact match
//     const students = await Student.find({
//       class: regex,
//       approvalStatus: "Approved",
//     })
//       .select("firstName lastName class email mobile status")
//       .sort({ firstName: 1, lastName: 1 });

//     res.json({ success: true, students });
//   } catch (err) {
//     console.error("Fetch students by class error:", err);
//     res.status(500).json({ message: "Failed to fetch students for this class" });
//   }
// });


// /* =================================================
//    ADMIN – GET ALL PENDING STUDENTS
// ================================================= */
// router.get("/admin/pending", async (req, res) => {
//   try {
//     const students = await Student.find({ approvalStatus: "Pending" })
//       .select("-password")
//       .sort({ createdAt: -1 });
//     res.json({ success: true, students });
//   } catch (err) {
//     console.error("Pending students error:", err);
//     res.status(500).json({ message: "Failed to fetch students" });
//   }
// });


// /* =================================================
//    ADMIN – APPROVE / REJECT STUDENT
// ================================================= */
// router.put("/admin/:id/approve", async (req, res) => {
//   try {
//     const { status } = req.body;
//     if (!["Approved", "Rejected"].includes(status)) {
//       return res.status(400).json({ message: "Invalid status" });
//     }
//     const student = await Student.findByIdAndUpdate(
//       req.params.id,
//       { approvalStatus: status, isActive: status === "Approved" },
//       { new: true }
//     );
//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }
//     await AnalyticsAgent.logInteraction({
//       customerId: student._id.toString(),
//       message: `Student ${student.firstName} ${student.lastName} was ${status}`,
//       type: "approval",
//     });
//     const tasks = await db.db.collection("tasks")
//       .find({ customerId: student._id.toString(), status: "open" })
//       .toArray();
//     for (const task of tasks) {
//       await ActionAgent.closeTask(task._id);
//     }
//     try {
//       await transporter.sendMail({
//         to: student.email,
//         subject: `Your Student Account is ${status}`,
//         html: `
//           <h2>Hello ${student.firstName},</h2>
//           <p>Your account has been <b>${status}</b>.</p>
//           ${status === "Approved"
//             ? "<p>You can now login and start learning 🎉</p>"
//             : "<p>Please contact admin for more details.</p>"
//           }
//         `,
//       });
//     } catch (emailError) {
//       console.error("Approval email failed:", emailError);
//     }
//     await Activity.create({
//       type: "student",
//       message: `Student ${student.firstName} ${student.lastName} was ${status}`,
//       time: new Date(),
//     });
//     res.json({
//       success: true,
//       message: `Student ${status.toLowerCase()} successfully`,
//       student,
//     });
//   } catch (err) {
//     console.error("Student approval error:", err);
//     res.status(500).json({ message: "Approval failed" });
//   }
// });


// /* =================================================
//    STUDENT DASHBOARD
// ================================================= */
// router.get("/:id/dashboard", async (req, res) => {
//   try {
//     const student = await Student.findById(req.params.id);
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     const Teacher = require("../models/Teacher");
//     const assignedTeachers = await Teacher.find({
//       classesAssigned: student.class,
//       isApproved: true,
//     }).populate("subjects", "name"); // ✅ was unpopulated — enrolledSubjects ended up
//                                        // being raw ObjectIds, which could never match
//                                        // a subject NAME string on the frontend anyway.

//     const enrolledSubjects = [];
//     assignedTeachers.forEach(t => {
//       t.subjects?.forEach(s => {
//         if (s?.name && !enrolledSubjects.includes(s.name)) enrolledSubjects.push(s.name);
//       });
//     });

//     const summary = await AnalyticsAgent.getSummary(req.params.id);

//     res.json({
//       success: true,
//       stats: {
//         enrolledSubjects: enrolledSubjects.length,
//         pendingAssignments: 0,
//         completedAssignments: 0,
//         attendance: 0,
//         lastPayment: student.status === "Paid" ? "Paid" : "Pending",
//         totalInteractions: summary.totalInteractions,
//         lastContact: summary.lastContact,
//       },
//       enrolledSubjectsList: enrolledSubjects,
//       student: {
//         id: student._id,
//         firstName: student.firstName,
//         lastName: student.lastName,
//         class: student.class,
//         approvalStatus: student.approvalStatus,
//       },
//     });
//   } catch (err) {
//     console.error("Dashboard Error:", err);
//     res.status(500).json({ message: "Failed to fetch dashboard data" });
//   }
// });


// /* =================================================
//    GET SINGLE STUDENT
// ================================================= */
// router.get("/:id", async (req, res) => {
//   try {
//     const student = await Student.findById(req.params.id).select("-password");
//     if (!student) return res.status(404).json({ message: "Student not found" });
//     res.json(student);
//   } catch (err) {
//     res.status(500).json({ message: "❌ Failed to fetch student" });
//   }
// });

// module.exports = router;
// -----------------------------------------------------------------------





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
    const proof =
      req.file?.filename;

    try {
      const validation =
        validateStudent(
          req.body,
          !!req.file
        );

      if (!validation.valid) {
        return res.status(400).json({
          message:
            "Validation failed",
          errors:
            validation.errors,
          summary:
            validation.summary,
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
          message:
            "Email already registered",
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
          password:
            hashedPassword,
          class: studentClass,
          group,
          syllabus,
          emisNumber,
          proof,
          approvalStatus:
            "Pending",
          isActive: false,
        });

      await newStudent.save();

      const customerId =
        newStudent._id.toString();

      // =================================================
      // KNOWLEDGE AGENT
      // =================================================

      await db.db
        .collection("customers")
        .insertOne({
          customerId,
          name: `${firstName} ${lastName}`,
          email,
          role: "student",
          createdAt:
            new Date(),
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
      // ANALYTICS AGENT
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
          from:
            process.env.EMAIL_USER,

          to:
            process.env.ADMIN_EMAIL,

          subject:
            "New Student Registration Alert",

          html: `
            <h2>New Student Registered</h2>

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
              Status: Pending Approval
            </p>
          `,
        });
      } catch (emailError) {
        console.error(
          "Email sending failed:",
          emailError
        );
      }

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(201).json({
        success: true,

        message:
          "✅ Registration successful. Waiting for admin approval.",

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

      res.status(500).json({
        message:
          "❌ Server error",
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
      const { status } =
        req.body;

      if (
        ![
          "Approved",
          "Rejected",
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid status",
        });
      }

      const student =
        await Student.findByIdAndUpdate(
          req.params.id,
          {
            approvalStatus:
              status,

            isActive:
              status ===
              "Approved",
          },
          {
            new: true,
          }
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found",
        });
      }

      // =================================================
      // ANALYTICS
      // =================================================

      await AnalyticsAgent.logInteraction({
        customerId:
          student._id.toString(),

        message:
          `Student ${student.firstName} ${student.lastName} was ${status}`,

        type: "approval",
      });

      // =================================================
      // CLOSE OPEN TASKS
      // =================================================

      const tasks =
        await db.db
          .collection("tasks")
          .find({
            customerId:
              student._id.toString(),

            status: "open",
          })
          .toArray();

      for (const task of tasks) {
        await ActionAgent.closeTask(
          task._id
        );
      }

      // =================================================
      // EMAIL STUDENT
      // =================================================

      try {
        await transporter.sendMail({
          to: student.email,

          subject:
            `Your Student Account is ${status}`,

          html: `
            <h2>
              Hello ${student.firstName},
            </h2>

            <p>
              Your account has been
              <b>${status}</b>.
            </p>

            ${
              status === "Approved"
                ? "<p>You can now login and start learning 🎉</p>"
                : "<p>Please contact admin for more details.</p>"
            }
          `,
        });
      } catch (emailError) {
        console.error(
          "Approval email failed:",
          emailError
        );
      }

      // =================================================
      // ACTIVITY
      // =================================================

      await Activity.create({
        type: "student",

        message:
          `Student ${student.firstName} ${student.lastName} was ${status}`,

        time: new Date(),
      });

      res.json({
        success: true,

        message:
          `Student ${status.toLowerCase()} successfully`,

        student,
      });

    } catch (err) {
      console.error(
        "Student approval error:",
        err
      );

      res.status(500).json({
        message:
          "Approval failed",
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

      // Get completed attendance
      // sessions for this student's class.

      const attendanceSessions =
        await AttendanceSession.find({
          class: student.class,
          status: "completed",
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