import Assignment from "../models/Assignment.js";
import Student from "../models/Student.js";

export const createAssignment = async (req, res) => {
  try {
    const { title, description, subject, className, dueDate, priority } = req.body;

    // ✅ ADDED: Check required fields before hitting the DB
    if (!title || !subject || !className || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'title, subject, className, and dueDate are all required'
      });
    }

    const assignment = await Assignment.create({
      title,
      description,
      subject,
      class: className,
      dueDate: new Date(dueDate), // ✅ FIXED: ensure it's stored as a Date
      priority: priority || 'Medium',
      teacherId: req.user.id,     // ✅ FIXED: use ObjectId, not a separate teacherName string
      file: req.file?.path || null,
    });

    res.status(201).json({ success: true, message: "Assignment created successfully", assignment });
  } catch (error) {
    // ✅ ADDED: Catch Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentAssignments = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const assignments = await Assignment.find({ class: student.class }).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeacherAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};