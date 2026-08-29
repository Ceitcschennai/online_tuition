const mongoose = require('mongoose');

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const studentSchema = new mongoose.Schema({
  salutation: {
    type: String,
    enum: ['Mr.', 'Ms.', 'Mrs.', 'Mr', 'Ms', 'Mrs', 'Dr.']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [1, 'Last name must be at least 1 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [emailRegex, 'Please provide a valid email address']
  },
  password: { type: String },
  mobile: {
    type: String,
    trim: true,
    minlength: [7, 'Mobile number too short'],
    maxlength: [15, 'Mobile number too long']
  },
  timezone: String,
  class: {
    type: String,
    required: [true, 'Class is required']
  },
  group: String,
  syllabus: String,
  emisNumber: { type: String, trim: true },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'] // ✅ ADDED
  },
  proof: String,
  registeredAt: { type: Date, default: Date.now },
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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

studentSchema.virtual('isApproved').get(function () {
  return this.approvalStatus === 'Approved';
});
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

studentSchema.index({ email: 1 });
studentSchema.index({ approvalStatus: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ class: 1 });

module.exports = mongoose.model('Student', studentSchema);