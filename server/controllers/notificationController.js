const Notification = require("../models/Notification");

const parseOrderNumbers = (value = "") =>
  value
    .toString()
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const buildCustomerQuery = (req) => {
  const clauses = [];
  const email = req.query.email?.toString().trim().toLowerCase();
  const phone = req.query.phone?.toString().trim();
  const orderNumbers = parseOrderNumbers(req.query.orderNumbers);

  if (req.user?._id) clauses.push({ user: req.user._id });
  if (email) clauses.push({ "customer.email": email });
  if (phone) clauses.push({ "customer.phone": phone });
  if (orderNumbers.length) clauses.push({ orderNumber: { $in: orderNumbers } });

  if (!clauses.length) return null;
  return { audience: "customer", $or: clauses };
};

const getAdminNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const query = { audience: "admin" };

    if (req.query.unreadOnly === "true") {
      query.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ audience: "admin", isRead: false }),
    ]);

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAdminNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      audience: "admin",
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    notification.markRead();
    await notification.save();

    const unreadCount = await Notification.countDocuments({ audience: "admin", isRead: false });
    res.json({ success: true, unreadCount, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const markAllAdminNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { audience: "admin", isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomerNotifications = async (req, res) => {
  try {
    const query = buildCustomerQuery(req);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Email, phone, order numbers, or login is required to view notifications",
      });
    }

    const limit = Math.min(Number(req.query.limit) || 30, 60);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markCustomerNotificationRead = async (req, res) => {
  try {
    const query = buildCustomerQuery(req);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Email, phone, order numbers, or login is required to update notifications",
      });
    }

    const notification = await Notification.findOne({ ...query, _id: req.params.id });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    notification.markRead();
    await notification.save();

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });
    res.json({ success: true, unreadCount, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminNotifications,
  getCustomerNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markCustomerNotificationRead,
};
