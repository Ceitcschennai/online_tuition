const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

  salutation: {
    type: String,
      enum: ['Mr.', 'Ms.', 'Mrs.', 'Mr', 'Ms', 'Mrs']
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    // Not required for admin-created students
  },
  mobile: {
    type: String,
    trim: true
  },
  timezone: String,
  class: {
    type: String,
    required: true
  },
  group: String,
  syllabus: String,
  emisNumber: {
    type: String,
    trim: true
  },
  proof: String, // File path for student proof document
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual field for backward compatibility
studentSchema.virtual('isApproved').get(function() {
  return this.approvalStatus === 'Approved';
});

// Ensure virtual fields are included when converting to JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

// Index for better query performance
studentSchema.index({ email: 1 });
studentSchema.index({ approvalStatus: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ class: 1 });

// ✅ FIX: Changed Model to model (lowercase 'm')
module.exports = mongoose.model('Student', studentSchema);
