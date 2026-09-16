const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const PasswordReset = require("../models/PasswordReset");
const sendOTPEmail = require("../utils/mailer");

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

/* =========================
   SEND PASSWORD RESET OTP
========================= */
router.post("/forgot-password/send-otp", async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        message: "Email and role are required"
      });
    }

    const emailLower = email.toLowerCase().trim();

    let user;

    if (role === "student") {
      user = await Student.findOne({ email: emailLower });

      if (!user) {
        return res.status(404).json({
          message: "Student not found"
        });
      }

      if (user.approvalStatus !== "Approved") {
        return res.status(403).json({
          message: "Student account is not approved"
        });
      }
    } else if (role === "teacher") {
      user = await Teacher.findOne({ email: emailLower });

      if (!user) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      if (!user.isApproved) {
        return res.status(403).json({
          message: "Teacher account is not approved"
        });
      }
    } else {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.deleteMany({
      email: emailLower,
      role
    });

    await PasswordReset.create({
      email: emailLower,
      role,
      otp,
      expiresAt
    });

    await sendOTPEmail(emailLower, otp);

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);

    res.status(500).json({
      message: "Unable to send OTP"
    });
  }
});

/* =========================
   VERIFY PASSWORD RESET OTP
========================= */
router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { email, role, otp } = req.body;

    if (!email || !role || !otp) {
      return res.status(400).json({
        message: "Email, role, and OTP are required"
      });
    }

    const emailLower = email.toLowerCase().trim();

    const resetRequest = await PasswordReset.findOne({
      email: emailLower,
      role
    });

    if (!resetRequest) {
      return res.status(404).json({
        message: "OTP not found or expired"
      });
    }

    if (resetRequest.expiresAt < new Date()) {
      await PasswordReset.deleteOne({
        _id: resetRequest._id
      });

      return res.status(400).json({
        message: "OTP has expired"
      });
    }

    if (resetRequest.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    resetRequest.verified = true;
    await resetRequest.save();

    res.json({
      success: true,
      message: "OTP verified successfully"
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);

    res.status(500).json({
      message: "Unable to verify OTP"
    });
  }
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/forgot-password/reset-password", async (req, res) => {
  try {
    const { email, role, newPassword } = req.body;

    if (!email || !role || !newPassword) {
      return res.status(400).json({
        message: "Email, role, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const emailLower = email.toLowerCase().trim();

    const resetRequest = await PasswordReset.findOne({
      email: emailLower,
      role,
      verified: true
    });

    if (!resetRequest) {
      return res.status(400).json({
        message: "Please verify the OTP first"
      });
    }

    if (resetRequest.expiresAt < new Date()) {
      await PasswordReset.deleteOne({
        _id: resetRequest._id
      });

      return res.status(400).json({
        message: "Password reset session has expired"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (role === "student") {
      const student = await Student.findOne({
        email: emailLower
      });

      if (!student) {
        return res.status(404).json({
          message: "Student not found"
        });
      }

      student.password = hashedPassword;
      await student.save();

    } else if (role === "teacher") {
      const teacher = await Teacher.findOne({
        email: emailLower
      });

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found"
        });
      }

      teacher.password = hashedPassword;
      await teacher.save();

    } else {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    await PasswordReset.deleteOne({
      _id: resetRequest._id
    });

    res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    res.status(500).json({
      message: "Unable to reset password"
    });
  }
});

module.exports = router;
