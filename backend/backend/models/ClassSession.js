const mongoose = require("mongoose");

const classSessionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    },

    title: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    meetLink: {
      type: String,
      required: true
    },

    classDate: {
      type: Date,
      required: true
    },

    durationMinutes: {
      type: Number,
      default: 60
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClassSession", classSessionSchema);