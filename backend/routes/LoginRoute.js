const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

// 🔥 CONSTANT SUPER ADMIN
const CONSTANT_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || "admin@onlinetuition.com",
  password: process.env.SUPER_ADMIN_PASSWORD || "admin123"
};

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    const emailLower = email.toLowerCase();

    // =====================
    // SUPER ADMIN LOGIN ONLY
    // =====================
    if (role === "admin") {
      if (
        emailLower === CONSTANT_ADMIN.email.toLowerCase() &&
        password === CONSTANT_ADMIN.password
      ) {
        const token = jwt.sign(
          { id: "super-admin", role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          success: true,
          token,
          role: "admin",
          user: {
            _id: "super-admin",
            email: CONSTANT_ADMIN.email,
            instituteName: "Super Admin"
          }
        });
      } else {
        // ❌ Deny any other admin login
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
    }

    // =====================
    // STUDENT & TEACHER LOGIN
    // =====================
    let user;
    if (role === "student") {
      user = await Student.findOne({ email: emailLower });
    } else if (role === "teacher") {
      user = await Teacher.findOne({ email: emailLower });
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Approval checks
    if (role === "teacher" && !user.isApproved) {
      return res.status(403).json({ message: "Teacher account pending admin approval" });
    }

    if (role === "student" && user.approvalStatus !== "Approved") {
      return res.status(403).json({ message: "Student account pending admin approval" });
    }

    // 🔐 Generate JWT
    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      token,
      role,
      user: userObj
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
