import Assignment from "../models/Assignment.js";
import Student from "../models/Student.js";

/**
 * Teacher creates assignment for a class & subject
 */
export const createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      className,
      dueDate,
    } = req.body;

    const assignment = await Assignment.create({
      title,
      description,
      subject,
      class: className,
      dueDate,
      teacher: req.user.id,
      file: req.file?.path || null,
    });

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Student fetch assignments (class-based)
 */
export const getStudentAssignments = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const assignments = await Assignment.find({
      class: student.class,
    }).sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Teacher fetch assignments created by them
 */
export const getTeacherAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({
      teacher: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};