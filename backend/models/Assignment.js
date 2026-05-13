const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema(
  {
    class: String,
    subject: String,
    title: String,
    dueDate: String,
    priority: String,
    description: String,
    teacherId: String,
    teacherName: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", AssignmentSchema);