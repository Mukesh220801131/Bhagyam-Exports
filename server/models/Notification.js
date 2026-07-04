const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["center", "email", "whatsapp", "sms"],
      required: true,
    },
    recipient: { type: String, trim: true, default: "" },
    provider: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "sent", "skipped", "failed"],
      default: "pending",
    },
    responseId: { type: String, trim: true, default: "" },
    error: { type: String, trim: true, default: "" },
    sentAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "new_order",
        "order_placed",
        "order_confirmed",
        "order_packed",
        "order_shipped",
        "order_delivered",
        "order_status",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    orderNumber: { type: String, trim: true, index: true },
    status: { type: String, trim: true, default: "" },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, trim: true, default: "" },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customer: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, lowercase: true, trim: true, default: "", index: true },
      phone: { type: String, trim: true, default: "", index: true },
    },
    channels: {
      type: [String],
      enum: ["center", "email", "whatsapp", "sms"],
      default: ["center"],
    },
    deliveries: { type: [deliverySchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ "customer.email": 1, createdAt: -1 });
notificationSchema.index({ orderNumber: 1, type: 1, createdAt: -1 });

notificationSchema.methods.markRead = function () {
  this.isRead = true;
  this.readAt = this.readAt || new Date();
  return this;
};

module.exports = mongoose.model("Notification", notificationSchema);
