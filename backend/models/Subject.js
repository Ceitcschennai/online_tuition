const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    category: { type: String, default: "Regular" },
    price: { type: String, default: "Free" },

    classes: [{ type: String }],

    // 🔥 ADD THIS FIELD
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null
    },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);