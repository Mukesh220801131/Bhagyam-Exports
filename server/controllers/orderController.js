const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { env } = require("../config/env");
const {
  notifyOrderStatusChange,
  notifyOrderSuccess,
} = require("../utils/notificationService");

const couponRules = {
  WELCOME10: { type: "percent", value: 10, minimum: 499 },
  FASHION20: { type: "percent", value: 20, minimum: 1499 },
  SUMMER25: { type: "percent", value: 25, minimum: 2499 },
};

const orderStatuses = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"];

const statusLabels = {
  Pending: "Order placed",
  Confirmed: "Order confirmed",
  Packed: "Packed for dispatch",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  Returned: "Returned",
  "Return Requested": "Return requested by customer",
};

const toPaise = (value) => Math.round(Number(value || 0) * 100);

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const normalizeCoupon = (couponCode = "") => couponCode.toString().trim().toUpperCase();

const createEmailEvent = (type) => ({ type, status: "simulated", at: new Date() });

const getRazorpayClient = () => {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    return null;
  }

  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
};

const normalizeAddress = (address = {}) => ({
  fullName: address.fullName || address.name || "",
  email: address.email || "",
  phone: address.phone || "",
  line1: address.line1 || address.address || "",
  line2: address.line2 || "",
  city: address.city || "",
  state: address.state || "",
  pincode: address.pincode || address.pinCode || "",
  country: address.country || "India",
});

const validateAddress = (address) => {
  const required = ["fullName", "email", "phone", "line1", "city", "state", "pincode"];
  const missing = required.filter((key) => !address[key]);

  if (missing.length > 0) {
    return `Missing address field(s): ${missing.join(", ")}`;
  }

  if (!/^\S+@\S+\.\S+$/.test(address.email)) {
    return "Please provide a valid email address";
  }

  if (!/^[0-9+\-\s()]{7,16}$/.test(address.phone)) {
    return "Please provide a valid phone number";
  }

  if (!/^[0-9]{5,6}$/.test(address.pincode)) {
    return "Please provide a valid pincode";
  }

  return "";
};

const loadOrderItems = async (cartItems = []) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  const ids = cartItems.map((item) => item.productId || item.product || item._id).filter(Boolean);
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length !== cartItems.length) {
    throw new Error("Cart contains invalid product IDs");
  }

  const products = await Product.find({ _id: { $in: validIds }, isActive: true });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  return cartItems.map((cartItem) => {
    const productId = (cartItem.productId || cartItem.product || cartItem._id).toString();
    const product = productMap.get(productId);

    if (!product) {
      throw new Error("One or more products are unavailable");
    }

    const quantity = Math.max(1, Math.min(Number(cartItem.quantity) || 1, 10));

    if (product.stock < quantity) {
      throw new Error(`${product.name} has only ${product.stock} item(s) in stock`);
    }

    const mrp = roundMoney(product.price);
    const price = roundMoney(product.discountPrice || product.price);
    const lineTotal = roundMoney(price * quantity);

    return {
      product: product._id,
      name: product.name,
      sku: product.sku || "",
      brand: product.brand,
      category: product.category,
      image: product.thumbnail || product.images?.[0] || "",
      size: cartItem.size || "",
      color: cartItem.color || "",
      quantity,
      mrp,
      price,
      discount: roundMoney(Math.max(mrp - price, 0) * quantity),
      lineTotal,
    };
  });
};

// Load coupon rule asynchronously
const getCouponRule = async (couponCode, user = null, email = "") => {
  if (!couponCode) return null;
  const normalized = normalizeCoupon(couponCode);
  
  // Special logic for WELCOME10
  if (normalized === "WELCOME10") {
    try {
      const query = [];
      if (user && user._id) {
        query.push({ user: user._id });
      }
      const targetEmail = (email || user?.email || "").toString().trim().toLowerCase();
      if (targetEmail) {
        query.push({ "customer.email": targetEmail });
      }

      if (query.length > 0) {
        const Order = require("../models/Order");
        const existingOrder = await Order.findOne({
          $or: query,
          "payment.status": { $ne: "Failed" }
        });
        if (existingOrder) {
          throw new Error("WELCOME10 coupon is only valid for your first order.");
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("first order")) {
        throw e;
      }
      console.error("Welcome coupon verification failed", e);
    }
  }

  // Try database lookup first
  try {
    const Coupon = require("../models/Coupon");
    const dbCoupon = await Coupon.findOne({ code: normalized });
    if (dbCoupon) {
      // Check expiry
      if (dbCoupon.expiry && new Date(dbCoupon.expiry) < new Date()) {
        return null;
      }
      return {
        type: dbCoupon.type.toLowerCase().includes("percent") ? "percent" : "flat",
        value: dbCoupon.value,
        minimum: dbCoupon.minimum || 0
      };
    }
  } catch (e) {
    console.error("Coupon DB lookup failed, falling back to static", e);
  }
  
  // Fallback to static coupon rules
  return couponRules[normalized] || null;
};

const buildTotals = (items, couponRule = null, couponCode = "") => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  let discount = 0;

  if (couponRule && subtotal >= couponRule.minimum) {
    discount =
      couponRule.type === "percent"
        ? roundMoney((subtotal * couponRule.value) / 100)
        : roundMoney(couponRule.value);
  }

  const shippingFee = subtotal >= 1499 ? 0 : 79;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = roundMoney(taxableAmount * 0.05);
  const total = roundMoney(taxableAmount + shippingFee + tax);

  return {
    subtotal,
    discount,
    couponCode: discount > 0 ? normalizeCoupon(couponCode) : "",
    shippingFee,
    tax,
    total,
  };
};

const buildOrderPayload = async ({ cartItems, address, paymentMethod, couponCode, user, notes }) => {
  const customer = normalizeAddress(address);
  const addressError = validateAddress(customer);

  if (addressError) {
    throw new Error(addressError);
  }

  const items = await loadOrderItems(cartItems);
  const couponRule = await getCouponRule(couponCode, user, customer.email);
  const totals = buildTotals(items, couponRule, couponCode);

  return {
    user: user?._id || null,
    customer,
    shippingAddress: customer,
    billingAddress: customer,
    items,
    ...totals,
    notes: notes || "",
    payment: {
      method: paymentMethod,
      status: paymentMethod === "COD" ? "Pending" : "Created",
    },
  };
};

const decrementStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      )
    )
  );
};

const quoteOrder = async (req, res) => {
  try {
    const items = await loadOrderItems(req.body.items || req.body.cartItems);
    const email = req.body.email || req.body.address?.email || "";
    const couponRule = await getCouponRule(req.body.couponCode, req.user, email);
    const totals = buildTotals(items, couponRule, req.body.couponCode);

    let dbCodes = [];
    try {
      const Coupon = require("../models/Coupon");
      const dbCoupons = await Coupon.find({}).select("code");
      dbCodes = dbCoupons.map(c => c.code);
    } catch (e) {}

    res.json({
      success: true,
      data: {
        items,
        ...totals,
        coupons: [...new Set([...Object.keys(couponRules), ...dbCodes])],
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createCodOrder = async (req, res) => {
  try {
    const payload = await buildOrderPayload({
      cartItems: req.body.items || req.body.cartItems,
      address: req.body.address,
      couponCode: req.body.couponCode,
      paymentMethod: "COD",
      user: req.user,
      notes: req.body.notes,
    });

    const order = await Order.create({
      ...payload,
      status: "Pending",
      emailEvents: [createEmailEvent("order_confirmation")],
    });

    await decrementStock(order.items);
    await notifyOrderSuccess(order);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.",
      });
    }

    const payload = await buildOrderPayload({
      cartItems: req.body.items || req.body.cartItems,
      address: req.body.address,
      couponCode: req.body.couponCode,
      paymentMethod: "Razorpay",
      user: req.user,
      notes: req.body.notes,
    });

    const order = await Order.create(payload);
    const razorpayOrder = await razorpay.orders.create({
      amount: toPaise(order.total),
      currency: order.currency,
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email,
      },
    });

    order.payment.razorpayOrderId = razorpayOrder.id;
    order.payment.status = "Created";
    await order.save();

    res.status(201).json({
      success: true,
      message: "Razorpay order created",
      data: {
        key: env.razorpayKeyId,
        order,
        razorpayOrder,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!env.razorpayKeySecret) {
      return res.status(503).json({ success: false, message: "Razorpay key secret is not configured" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment verification data" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const order = await Order.findOne({ "payment.razorpayOrderId": razorpay_order_id });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment.status !== "Paid") {
      order.payment.status = "Paid";
      order.payment.razorpayPaymentId = razorpay_payment_id;
      order.payment.razorpaySignature = razorpay_signature;
      order.payment.paidAt = new Date();
      order.emailEvents.push(createEmailEvent("payment_confirmation"));
      order.emailEvents.push(createEmailEvent("order_confirmation"));
      order.addTimeline("Confirmed", statusLabels.Confirmed, "Payment verified successfully");
      await decrementStock(order.items);
      await order.save();
      await notifyOrderSuccess(order);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: order,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const markRazorpayFailure = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, reason = "Payment was not completed" } = req.body;
    const query = orderId
      ? { _id: orderId }
      : { "payment.razorpayOrderId": razorpay_order_id };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.payment.status = reason.toLowerCase().includes("cancel") ? "Cancelled" : "Failed";
    order.payment.failureReason = reason;
    await order.save();

    res.json({ success: true, message: "Payment status updated", data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const retryRazorpayPayment = async (req, res) => {
  try {
    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured. Add Razorpay keys and retry.",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment.method !== "Razorpay" || order.payment.status === "Paid") {
      return res.status(400).json({ success: false, message: "This order cannot be retried" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: toPaise(order.total),
      currency: order.currency,
      receipt: `${order.orderNumber}-retry-${Date.now().toString().slice(-5)}`,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    });

    order.payment.razorpayOrderId = razorpayOrder.id;
    order.payment.status = "Created";
    order.payment.failureReason = "";
    await order.save();

    res.json({
      success: true,
      message: "Retry payment order created",
      data: {
        key: env.razorpayKeyId,
        order,
        razorpayOrder,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const query = req.user?._id ? { user: req.user._id } : {};

    if (!req.user?._id && req.query.email) {
      query["customer.email"] = req.query.email.toLowerCase();
    }

    if (!Object.keys(query).length) {
      return res.status(400).json({ success: false, message: "Login or email is required to view orders" });
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const trackOrder = async (req, res) => {
  try {
    const { identifier } = req.params;
    const query = mongoose.Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { orderNumber: identifier.toUpperCase() };
    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (["Shipped", "Delivered", "Cancelled", "Returned"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel an order that is ${order.status}` });
    }

    const emailMatches =
      req.body.email && order.customer.email.toLowerCase() === req.body.email.toString().toLowerCase();
    const userMatches = req.user?._id && order.user?.toString() === req.user._id.toString();

    if (!userMatches && !emailMatches) {
      return res.status(403).json({ success: false, message: "Order email verification failed" });
    }

    order.cancellationReason = req.body.reason || "Cancelled by customer";
    order.payment.status = order.payment.status === "Paid" ? "Refunded" : order.payment.status;
    order.addTimeline("Cancelled", statusLabels.Cancelled, order.cancellationReason);
    await order.save();

    await Promise.all(
      order.items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
    );

    res.json({ success: true, message: "Order cancelled successfully", data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getInvoice = async (req, res) => {
  try {
    const order = await Order.findOne(
      mongoose.Types.ObjectId.isValid(req.params.id)
        ? { _id: req.params.id }
        : { orderNumber: req.params.id.toUpperCase() }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      data: {
        invoiceNumber: order.invoiceNumber || `PROFORMA-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        customer: order.customer,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingFee: order.shippingFee,
        tax: order.tax,
        total: order.total,
        payment: order.payment,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      paymentMethod,
      search,
      page = 1,
      limit = 20,
      sort = "newest",
    } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (paymentStatus && paymentStatus !== "all") query["payment.status"] = paymentStatus;
    if (paymentMethod && paymentMethod !== "all") query["payment.method"] = paymentMethod;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.fullName": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
    }

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(query).sort(sortOption).skip(skip).limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, note = "" } = req.body;

    if (!orderStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const previousStatus = order.status;
    order.addTimeline(status, statusLabels[status] || status, note);

    if (status === "Confirmed" && order.payment.method === "COD") {
      order.invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber.replace("FS-", "")}`;
    }

    if (status === "Shipped") {
      order.emailEvents.push(createEmailEvent("shipping_confirmation"));
    }

    if (status === "Delivered") {
      order.payment.status = order.payment.method === "COD" ? "Paid" : order.payment.status;
      order.emailEvents.push(createEmailEvent("delivery_confirmation"));
    }

    if (status === "Returned" && previousStatus !== "Returned") {
      order.payment.status = "Refunded";
      await Promise.all(
        order.items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
      );
    }

    await order.save();
    if (status !== previousStatus) {
      await notifyOrderStatusChange(order, status, note);
    }

    res.json({ success: true, message: "Order status updated", data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getOrderAnalytics = async (req, res) => {
  try {
    const [ordersByStatus, paidRevenue, topSellingProducts] = await Promise.all([
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" }, "payment.status": { $in: ["Paid", "Pending"] } } },
        { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            image: { $first: "$items.image" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        ordersByStatus,
        revenue: paidRevenue[0]?.revenue || 0,
        totalOrders: paidRevenue[0]?.orders || 0,
        topSellingProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestOrderReturn = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
    }

    const emailMatches =
      req.body.email && order.customer.email.toLowerCase() === req.body.email.toString().toLowerCase();
    const userMatches = req.user?._id && order.user?.toString() === req.user._id.toString();

    if (!userMatches && !emailMatches) {
      return res.status(403).json({ success: false, message: "Order email verification failed" });
    }

    const deliveredDate = new Date(order.deliveredAt || order.updatedAt);
    const timeDiff = Date.now() - deliveredDate.getTime();
    const daysDiffReal = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiffReal > 7) {
      return res.status(400).json({ success: false, message: "Return period of 7 days has expired for this order" });
    }

    order.returnReason = req.body.reason || "Returned by customer";
    order.returnRequestedAt = new Date();
    order.addTimeline("Return Requested", statusLabels["Return Requested"], order.returnReason);
    await order.save();

    res.json({ success: true, message: "Return requested successfully", data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  quoteOrder,
  createCodOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  markRazorpayFailure,
  retryRazorpayPayment,
  getMyOrders,
  trackOrder,
  cancelOrder,
  requestOrderReturn,
  getInvoice,
  getAdminOrders,
  updateOrderStatus,
  getOrderAnalytics,
};
