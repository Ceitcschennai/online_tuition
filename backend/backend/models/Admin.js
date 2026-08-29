const mongoose = require("mongoose");

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const adminSchema = new mongoose.Schema({
  instituteName: {
    type: String,
    required: [true, 'Institute name is required'],
    trim: true,
    minlength: [2, 'Institute name too short'] // ✅ ADDED
  },
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
  logo: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);