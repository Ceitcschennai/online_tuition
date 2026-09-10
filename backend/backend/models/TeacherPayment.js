const mongoose = require("mongoose");

const teacherPaymentSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true
    },

    paymentMonth: {
      type: String,
      required: true
    },

    studentCount: { type: Number, required: true, min: 0 },

classBreakdown: [
  {
    className: {
      type: String,
      required: true
    },
    studentCount: {
      type: Number,
      required: true,
      min: 0
    },
    classSalary: {
      type: Number,
      required: true,
      min: 0
    }
  }
],

ratePerStudent: {
  type: Number,
  default: 1500,
  min: 0
},

calculatedAmount: {
  type: Number,
  required: true,
  min: 0
},

    status: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Cancelled"
      ],
      default: "Pending"
    },

    paymentDate: {
      type: Date,
      default: null
    },

    paymentMethod: {
      type: String,
      default: ""
    },

    transactionReference: {
      type: String,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

teacherPaymentSchema.index(
  {
    teacher: 1,
    paymentMonth: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "TeacherPayment",
  teacherPaymentSchema
);