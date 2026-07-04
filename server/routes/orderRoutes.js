const express = require("express");
const {
  cancelOrder,
  requestOrderReturn,
  createCodOrder,
  createRazorpayOrder,
  getAdminOrders,
  getInvoice,
  getMyOrders,
  getOrderAnalytics,
  markRazorpayFailure,
  quoteOrder,
  retryRazorpayPayment,
  trackOrder,
  updateOrderStatus,
  verifyRazorpayPayment,
} = require("../controllers/orderController");
const { authorizeAdmin, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/quote", quoteOrder);
router.post("/cod", optionalAuth, createCodOrder);
router.post("/razorpay/create", optionalAuth, createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);
router.post("/razorpay/failure", markRazorpayFailure);
router.post("/:id/retry-payment", retryRazorpayPayment);
router.get("/my", optionalAuth, getMyOrders);
router.get("/track/:identifier", trackOrder);
router.get("/:id/invoice", getInvoice);
router.patch("/:id/cancel", optionalAuth, cancelOrder);
router.patch("/:id/return", optionalAuth, requestOrderReturn);

router.get("/admin/analytics", authorizeAdmin, getOrderAnalytics);
router.get("/admin/list", authorizeAdmin, getAdminOrders);
router.patch("/admin/:id/status", authorizeAdmin, updateOrderStatus);

module.exports = router;
