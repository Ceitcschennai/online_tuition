const mongoose = require("mongoose");

/* ==============================================
   EMAIL VALIDATION REGEX
============================================== */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ==============================================
   TEACHER SCHEMA
============================================== */
const teacherSchema = new mongoose.Schema(
  {
    salutation: {
      type: String,
      enum: ["Mr.", "Ms.", "Mrs.", "Dr.", "Mr", "Ms", "Mrs", "Dr"],
      trim: true
    },

    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"]
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [1, "Last name is required"]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        emailRegex,
        "Please provide a valid email address"
      ]
    },

    password: {
      type: String,
      required: [true, "Password is required"]
    },

    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      minlength: [7, "Mobile number too short"],
      maxlength: [15, "Mobile number too long"]
    },

    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      trim: true
    },

    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true
    },

    preferredSubject: {
      type: String,
      trim: true
    },

    classesAssigned: {
      type: [String],
      default: []
    },

    degreeCertificate: {
      type: String,
      default: ""
    },

    experience: {
      type: Number,
      default: 0,
      min: [0, "Experience cannot be negative"]
    },

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject"
      }
    ],

    /* ==============================================
       APPROVAL STATUS
    ============================================== */

    isApproved: {
      type: Boolean,
      default: false
    },

    isRejected: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/* ==============================================
   AUTO ACTIVATE APPROVED TEACHER
============================================== */
teacherSchema.pre("save", function (next) {
  if (this.isApproved === true) {
    this.isActive = true;
  } else {
    this.isActive = false;
  }

  next();
});

/* ==============================================
   REMOVE PASSWORD FROM JSON RESPONSE
============================================== */
teacherSchema.methods.toJSON = function () {
  const teacher = this.toObject();

  delete teacher.password;

  return teacher;
};

/* ==============================================
   INDEXES
============================================== */
teacherSchema.index({ email: 1 });

teacherSchema.index({ isApproved: 1 });

teacherSchema.index({ isActive: 1 });

/* ==============================================
   EXPORT MODEL
============================================== */
module.exports = mongoose.model("Teacher", teacherSchema);