const mongoose = require("mongoose");

/* =========================================================
   BILL COUNTER

   Allocates collision-safe, monotonically increasing bill numbers
   for paid student payments.

   A single singleton document is used so every process shares one
   counter. Allocation uses `$inc`, which is atomic in MongoDB, so
   concurrent approvals can never receive the same bill number.

   Bill format: CEITCS-YYYYMM-NNNN  (NNNN is zero-padded to 4 digits)
   ========================================================= */

const billCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
    },
    current: {
      type: Number,
      default: 0,
      min: 0,
    },
    yearMonth: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

/* Atomically reserve the next bill number for the given YYYYMM
   month bucket. The counter rolls over into a new month when the
   current month changes, so bill numbers stay compact. */
billCounterSchema.statics.allocateNext = async function (yearMonth) {
  const counter = await this.findOneAndUpdate(
    { key: "global" },
    {
      $set: { yearMonth },
      $inc: { current: 1 },
    },
    {
      new: true,
      upsert: true,
    },
  );

  const sequence = String(counter.current).padStart(4, "0");
  return `CEITCS-${yearMonth}-${sequence}`;
};

module.exports = mongoose.model("BillCounter", billCounterSchema);