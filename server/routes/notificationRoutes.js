const express = require("express");
const {
  getAdminNotifications,
  getCustomerNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markCustomerNotificationRead,
} = require("../controllers/notificationController");
const { authorizeAdmin, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin", authorizeAdmin, getAdminNotifications);
router.patch("/admin/read-all", authorizeAdmin, markAllAdminNotificationsRead);
router.patch("/admin/:id/read", authorizeAdmin, markAdminNotificationRead);

router.get("/customer", optionalAuth, getCustomerNotifications);
router.patch("/customer/:id/read", optionalAuth, markCustomerNotificationRead);

module.exports = router;
