const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    let user;

    /* =========================
       ROLE BASED LOOKUP
    ========================= */
    if (role === "admin") {
      user = await Admin.findOne({ email: email.toLowerCase() });
    } 
    else if (role === "teacher") {
      user = await Teacher.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (!user.isApproved) {
        return res.status(403).json({
          message: "Your account is not approved yet. Please wait for admin approval."
        });
      }
    } 
    else if (role === "student") {
      user = await Student.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (user.approvalStatus !== "Approved") {
        return res.status(403).json({
          message: "Your admission is not approved yet. Please wait for admin approval."
        });
      }
    } 
    else {
      return res.status(400).json({ message: "Invalid role" });
    }

    /* =========================
       PASSWORD CHECK
    ========================= */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    /* =========================
       JWT
    ========================= */
    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
