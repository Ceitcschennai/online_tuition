const mongoose = require("mongoose");

const studentPaymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },

    className: {
      type: String,
      required: true
    },

    academicYear: {
      type: String,
      required: true
    },

    paymentMonth: {
      type: String,
      required: true
    },

    monthlyFee: {
      type: Number,
      required: true,
      min: 0
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Submitted",
        "Created",
        "Paid",
        "Failed",
        "Refunded"
      ],
      default: "Pending"
    },

    razorpayOrderId: {
      type: String,
      default: null
    },

    razorpayPaymentId: {
      type: String,
      default: null
    },

    razorpaySignature: {
      type: String,
      default: null
    },

    paidAt: {
  type: Date,
  default: null
},

paymentScreenshot: {
  type: String,
  default: ""
},

transactionReference: {
  type: String,
  default: ""
},

submittedAt: {
  type: Date,
  default: null
}
  },
  {
    timestamps: true
  }
);

studentPaymentSchema.index(
  {
    student: 1,
    paymentMonth: 1,
    academicYear: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "StudentPayment",
  studentPaymentSchema
);