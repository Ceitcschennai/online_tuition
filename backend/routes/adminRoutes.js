const express = require("express");
const router = express.Router();

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const Activity = require("../models/Activity");
const transporter = require("../config/email");

/* =====================================================
   SAFE EMAIL FUNCTION
===================================================== */
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Online Tuition" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("📧 Email sent to:", to);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
};

/* =====================================================
   DASHBOARD STATS
===================================================== */
router.get("/dashboard", async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalSubjects = await Subject.countDocuments();

    const approvedTeachers = await Teacher.countDocuments({ isApproved: true });
    const pendingTeachers = await Teacher.countDocuments({
      isApproved: false,
      isRejected: false,
    });

    res.json({
      success: true,
      stats: {
        totalTeachers,
        totalStudents,
        totalSubjects,
        approvedTeachers,
        pendingTeachers,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Dashboard fetch failed" });
  }
});

/* =====================================================
   STUDENT STATS
===================================================== */
router.get("/students/stats", async (req, res) => {
  try {
    const total = await Student.countDocuments();
    const approved = await Student.countDocuments({ approvalStatus: "Approved" });
    const pending = await Student.countDocuments({ approvalStatus: "Pending" });
    const rejected = await Student.countDocuments({ approvalStatus: "Rejected" });
    const paid = await Student.countDocuments({ status: "Paid" });

    res.json({
      success: true,
      stats: { total, approved, pending, rejected, paid },
    });
  } catch (err) {
    console.error("Student stats error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

/* =====================================================
   GET STUDENTS (SEARCH + FILTER)
===================================================== */
router.get("/students", async (req, res) => {
  try {
    const { search = "", filter = "all" } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { class: { $regex: search, $options: "i" } },
        { emisNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "approved") query.approvalStatus = "Approved";
    if (filter === "pending") query.approvalStatus = "Pending";
    if (filter === "rejected") query.approvalStatus = "Rejected";
    if (filter === "paid") query.status = "Paid";
    if (filter === "unpaid") query.status = "Unpaid";

    const students = await Student.find(query).sort({ createdAt: -1 });

    res.json({ success: true, students });
  } catch (err) {
    console.error("Student fetch error:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

/* =====================================================
   APPROVE / REJECT STUDENT
===================================================== */
router.put("/students/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.approvalStatus = status;
    await student.save();

    await sendEmail(
      student.email,
      `Admission ${status}`,
      `Hello ${student.firstName},\n\nYour admission has been ${status}.`
    );

    await Activity.create({
      message: `Student ${student.firstName} ${status}`,
      time: new Date(),
    });

    res.json({ success: true, student });
  } catch (err) {
    console.error("Student status error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* =====================================================
   TOGGLE STUDENT PAYMENT
===================================================== */
router.put("/students/:id/payment", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.status = student.status === "Paid" ? "Unpaid" : "Paid";
    await student.save();

    res.json({ success: true, student });
  } catch (err) {
    console.error("Payment update error:", err);
    res.status(500).json({ success: false, message: "Payment update failed" });
  }
});

/* =====================================================
   GET TEACHERS (SEARCH + FILTER + STATS)
===================================================== */
router.get("/teachers", async (req, res) => {
  try {
    const { search = "", filter = "all" } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "approved") query.isApproved = true;
    if (filter === "rejected") query.isRejected = true;
    if (filter === "pending") {
      query.isApproved = false;
      query.isRejected = false;
    }

    const teachers = await Teacher.find(query).sort({ createdAt: -1 });

    const total = await Teacher.countDocuments();
    const approved = await Teacher.countDocuments({ isApproved: true });
    const rejected = await Teacher.countDocuments({ isRejected: true });
    const pending = await Teacher.countDocuments({
      isApproved: false,
      isRejected: false,
    });

    const assigned = await Teacher.countDocuments({
      classAssigned: { $exists: true, $ne: null },
    });

    res.json({
      success: true,
      teachers,
      stats: { total, approved, pending, rejected, assigned },
    });
  } catch (error) {
    console.error("Teacher fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch teachers" });
  }
});

/* =====================================================
   APPROVE / REJECT TEACHER
===================================================== */
router.put("/teachers/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (status === "Approved") {
      teacher.isApproved = true;
      teacher.isRejected = false;
    }

    if (status === "Rejected") {
      teacher.isApproved = false;
      teacher.isRejected = true;
    }

    await teacher.save();

    res.json({
      success: true,
      message: `Teacher ${status} successfully`,
      teacher,
    });
  } catch (error) {
    console.error("Teacher status error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* =====================================================
   DELETE TEACHER
===================================================== */
router.delete("/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Delete teacher error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

module.exports = router;