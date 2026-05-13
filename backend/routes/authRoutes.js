const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

/* =========================
   LOGIN (ADMIN / TEACHER / STUDENT)
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password, and role required"
      });
    }

    const emailLower = email.toLowerCase();

    /* =========================
       ✅ HARDCODED ADMIN LOGIN
    ========================= */
    if (role === "admin") {
      if (
        emailLower === "poojagokulan2306@gmail.com" &&
        password === "Pooja@2306"
      ) {
        const token = jwt.sign(
          { role: "admin", email: emailLower },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          success: true,
          token,
          role: "admin",
          user: {
            email: emailLower,
            role: "admin"
          }
        });
      }

      return res.status(401).json({ message: "Admin not found" });
    }

    /* =========================
       👩‍🎓 STUDENT LOGIN
    ========================= */
    if (role === "student") {
      const user = await Student.findOne({ email: emailLower });
      if (!user) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (user.approvalStatus !== "Approved") {
        return res.status(403).json({
          message: "Student account pending admin approval"
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user._id, role: "student" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const userObj = user.toObject();
      delete userObj.password;

      return res.json({
        success: true,
        token,
        role: "student",
        user: userObj
      });
    }

    /* =========================
       👨‍🏫 TEACHER LOGIN
    ========================= */
    if (role === "teacher") {
      const user = await Teacher.findOne({ email: emailLower });
      if (!user) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (!user.isApproved) {
        return res.status(403).json({
          message: "Teacher account pending admin approval"
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user._id, role: "teacher" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const userObj = user.toObject();
      delete userObj.password;

      return res.json({
        success: true,
        token,
        role: "teacher",
        user: userObj
      });
    }

    return res.status(400).json({ message: "Invalid role" });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
