const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");

const ClassSession = require("../models/ClassSession");
const Teacher = require("../models/Teacher");
const Activity = require("../models/Activity");
const Subject = require("../models/Subject");
const transporter = require("../config/email");

const {
  ActionAgent,
  AnalyticsAgent,
  KnowledgeAgent,
} = require("../agents/crewAgents");

const mongoose = require("mongoose");
const db = mongoose.connection;

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =================================================
   HELPER — local validation for teacher
================================================= */
function normalizeSalutation(val) {
  if (!val) return null;
  const map = { mr: "Mr.", ms: "Ms.", mrs: "Mrs.", dr: "Dr." };
  const clean = val.toLowerCase().replace(/\.$/, "").trim();
  return map[clean] || val;
}

function validateTeacher(body) {
  const errors = {};
  const normalized = { ...body };

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

  // email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const em = (body.email || "").trim().toLowerCase();
  if (!emailRegex.test(em)) {
    errors.email = "Invalid email format";
  } else {
    normalized.email = em;
  }

  // password — min 8 chars
  const pw = body.password || "";
  if (pw.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  // mobile
  const mob = (body.mobile || "").toString().trim();
  if (!/^[1-9]\d{9}$/.test(mob)) {
    errors.mobile = "Must be exactly 10 digits, not starting with 0";
  } else {
    normalized.mobile = mob;
  }

  // timezone — accept any non-empty value
  if (!body.timezone || body.timezone.trim() === "") {
    errors.timezone = "Timezone is required";
  } else {
    normalized.timezone = body.timezone.trim();
  }

  // qualification — accept any non-empty value
  if (!body.qualification || body.qualification.trim() === "") {
    errors.qualification = "Qualification is required";
  } else {
    normalized.qualification = body.qualification.trim();
  }

  // preferredSubject — accept any non-empty value
  if (!body.preferredSubject || body.preferredSubject.toString().trim() === "") {
    errors.preferredSubject = "Preferred subject is required";
  } else {
    normalized.preferredSubject = body.preferredSubject.toString().trim();
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
   TEACHER REGISTER
================================================= */
router.post("/register", upload.single("degreeCertificate"), async (req, res) => {
  try {
    console.log("📥 TEACHER REGISTER BODY:", JSON.stringify(req.body, null, 2));
    console.log("📎 FILE:", req.file ? "File received" : "NO FILE");

    const validation = validateTeacher(req.body);
    console.log("✅ VALIDATION:", JSON.stringify(validation, null, 2));

    if (!validation.valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
        summary: validation.summary,
      });
    }

    const {
      firstName, lastName, email, password,
      qualification, mobile, timezone, preferredSubject,
    } = validation.normalized;

    // Check duplicate email
    const exists = await Teacher.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: "Teacher already exists" });
    }

    // Build file data & hash password
    const fileData = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Save teacher
    const teacher = new Teacher({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      qualification,
      mobile,
      timezone,
      preferredSubject,
      degreeCertificate: fileData,
      isApproved: false,
    });

    await teacher.save();

    const customerId = teacher._id.toString();

    // KnowledgeAgent — insert into customers collection
    await db.db.collection("customers").insertOne({
      customerId,
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      role: "teacher",
      createdAt: new Date(),
    });

    // Link teacher to subject
    if (preferredSubject) {
      try {
        await Subject.findByIdAndUpdate(preferredSubject, {
          teacher: teacher._id,
        });
      } catch (err) {
        console.error("Subject update error:", err);
      }
    }

    // ActionAgent
    await ActionAgent.createTask({
      customerId,
      issue: "New teacher registration — pending admin approval",
      status: "open",
    });

    // AnalyticsAgent
    await AnalyticsAgent.logInteraction({
      customerId,
      message: `Teacher registered: ${firstName} ${lastName}`,
      type: "registration",
    });

    // Activity log
    await Activity.create({
      type: "teacher",
      message: `New teacher registered: ${teacher.firstName} ${teacher.lastName}`,
      time: new Date(),
    });

    // Email admin (non-blocking)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "New Teacher Registration",
        html: `
          <h2>New Teacher Registered</h2>
          <p><b>Name:</b> ${firstName} ${lastName}</p>
          <p><b>Email:</b> ${email}</p>
          <p>Status: Pending Approval</p>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Teacher registered successfully. Waiting for admin approval.",
    });

  } catch (err) {
    console.error("TEACHER REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/* =========================
   GET PENDING TEACHERS
========================= */
router.get("/admin/pending", async (req, res) => {
  try {
    const teachers = await Teacher.find({ isApproved: false });
    res.json({ teachers });
  } catch (err) {
    console.error("Fetch pending teachers error:", err);
    res.status(500).json({ message: "Failed to fetch pending teachers" });
  }
});


/* =========================
   GET APPROVED TEACHERS
========================= */
router.get("/", async (req, res) => {
  try {
    const teachers = await Teacher.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json({ teachers });
  } catch (err) {
    console.error("Fetch teachers error:", err);
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});


/* =========================
   APPROVE / REJECT TEACHER
========================= */
router.put("/admin/teacher/:id/approve", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { isApproved: status === "Approved", approvalStatus: status },
      { new: true }
    );
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    await AnalyticsAgent.logInteraction({
      customerId: teacher._id.toString(),
      message: `Teacher ${teacher.firstName} ${teacher.lastName} was ${status}`,
      type: "approval",
    });
    const tasks = await db.db.collection("tasks")
      .find({ customerId: teacher._id.toString(), status: "open" })
      .toArray();
    for (const task of tasks) {
      await ActionAgent.closeTask(task._id);
    }
    try {
      await transporter.sendMail({
        to: teacher.email,
        subject: `Your Teacher Account is ${status}`,
        html: `
          <h2>Hello ${teacher.firstName},</h2>
          <p>Your teacher account has been <b>${status}</b>.</p>
          ${status === "Approved"
            ? "<p>You can now login and start teaching 👨‍🏫</p>"
            : "<p>Please contact admin for more details.</p>"
          }
        `,
      });
    } catch (emailError) {
      console.error("Approval email failed:", emailError);
    }
    await Activity.create({
      type: "teacher",
      message: `Teacher ${teacher.firstName} ${teacher.lastName} was ${status}`,
      time: new Date(),
    });
    res.json({
      success: true,
      message: `Teacher ${status.toLowerCase()} successfully`,
      teacher,
    });
  } catch (err) {
    console.error("Teacher approval error:", err);
    res.status(500).json({ message: "Approval failed" });
  }
});


/* =========================
   TEACHER DASHBOARD
========================= */
router.get("/dashboard/stats/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId).populate("subjects", "name");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const summary = await AnalyticsAgent.getSummary(teacherId);
    const recentActivities = await Activity.find({ type: "teacher" })
      .sort({ time: -1 })
      .limit(5);
    res.json({
      stats: {
        totalStudents: 0,
        assignmentsToReview: 0,
        pendingQueries: 0,
        attendanceRate: 85,
        totalInteractions: summary.totalInteractions,
        lastContact: summary.lastContact,
      },
      teacherInfo: {
        name: teacher.firstName + " " + teacher.lastName,
        classes: teacher.classesAssigned || [],
        subjects: teacher.subjects.map(s => s.name),
      },
      recentActivities,
    });
  } catch (err) {
    console.error("Teacher dashboard error:", err);
    res.status(500).json({ message: "Dashboard fetch failed" });
  }
});


/* =========================
   GET TEACHER SUBJECTS
========================= */
router.get("/subjects/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId)
      .populate("subjects", "name category classes");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    if (!teacher.isApproved) return res.status(403).json({ message: "Account not approved yet" });
    res.json({ success: true, subjects: teacher.subjects || [] });
  } catch (err) {
    console.error("Fetch subjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/* =========================
   CREATE CLASS SESSION
========================= */
router.post("/create-class", async (req, res) => {
  try {
    const { teacherId, subjectId, title, description, meetLink, classDate, durationMinutes } = req.body;
    if (!teacherId || !subjectId || !title || !meetLink || !classDate) {
      return res.status(400).json({ success: false, message: "All required fields must be provided" });
    }
    const session = await ClassSession.create({
      teacher: teacherId,
      subject: subjectId,
      title, description, meetLink, classDate, durationMinutes,
    });
    await ActionAgent.createTask({
      customerId: teacherId,
      issue: `Class session created: ${title}`,
      status: "open",
    });
    await AnalyticsAgent.logInteraction({
      customerId: teacherId,
      message: `Teacher created class session: ${title}`,
      type: "class_creation",
    });
    res.status(201).json({ success: true, message: "Class session created successfully", session });
  } catch (err) {
    console.error("Create class error:", err);
    res.status(500).json({ message: "Failed to create class" });
  }
});


/* =========================
   MY CLASSES
========================= */
router.get("/my-classes/:teacherId", async (req, res) => {
  try {
    const sessions = await ClassSession.find({ teacher: req.params.teacherId })
      .populate("subject", "name")
      .sort({ classDate: 1 });
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Fetch classes error:", err);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});


/* =========================
   STUDENT CLASSES
========================= */
router.get("/student/classes", async (req, res) => {
  try {
    const sessions = await ClassSession.find({ isActive: true })
      .populate("subject", "name")
      .populate("teacher", "firstName lastName")
      .sort({ classDate: 1 });
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Student classes error:", err);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

module.exports = router;