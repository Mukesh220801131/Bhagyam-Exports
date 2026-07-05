const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");

// GET /api/coupons - Get all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/coupons - Create or update coupon
router.post("/", async (req, res) => {
  try {
    const { code, type, value, expiry, minimum, limit } = req.body;
    if (!code || !type || !value) {
      return res.status(400).json({ success: false, message: "Code, type, and value are required" });
    }

    const normalizedCode = code.toString().trim().toUpperCase();

    // Check if coupon already exists
    let coupon = await Coupon.findOne({ code: normalizedCode });
    if (coupon) {
      coupon.type = type;
      coupon.value = Number(value);
      coupon.expiry = expiry ? new Date(expiry) : undefined;
      coupon.minimum = Number(minimum || 0);
      coupon.limit = Number(limit || 1);
      await coupon.save();
    } else {
      coupon = await Coupon.create({
        code: normalizedCode,
        type,
        value: Number(value),
        expiry: expiry ? new Date(expiry) : undefined,
        minimum: Number(minimum || 0),
        limit: Number(limit || 1),
      });
    }

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/coupons/:id - Delete coupon
router.delete("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
