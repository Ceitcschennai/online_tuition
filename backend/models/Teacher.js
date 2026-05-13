const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },

    qualification: {
      type: String,
      required: true
    },

    degreeCertificate: {
  type: String
},

mobile: {
  type: String
},
timezone: {
  type: String
},
preferredSubject: {
  type: String
},

    experience: {
      type: Number,
      default: 0
    },

    /* 🔥 Approval Flow */
    isApproved: {
      type: Boolean,
      default: false
    },
    isRejected: {
      type: Boolean,
      default: false
    },

    /* 🔥 Assignment */
    classAssigned: {
      type: String
    },
    classesAssigned: {
      type: [String],
      default: []
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject"
      }
    ],

    isActive: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/* 🔥 Auto activate when approved */
teacherSchema.pre("save", function (next) {
  if (this.isApproved === true) {
    this.isActive = true;
  }
  next();
});

module.exports = mongoose.model("Teacher", teacherSchema);