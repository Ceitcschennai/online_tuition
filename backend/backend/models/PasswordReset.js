const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    role: {
      type: String,
      required: true,
      enum: ["student", "teacher"]
    },

    otp: {
      type: String,
      required: true
    },

    expiresAt: {
      type: Date,
      required: true
    },

    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/*
  Automatically delete expired OTP records
*/
passwordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "PasswordReset",
  passwordResetSchema
);