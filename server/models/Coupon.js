const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, required: true, enum: ["Percentage", "Flat Discount", "percent", "flat"] },
  value: { type: Number, required: true },
  minimum: { type: Number, default: 0 },
  limit: { type: Number, default: 1 },
  expiry: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
