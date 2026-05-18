const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema({
  class: {
    type: String,
    required: [true, 'Class is required'],  // ✅ ADDED
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'], // ✅ ADDED
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],   // ✅ ADDED
    trim: true,
    minlength: [3, 'Title must be at least 3 characters']
  },
  dueDate: {
    type: Date,                              // ✅ FIXED: was String, now proper Date
    required: [true, 'Due date is required']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],         // ✅ ADDED: only valid values allowed
    default: 'Medium'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description too long']
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,    // ✅ FIXED: was plain String, now proper ObjectId ref
    ref: 'Teacher',
    required: [true, 'Teacher ID is required']
  },
  teacherName: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Assignment", AssignmentSchema);