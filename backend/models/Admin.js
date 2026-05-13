const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  instituteName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  logo: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
