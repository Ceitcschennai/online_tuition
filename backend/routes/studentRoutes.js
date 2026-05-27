const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const multer = require("multer");

const Student = require("../models/Student");
const transporter = require("../config/email");
const Activity = require("../models/Activity");
const Teacher = require("../models/Teacher");

const {
  ActionAgent,
  AnalyticsAgent,
} = require("../agents/crewAgents");

const mongoose = require("mongoose");
const db = mongoose.connection;

const { protect } = require("../middleware/authMiddleware");

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =================================================
   HELPER
================================================= */
function normalizeSalutation(val) {
  if (!val) return null;
  const map = { mr: "Mr.", ms: "Ms.", mrs: "Mrs.", dr: "Dr." };
  const clean = val.toLowerCase().replace(/\.$/, "").trim();
  return map[clean] || val;
}

/* =================================================
   VALIDATE STUDENT
================================================= */
function validateStudent(body, hasFile) {
  const errors = {};
  const normalized = { ...body };

  const normSal = normalizeSalutation(body.salutation);
  const validSal = ["Mr.", "Ms.", "Mrs.", "Dr."];
  if (!normSal || !validSal.includes(normSal)) {
    errors.salutation = "Must be Mr. / Ms. / Mrs. / Dr.";
  } else {
    normalized.salutation = normSal;
  }

  const fn = (body.firstName || "").trim();
  if (fn.length < 2 || !/^[a-zA-Z]+$/.test(fn)) {
    errors.firstName = "Min 2 letters, letters only";
  } else {
    normalized.firstName = fn;
  }

  const ln = (body.lastName || "").trim();
  if (ln.length < 2 || !/^[a-zA-Z]+$/.test(ln)) {
    errors.lastName = "Min 2 letters, letters only";
  } else {
    normalized.lastName = ln;
  }

  const mob = (body.mobile || "").toString().trim();
  if (!/^[1-9]\d{9}$/.test(mob)) {
    errors.mobile = "Must be exactly 10 digits, not starting with 0";
  } else {
    normalized.mobile = mob;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const em = (body.email || "").trim().toLowerCase();
  if (!emailRegex.test(em)) {
    errors.email = "Invalid email format";
  } else {
    normalized.email = em;
  }

  const pw = body.password || "";
  if (pw.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  if (!body.timezone || body.timezone.trim() === "") {
    errors.timezone = "Timezone is required";
  } else {
    normalized.timezone = body.timezone.trim();
  }

  if (!body.syllabus || body.syllabus.trim() === "") {
    errors.syllabus = "Syllabus is required";
  } else {
    normalized.syllabus = body.syllabus.trim();
  }

  const classVal = (body.class || body.studentClass || "").toString().trim();
  if (!classVal) {
    errors.class = "Class is required";
  } else {
    normalized.class = classVal;
  }

  const emis = (body.emisNumber || "").toString().trim();
  if (emis.length < 4) {
    errors.emisNumber = "Minimum 4 characters";
  } else {
    normalized.emisNumber = emis;
  }

  // ✅ PAN validation
  const pan = (body.panNumber || "").toString().trim().toUpperCase();
  if (!pan) {
    errors.panNumber = "PAN number is required";
  } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
    errors.panNumber = "Invalid PAN format (e.g. ABCDE1234F)";
  } else {
    normalized.panNumber = pan;
  }

  if (!hasFile) {
    errors._file = "ID Proof is required";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid, errors, normalized,
    summary: valid ? "All valid" : `Failed: ${Object.keys(errors).join(", ")}`,
  };
}

/* =================================================
   GET FULL STUDENT PROFILE
   GET /api/student/:id/profile
================================================= */
router.get("/:id/profile", protect, async (req, res) => {
  try {
    const requestedId     = req.params.id;
    const authenticatedId = req.user._id.toString();
    const userRole        = req.user.role;

    if (userRole === "student" && requestedId !== authenticatedId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own profile.",
      });
    }

    const student = await Student.findById(requestedId).select("-password");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    return res.status(200).json({
      success: true,
      student: student.toObject(),
    });

  } catch (err) {
    console.error("❌ Student profile fetch error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/* =================================================
   STUDENT REGISTER
   POST /api/student/register
================================================= */
router.post("/register", upload.single("proof"), async (req, res) => {
  try {
    // ── STEP 1: Log raw body to see what frontend is sending ──
    console.log("─────────────────────────────────────");
    console.log("📥 RAW BODY:", JSON.stringify(req.body, null, 2));
    console.log("📎 FILE:", req.file ? "✅ received" : "❌ missing");
    console.log("🔍 panNumber in body:", req.body.panNumber || "(MISSING)");
    console.log("─────────────────────────────────────");

    const validation = validateStudent(req.body, !!req.file);

    // ── STEP 2: Log validation result ──
    console.log("✅ VALIDATION RESULT:", JSON.stringify({
      valid: validation.valid,
      errors: validation.errors,
      panNumber: validation.normalized.panNumber || "(MISSING after validation)",
    }, null, 2));

    if (!validation.valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
        summary: validation.summary,
      });
    }

    const {
      salutation, firstName, lastName, mobile, timezone,
      email, password, class: studentClass, syllabus,
      emisNumber, panNumber,
    } = validation.normalized;

    // ── STEP 3: Log what will be saved ──
    console.log("💾 ABOUT TO SAVE:", {
      firstName, lastName, email,
      panNumber: panNumber || "(MISSING — will not save)",
      emisNumber,
    });

    const { group } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let proofData = null;
    if (req.file) {
      proofData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const newStudent = new Student({
      salutation, firstName, lastName, mobile, timezone,
      email, password: hashedPassword,
      class: studentClass, group, syllabus,
      emisNumber,
      panNumber,
      proof: proofData,
      approvalStatus: "Pending",
      isActive: false,
    });

    await newStudent.save();

    // ── STEP 4: Confirm what was actually saved ──
    console.log("✅ SAVED TO DB:", {
      id: newStudent._id,
      email: newStudent.email,
      panNumber: newStudent.panNumber || "(EMPTY — not saved!)",
      emisNumber: newStudent.emisNumber,
    });

    const customerId = newStudent._id.toString();

    await db.db.collection("customers").insertOne({
      customerId,
      name: `${firstName} ${lastName}`,
      email,
      role: "student",
      createdAt: new Date(),
    });

    await ActionAgent.createTask({
      customerId,
      issue: "New student registration — pending admin approval",
      status: "open",
    });

    await AnalyticsAgent.logInteraction({
      customerId,
      message: `Student registered: ${firstName} ${lastName}`,
      type: "registration",
    });

    await Activity.create({
      type: "student",
      message: `New student registered: ${firstName} ${lastName}`,
      time: new Date(),
    });

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
          <p><b>PAN:</b> ${panNumber}</p>
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
        id:             newStudent._id,
        firstName:      newStudent.firstName,
        lastName:       newStudent.lastName,
        email:          newStudent.email,
        class:          newStudent.class,
        panNumber:      newStudent.panNumber,
        emisNumber:     newStudent.emisNumber,
        approvalStatus: newStudent.approvalStatus,
      },
    });

  } catch (err) {
    console.error("❌ Student Registration Error:", err);
    res.status(500).json({
      success: false,
      message: "❌ Server error: " + err.message,
    });
  }
});

module.exports = router;