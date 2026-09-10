const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true
    },

    className: {
      type: String,
      required: true,
      trim: true
    },

    monthlyFee: {
      type: Number,
      required: true,
      min: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

feeStructureSchema.index(
  {
    academicYear: 1,
    className: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "FeeStructure",
  feeStructureSchema
);