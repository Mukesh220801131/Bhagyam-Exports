const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: "" },
    brand: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    size: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["COD", "Razorpay"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Created", "Paid", "Failed", "Cancelled", "Refunded"],
      default: "Pending",
    },
    razorpayOrderId: { type: String, trim: true, default: "" },
    razorpayPaymentId: { type: String, trim: true, default: "" },
    razorpaySignature: { type: String, trim: true, default: "" },
    failureReason: { type: String, trim: true, default: "" },
    paidAt: { type: Date },
  },
  { _id: false }
);

const emailEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["order_confirmation", "payment_confirmation", "shipping_confirmation", "delivery_confirmation"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "simulated"],
      default: "simulated",
    },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customer: addressSchema,
    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, "Order must contain at least one item"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true, default: "" },
    shippingFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"],
      default: "Pending",
      index: true,
    },
    payment: paymentSchema,
    timeline: { type: [timelineSchema], default: [] },
    emailEvents: { type: [emailEventSchema], default: [] },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true, default: "" },
    returnReason: { type: String, trim: true, default: "" },
    returnRequestedAt: { type: Date },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function () {
  const now = new Date();
  const suffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  if (!this.orderNumber) {
    this.orderNumber = `FS-${suffix}-${random}`;
  }

  if (!this.invoiceNumber && ["Confirmed", "Packed", "Shipped", "Delivered"].includes(this.status)) {
    this.invoiceNumber = `INV-${suffix}-${random}`;
  }

  if (!this.estimatedDelivery) {
    this.estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  }

  if (!this.timeline?.length) {
    this.timeline = [
      {
        status: this.status || "Pending",
        label: "Order placed",
        note: this.payment?.method === "COD" ? "Cash on Delivery selected" : "Awaiting payment confirmation",
      },
    ];
  }
});

orderSchema.methods.addTimeline = function (status, label, note = "") {
  this.status = status;
  this.timeline.push({ status, label, note, at: new Date() });

  if (status === "Delivered") {
    this.deliveredAt = new Date();
  }

  if (status === "Cancelled") {
    this.cancelledAt = new Date();
  }

  return this;
};

module.exports = mongoose.model("Order", orderSchema);
