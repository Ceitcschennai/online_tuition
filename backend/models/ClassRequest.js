const mongoose = require('mongoose');

const ClassRequestSchema = new mongoose.Schema(
  {
    studentId:       { type: String, required: true },
    studentName:     { type: String, required: true },
    studentClass:    { type: String, required: true },
    teacherId:       { type: String, required: true },
    teacherName:     { type: String, required: true },
    subject:         { type: String, required: true },
    preferredDate:   { type: Date,   required: true },
    preferredTime:   { type: String, required: true },
    reason:          { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
      default: 'Pending',
    },
    responseMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

// ✅ Guard prevents "Cannot overwrite model" error if required multiple times
module.exports = mongoose.models.ClassRequest || mongoose.model('ClassRequest', ClassRequestSchema);