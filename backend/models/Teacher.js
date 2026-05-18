const mongoose = require("mongoose");

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const teacherSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: { type: String, trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [emailRegex, 'Please provide a valid email address'] // ✅ ADDED
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'] // ✅ ADDED
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required']
  },
  degreeCertificate: { type: String },
  mobile: {
    type: String,
    minlength: [7, 'Mobile number too short'],   // ✅ ADDED
    maxlength: [15, 'Mobile number too long']     // ✅ ADDED
  },
  timezone: { type: String },
  preferredSubject: { type: String },
  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative'] // ✅ ADDED
  },
  isApproved: { type: Boolean, default: false },
  isRejected: { type: Boolean, default: false },
  classAssigned: { type: String },
  classesAssigned: { type: [String], default: [] },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
  isActive: { type: Boolean, default: false }
}, { timestamps: true });

teacherSchema.pre("save", function (next) {
  if (this.isApproved === true) this.isActive = true;
  next();
});

module.exports = mongoose.model("Teacher", teacherSchema);