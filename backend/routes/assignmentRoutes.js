const express = require("express");
const router = express.Router();
const Assignment = require("../models/Assignment");

//////////////////////////////////////////////////////////
// CREATE ASSIGNMENT
//////////////////////////////////////////////////////////

router.post("/", async (req, res) => {
  try {

    const {
      class: studentClass,
      subject,
      title,
      dueDate,
      priority,
      description,
      teacherId,
      teacherName,
    } = req.body;

    if (!studentClass || !subject || !title || !dueDate || !teacherId) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const assignment = new Assignment({
      class: studentClass,
      subject,
      title,
      dueDate,
      priority,
      description,
      teacherId,
      teacherName,
    });

    await assignment.save();

    res.json({
      success: true,
      message: "Assignment created",
      assignment,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

//////////////////////////////////////////////////////////
// GET TEACHER ASSIGNMENTS
//////////////////////////////////////////////////////////

router.get("/", async (req, res) => {

  try {

    const { teacherId, class: studentClass } = req.query;

    let filter = {};

    if (teacherId) {
      filter.teacherId = teacherId;
    }

    if (studentClass) {
      filter.class = studentClass;
    }

    const assignments = await Assignment
      .find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      assignments,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

//////////////////////////////////////////////////////////
// GET STUDENT ASSIGNMENTS
//////////////////////////////////////////////////////////

router.get("/student/:studentId", async (req, res) => {

  try {

    const Student = require("../models/Student");
    const studentId = req.params.studentId;

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    const assignments = await Assignment.find({
      createdAt: { $gte: lastMonth }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      assignments
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }

});

//////////////////////////////////////////////////////////
// NEW ROUTE – STUDENT HISTORY FOR TEACHER
//////////////////////////////////////////////////////////

router.get("/history", async (req, res) => {

  try {

    const { teacherId } = req.query;

    if (!teacherId) {
      return res.json({
        success: true,
        history: []
      });
    }

    const history = await Assignment.find({ teacherId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      history
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }

});

//////////////////////////////////////////////////////////
// DELETE ASSIGNMENT
//////////////////////////////////////////////////////////

router.delete("/:id", async (req, res) => {

  try {

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Assignment deleted",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
});

module.exports = router;