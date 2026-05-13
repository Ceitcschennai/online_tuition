const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const multer = require("multer");

const Student = require("../models/Student");
// const upload = require("../middleware/upload"); // REMOVED - using local config like teacherRoutes
const transporter = require("../config/email");
const Activity = require("../models/Activity");

const {
  ActionAgent,
  AnalyticsAgent,
  KnowledgeAgent,
} = require("../agents/crewAgents");

const mongoose = require("mongoose");
const db = mongoose.connection;

/* =========================
   MULTER CONFIG - MEMORY STORAGE FOR VERCEL
======================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =================================================
   HELPER — local validation (no API needed)
=============================================== */
function normalizeSalutation(val) {
  if (!val) return null;
  const map = { mr: "Mr.", ms: "Ms.", mrs: "Mrs.", dr: "Dr." };
  const clean = val.toLowerCase().replace(/\.$/, "").trim();
  return map[clean] || val;
}

function validateStudent(body, hasFile) {
  const errors = {};
  const normalized = { ...body };

  // salutation
  const normSal = normalizeSalutation(body.salutation);
  const validSal = ["Mr.", "Ms.", "Mrs.", "Dr."];
  if (!normSal || !validSal.includes(normSal)) {
    errors.salutation = "Must be Mr. / Ms. / Mrs. / Dr.";
  } else {
    normalized.salutation = normSal;
  }

  // firstName
  const fn = (body.firstName || "").trim();
  if (fn.length < 2 || !/^[a-zA-Z]+$/.test(fn)) {
    errors.firstName = "Min 2 letters, letters only";
  } else {
    normalized.firstName = fn;
  }

  // lastName
  const ln = (body.lastName || "").trim();
  if (ln.length < 2 || !/^[a-zA-Z]+$/.test(ln)) {
    errors.lastName = "Min 2 letters, letters only";
  } else {
    normalized.lastName = ln;
  }

  // mobile
  const mob = (body.mobile || "").toString().trim();
  if (!/^[1-9]\d{9}$/.test(mob)) {
    errors.mobile = "Must be exactly 10 digits, not starting with 0";
  } else {
    normalized.mobile = mob;
  }

  // email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const em = (body.email || "").trim().toLowerCase();
  if (!emailRegex.test(em)) {
    errors.email = "Invalid email format";
  } else {
    normalized.email = em;
  }

  // password — min 8 chars only
  const pw = body.password || "";
  if (pw.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  // timezone — accept any non-empty value
  if (!body.timezone || body.timezone.trim() === "") {
    errors.timezone = "Timezone is required";
  } else {
    normalized.timezone = body.timezone.trim();
  }

  // syllabus — accept any non-empty value
  if (!body.syllabus || body.syllabus.trim() === "") {
    errors.syllabus = "Syllabus is required";
  } else {
    normalized.syllabus = body.syllabus.trim();
  }

  // class — accept any non-empty value
  const classVal = (body.class || body.studentClass || "").toString().trim();
  if (!classVal) {
    errors.class = "Class is required";
  } else {
    normalized.class = classVal;
  }

  // emisNumber — min 4 chars
  const emis = (body.emisNumber || "").toString().trim();
  if (emis.length < 4) {
    errors.emisNumber = "Minimum 4 characters";
  } else {
    normalized.emisNumber = emis;
  }

  // file
  if (!hasFile) {
    errors._file = "ID Proof is required";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    normalized,
    summary: valid ? "All valid" : `Failed: ${Object.keys(errors).join(", ")}`,
  };
}

/* =================================================
   STUDENT REGISTER
=============================================== */
router.post("/register", upload.single("proof"), async (req, res) => {
  try {
    console.log("📥 STUDENT REGISTER BODY:", JSON.stringify(req.body, null, 2));
    console.log("📎 FILE:", req.file ? "File received" : "NO FILE");

    const validation = validateStudent(req.body, !!req.file);
    console.log("✅ VALIDATION:", JSON.stringify(validation, null, 2));

    if (!validation.valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
        summary: validation.summary,
      });
    }

    const {
      salutation, firstName, lastName, mobile, timezone,
      email, password, class: studentClass, syllabus, emisNumber,
    } = validation.normalized;

    const { group } = req.body;

    // Check duplicate email
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password & save
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle file upload for Vercel (store as base64 or handle appropriately)
    let proofData = null;
    if (req.file) {
      // For Vercel serverless, we might want to store file differently or skip file storage
      // For now, let's store as base64 similar to teacher registration
      proofData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const newStudent = new Student({
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
      proof: proofData, // Store as base64 or null
      approvalStatus: "Pending",
      isActive: false,
    });

    await newStudent.save();

    const customerId = newStudent._id.toString();

    // KnowledgeAgent — insert into customers collection
    await db.db.collection("customers").insertOne({
      customerId,
      name: `${firstName} ${lastName}`,
      email,
      role: "student",
      createdAt: new Date(),
    });

    // ActionAgent
    await ActionAgent.createTask({
      customerId,
      issue: "New student registration — pending admin approval",
      status: "open",
    });

    // AnalyticsAgent
    await AnalyticsAgent.logInteraction({
      customerId,
      message: `Student registered: ${firstName} ${lastName}`,
      type: "registration",
    });

    // Activity log
    await Activity.create({
      type: "student",
      message: `New student registered: ${firstName} ${lastName}`,
      time: new Date(),
    });

    // Email admin (non-blocking)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "New Student Registration Alert",
        html: `
          <h2>New Student Registered</h2>
          <p><b>Name:</b> ${firstName} ${lastName}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Class:</b> ${studentClass}</p>
          <p><b>Syllabus:</b> ${syllabus}</p>
          <p>Status: Pending Approval</p>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "✅ Registration successful. Waiting for admin approval.",
      student: {
        id: newStudent._id,
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        email: newStudent.email,
        class: newStudent.class,
        approvalStatus: newStudent.approvalStatus,
      },
    });

  } catch (err) {
    console.error("Student Registration Error:", err);
    res.status(500).json({
      success: false,
      message: "❌ Server error: " + err.message
    });
  }
});

/* =================================================
   SEARCH STUDENTS BY NAME
=============================================== */
router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const regex = new RegExp(name.trim(), "i");
    const students = await Student.find({
      $or: [{ firstName: regex }, { lastName: regex }],
      approvalStatus: "Approved",
    })
      .select("firstName lastName studentClass email mobile")
      .limit(10);
    res.json({ success: true, students });
  } catch (err) {
    console.error("Student search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

/* =================================================
   ADMIN – GET ALL PENDING STUDENTS
=============================================== */
router.get("/admin/pending", async (req, res) => {
  try {
    const students = await Student.find({ approvalStatus: "Pending" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    console.error("Pending students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

/* =================================================
   ADMIN – APPROVE / REJECT STUDENT
=============================================== */
router.put("/admin/:id/approve", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: status, isActive: status === "Approved" },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    await AnalyticsAgent.logInteraction({
      customerId: student._id.toString(),
      message: `Student ${student.firstName} ${student.lastName} was ${status}`,
      type: "approval",
    });
    const tasks = await db.db.collection("tasks")
      .find({ customerId: student._id.toString(), status: "open" })
      .toArray();
    for (const task of tasks) {
      await ActionAgent.closeTask(task._id);
    }
    try {
      await transporter.sendMail({
        to: student.email,
        subject: `Your Student Account is ${status}`,
        html: `
          <h2>Hello ${student.firstName},</h2>
          <p>Your account has been <b>${status}</b>.</p>
          ${status === "Approved"
            ? "<p>You can now login and start learning 🎉</p>"
            : "<p>Please contact admin for more details.</p>"
          }
        `,
      });
    } catch (emailError) {
      console.error("Approval email failed:", emailError);
    }
    await Activity.create({
      type: "student",
      message: `Student ${student.firstName} ${student.lastName} was ${status}`,
      time: new Date(),
    });
    res.json({
      success: true,
      message: `Student ${status.toLowerCase()} successfully`,
      student,
    });
  } catch (err) {
    console.error("Student approval error:", err);
    res.status(500).json({ message: "Approval failed" });
  }
});

/* =================================================
   STUDENT DASHBOARD
=============================================== */
router.get("/:id/dashboard", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const Teacher = require("../models/Teacher");
    const assignedTeachers = await Teacher.find({
      classesAssigned: student.class,
      isApproved: true,
    });

    const enrolledSubjects = [];
    assignedTeachers.forEach(t => {
      t.subjects?.forEach(s => {
        if (!enrolledSubjects.includes(s)) enrolledSubjects.push(s);
      });
    });

    const summary = await AnalyticsAgent.getSummary(req.params.id);

    res.json({
      success: true,
      stats: {
        enrolledSubjects: enrolledSubjects.length,
        pendingAssignments: 0,
        completedAssignments: 0,
        attendance: 0,
        lastPayment: student.status === "Paid" ? "Paid" : "Pending",
        totalInteractions: summary.totalInteractions,
        lastContact: summary.lastContact,
      },
      enrolledSubjectsList: enrolledSubjects,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        class: student.class,
        approvalStatus: student.approvalStatus,
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

/* =================================================
   GET SINGLE STUDENT
=============================================== */
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("-password");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "❌ Failed to fetch student" });
  }
});

module.exports = router;