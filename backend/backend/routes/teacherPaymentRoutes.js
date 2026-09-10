const express = require("express");
const router = express.Router();

const TeacherPayment = require("../models/TeacherPayment");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const Student = require("../models/Student");


// Get current month in "YYYY-MM"
const getPaymentMonth = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const getTeacherStudentCount = async (teacherId) => {
  // Find all active subjects assigned to this teacher
  const subjects = await Subject.find({
    teacher: teacherId,
    isActive: true
  }).select("classes");

  // Collect unique classes
  const teacherClasses = [
    ...new Set(
      subjects.flatMap((subject) =>
        Array.isArray(subject.classes)
          ? subject.classes
          : []
      )
    )
  ];

  // No classes assigned
  if (teacherClasses.length === 0) {
    return {
      totalStudentCount: 0,
      classBreakdown: []
    };
  }

  // Find active + approved students
  const students = await Student.find({
    class: { $in: teacherClasses },
    approvalStatus: "Approved",
    isActive: true
  }).select("class");

  // Count students class by class
  const classCounts = {};

  students.forEach((student) => {
    const className = student.class;

    if (!classCounts[className]) {
      classCounts[className] = 0;
    }

    classCounts[className]++;
  });

  const classBreakdown = Object.entries(classCounts)
    .map(([className, studentCount]) => ({
      className,
      studentCount
    }))
    .sort((a, b) =>
      a.className.localeCompare(b.className, undefined, {
        numeric: true
      })
    );

  return {
    totalStudentCount: students.length,
    classBreakdown
  };
};


// Get teacher's current payment
router.get("/teacher/:teacherId/current", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const paymentMonth = getPaymentMonth();

    const studentData = await getTeacherStudentCount(teacherId);

const studentCount = studentData.totalStudentCount;
const classBreakdown = studentData.classBreakdown;

const ratePerStudent = 1500;
const calculatedAmount = studentCount * ratePerStudent;

    

    const payment = await TeacherPayment.findOne({
      teacher: teacherId,
      paymentMonth
    });

    if (!payment) {
  return res.status(200).json({
    success: true,
    payment: {
      teacher: teacherId,
      paymentMonth,
      studentCount,
      classBreakdown,
      ratePerStudent,
      calculatedAmount,
      status: "Pending",
      paymentDate: null,
      paymentMethod: "",
      transactionReference: "",
      notes: ""
    }
  });
}

    if (!payment) {
      return res.status(200).json({
        success: true,
        payment: null
      });
    }

    return res.status(200).json({
      success: true,
      payment
    });

  } catch (error) {
    console.error("Get current teacher payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher payment"
    });
  }
});


// Get teacher payment history
router.get("/teacher/:teacherId/history", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const payments = await TeacherPayment.find({
      teacher: teacherId
    })
      .sort({ paymentMonth: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      payments
    });

  } catch (error) {
    console.error("Get teacher payment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher payment history"
    });
  }
});


module.exports = router;