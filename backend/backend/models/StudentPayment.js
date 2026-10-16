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

    /* How this payment record was created.
       QR     - student scanned the institute QR and submitted a UTR.
       UPI_ID - student entered their own UPI ID. No money is moved
                at submission time; the admin must verify the actual
                incoming funds before the payment is marked Paid. */
    paymentMethod: {
      type: String,
      enum: ["QR", "UPI_ID"],
      default: "QR",
    },

    /* Actual amount the student says they paid for the latest
       submission. Kept separate from:
         - monthlyFee      (the tuition fee due)
         - amountPaid      (the admin-verified total)
       Older records without this field are left as null so no
       historical amount is invented. */
    submittedAmount: {
      type: Number,
      default: null,
      min: 0
    },

    /* The student's own UPI ID (Virtual Payment Address) when the
       payment was submitted via the UPI_ID method. Empty for QR
       submissions. Never used as a transaction reference. */
    studentUpiId: {
      type: String,
      default: "",
      trim: true
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Submitted",
        "Created",
        "Paid",
        "Failed",
        "Refunded",
        "Rejected"
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
    },

    billNumber: {
      type: String,
      default: ""
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },

    rejectionReason: {
      type: String,
      default: ""
    },

    receiptGeneratedAt: {
      type: Date,
      default: null
    },

    fundsVerified: {
      type: Boolean,
      default: false
    },

    transactions: [
      {
        transactionReference: {
          type: String,
          required: true,
          trim: true
        },

        /* Submission method for this transaction.
           UPI_ID means the student entered their own UPI ID as the
           reference. No transaction ID is generated and no money is
           moved at submission time. */
        method: {
          type: String,
          enum: ["QR", "UPI_ID"],
          default: "QR",
        },

        amount: {
          type: Number,
          required: true,
          min: 1
        },
        status: {
          type: String,
          enum: ["Submitted", "Verified", "Rejected"],
          default: "Submitted"
        },
        paymentScreenshot: {
          type: String,
          default: ""
        },
        submittedAt: {
          type: Date,
          default: Date.now
        },
        verifiedAt: {
          type: Date,
          default: null
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
          default: null
        },
        rejectionReason: {
          type: String,
          default: ""
        }
      }
    ]
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