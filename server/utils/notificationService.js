const Notification = require("../models/Notification");
const { env } = require("../config/env");

const statusCopy = {
  Confirmed: {
    type: "order_confirmed",
    title: "Order confirmed",
    message: "Your order has been confirmed and is moving to packing.",
  },
  Packed: {
    type: "order_packed",
    title: "Order packed",
    message: "Your order has been packed and is ready for dispatch.",
  },
  Shipped: {
    type: "order_shipped",
    title: "Order shipped",
    message: "Your order has shipped. Use the tracking link for the latest status.",
  },
  Delivered: {
    type: "order_delivered",
    title: "Order delivered",
    message: "Your order has been delivered. Thank you for shopping with us.",
  },
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Updating soon";

const orderAmount = (order) => `Rs. ${formatPrice(order.total)}`;

const getTrackingLink = (order) => `${env.storefrontUrl.replace(/\/$/, "")}/track/${order.orderNumber}`;

const getSupportContact = () =>
  [env.supportEmail, env.supportPhone].filter(Boolean).join(" / ") || "Support team";

const normalizePhone = (value = "", includePlus = false) => {
  const digits = value.toString().replace(/\D/g, "");

  if (!digits) return "";

  const withCountryCode =
    digits.length === 10 && env.defaultPhoneCountryCode
      ? `${env.defaultPhoneCountryCode}${digits}`
      : digits;

  return includePlus ? `+${withCountryCode}` : withCountryCode;
};

const itemSummaryText = (order) =>
  order.items
    .map((item) => `${item.name} x ${item.quantity} - Rs. ${formatPrice(item.lineTotal)}`)
    .join("\n");

const itemSummaryHtml = (order) =>
  order.items
    .map(
      (item) =>
        `<li><strong>${item.name}</strong> x ${item.quantity} - Rs. ${formatPrice(item.lineTotal)}</li>`
    )
    .join("");

const buildBaseNotification = (order, overrides) => ({
  order: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  amount: order.total,
  paymentMethod: order.payment?.method || "",
  user: order.user || null,
  customer: {
    name: order.customer?.fullName || "",
    email: order.customer?.email || "",
    phone: order.customer?.phone || "",
  },
  metadata: {
    trackingLink: getTrackingLink(order),
    estimatedDelivery: order.estimatedDelivery,
  },
  ...overrides,
});

const createNotification = async (order, overrides) => {
  const notification = await Notification.create({
    ...buildBaseNotification(order, overrides),
    deliveries: [
      {
        channel: "center",
        recipient: overrides.audience,
        provider: "mongodb",
        status: "sent",
        sentAt: new Date(),
      },
    ],
  });

  return notification;
};

const updateDelivery = async (notification, channel, recipient, result) => {
  await Notification.updateOne(
    { _id: notification._id },
    {
      $push: {
        deliveries: {
          channel,
          recipient,
          provider: result.provider || channel,
          status: result.status || "failed",
          responseId: result.responseId || "",
          error: result.error || "",
          sentAt: result.status === "sent" ? new Date() : undefined,
          updatedAt: new Date(),
        },
      },
    }
  );
};

const safeJson = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
};

const postJson = async (url, payload, headers = {}) => {
  if (typeof fetch !== "function") {
    throw new Error("fetch is not available in this Node.js runtime");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
  const body = await safeJson(response);

  if (!response.ok) {
    throw new Error(body?.message || body?.error?.message || `Provider returned ${response.status}`);
  }

  return body;
};

const apiHeaders = (apiKey) =>
  apiKey
    ? {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
      }
    : {};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    return { provider: "email", status: "skipped", error: "Missing recipient email" };
  }

  if (!env.emailApiUrl || !env.emailFrom) {
    console.log(`\n==================================================`);
    console.log(`[SIMULATED EMAIL NOTIFICATION]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text}`);
    console.log(`==================================================\n`);
    return { provider: "email", status: "skipped", error: "Email provider is not configured (Logged to console)" };
  }

  try {
    const body = await postJson(
      env.emailApiUrl,
      {
        from: env.emailFrom,
        to: [to],
        subject,
        html,
        text,
      },
      apiHeaders(env.emailApiKey)
    );

    return {
      provider: "email",
      status: "sent",
      responseId: body.id || body.messageId || body.message_id || "",
    };
  } catch (error) {
    return { provider: "email", status: "failed", error: error.message };
  }
};

const buildWhatsAppPayload = (to, message, templateParams = []) => {
  if (env.whatsappTemplateName) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: env.whatsappTemplateName,
        language: { code: env.whatsappTemplateLanguage },
        components: [
          {
            type: "body",
            parameters: templateParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: message,
      preview_url: true,
    },
  };
};

const sendWhatsApp = async ({ to, message, templateParams = [] }) => {
  const recipient = normalizePhone(to);

  if (!recipient) {
    return { provider: "whatsapp", status: "skipped", error: "Missing WhatsApp recipient" };
  }

  if (!env.whatsappAccessToken || (!env.whatsappPhoneNumberId && !env.whatsappApiUrl)) {
    console.log(`\n==================================================`);
    console.log(`[SIMULATED WHATSAPP NOTIFICATION]`);
    console.log(`To: ${recipient}`);
    console.log(`Message: ${message}`);
    console.log(`==================================================\n`);
    return { provider: "whatsapp", status: "skipped", error: "WhatsApp Business API is not configured (Logged to console)" };
  }

  const url =
    env.whatsappApiUrl ||
    `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;

  try {
    const body = await postJson(url, buildWhatsAppPayload(recipient, message, templateParams), {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
    });

    return {
      provider: "whatsapp",
      status: "sent",
      responseId: body.messages?.[0]?.id || "",
    };
  } catch (error) {
    return { provider: "whatsapp", status: "failed", error: error.message };
  }
};

const sendSms = async ({ to, message }) => {
  const recipient = normalizePhone(to, true);

  if (!recipient) {
    return { provider: "sms", status: "skipped", error: "Missing SMS recipient" };
  }

  if (!env.smsApiUrl) {
    console.log(`\n==================================================`);
    console.log(`[SIMULATED SMS NOTIFICATION]`);
    console.log(`To: ${recipient}`);
    console.log(`Message: ${message}`);
    console.log(`==================================================\n`);
    return { provider: "sms", status: "skipped", error: "SMS provider is not configured (Logged to console)" };
  }

  try {
    const body = await postJson(
      env.smsApiUrl,
      {
        to: recipient,
        from: env.smsFrom,
        message,
      },
      apiHeaders(env.smsApiKey)
    );

    return {
      provider: "sms",
      status: "sent",
      responseId: body.id || body.messageId || body.message_id || "",
    };
  } catch (error) {
    return { provider: "sms", status: "failed", error: error.message };
  }
};

const dispatchCustomerOrderSuccess = async (notification, order) => {
  const trackingLink = getTrackingLink(order);
  const supportContact = getSupportContact();
  const subject = `Order confirmation ${order.orderNumber}`;
  const text = [
    `Hi ${order.customer.fullName},`,
    "",
    `Your order ${order.orderNumber} has been placed successfully.`,
    "",
    "Products:",
    itemSummaryText(order),
    "",
    `Amount: ${orderAmount(order)}`,
    `Payment method: ${order.payment.method}`,
    `Estimated delivery: ${formatDate(order.estimatedDelivery)}`,
    `Track order: ${trackingLink}`,
    `Support: ${supportContact}`,
  ].join("\n");
  const html = `
    <h2>Order confirmation</h2>
    <p>Hi ${order.customer.fullName}, your order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
    <ul>${itemSummaryHtml(order)}</ul>
    <p><strong>Amount:</strong> ${orderAmount(order)}</p>
    <p><strong>Payment method:</strong> ${order.payment.method}</p>
    <p><strong>Estimated delivery:</strong> ${formatDate(order.estimatedDelivery)}</p>
    <p><strong>Track order:</strong> <a href="${trackingLink}">${trackingLink}</a></p>
    <p><strong>Support:</strong> ${supportContact}</p>
  `;
  const whatsAppMessage = `Order ${order.orderNumber} confirmed. Amount: ${orderAmount(
    order
  )}. Track: ${trackingLink}`;
  const smsMessage = `Your order ${order.orderNumber} is confirmed. Track: ${trackingLink}`;

  const deliveries = [
    ["email", order.customer.email, sendEmail({ to: order.customer.email, subject, html, text })],
    [
      "whatsapp",
      normalizePhone(order.customer.phone),
      sendWhatsApp({
        to: order.customer.phone,
        message: whatsAppMessage,
        templateParams: [order.orderNumber, orderAmount(order), trackingLink],
      }),
    ],
    ["sms", normalizePhone(order.customer.phone, true), sendSms({ to: order.customer.phone, message: smsMessage })],
  ];

  await Promise.all(
    deliveries.map(async ([channel, recipient, promise]) =>
      updateDelivery(notification, channel, recipient, await promise)
    )
  );
};

const dispatchAdminNewOrder = async (notification, order) => {
  const trackingLink = getTrackingLink(order);
  const subject = `New order ${order.orderNumber}`;
  const text = [
    `New order received: ${order.orderNumber}`,
    `Customer: ${order.customer.fullName}`,
    `Phone: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Amount: ${orderAmount(order)}`,
    `Payment method: ${order.payment.method}`,
    `Items: ${order.items.length}`,
    `Admin tracking link: ${trackingLink}`,
  ].join("\n");
  const html = `
    <h2>New order received</h2>
    <p><strong>Order:</strong> ${order.orderNumber}</p>
    <p><strong>Customer:</strong> ${order.customer.fullName}</p>
    <p><strong>Phone:</strong> ${order.customer.phone}</p>
    <p><strong>Email:</strong> ${order.customer.email}</p>
    <p><strong>Amount:</strong> ${orderAmount(order)}</p>
    <p><strong>Payment method:</strong> ${order.payment.method}</p>
    <p><strong>Items:</strong> ${order.items.length}</p>
  `;
  const whatsAppMessage = `New order ${order.orderNumber} from ${order.customer.fullName}. Amount: ${orderAmount(
    order
  )}. Payment: ${order.payment.method}.`;

  const deliveries = [
    ["email", env.storeOwnerEmail, sendEmail({ to: env.storeOwnerEmail, subject, html, text })],
    [
      "whatsapp",
      normalizePhone(env.storeOwnerWhatsApp || env.storeOwnerPhone),
      sendWhatsApp({
        to: env.storeOwnerWhatsApp || env.storeOwnerPhone,
        message: whatsAppMessage,
        templateParams: [order.orderNumber, orderAmount(order), trackingLink],
      }),
    ],
  ];

  await Promise.all(
    deliveries.map(async ([channel, recipient, promise]) =>
      updateDelivery(notification, channel, recipient, await promise)
    )
  );
};

const runInBackground = (task, label) => {
  Promise.resolve(task()).catch((error) => {
    console.error(`[notifications] ${label} failed: ${error.message}`);
  });
};

const notifyOrderSuccess = async (order) => {
  const trackingLink = getTrackingLink(order);
  const customerType = order.status === "Confirmed" ? "order_confirmed" : "order_placed";
  const customerTitle = order.status === "Confirmed" ? "Order confirmed" : "Order placed";
  const customerMessage =
    order.status === "Confirmed"
      ? `Order ${order.orderNumber} is confirmed. Track it anytime from your dashboard.`
      : `Order ${order.orderNumber} has been placed. We will confirm it shortly.`;

  const [customerNotification, adminNotification] = await Promise.all([
    createNotification(order, {
      audience: "customer",
      type: customerType,
      title: customerTitle,
      message: customerMessage,
      channels: ["center", "email", "whatsapp", "sms"],
      metadata: {
        trackingLink,
        estimatedDelivery: order.estimatedDelivery,
        supportContact: getSupportContact(),
      },
    }),
    createNotification(order, {
      audience: "admin",
      type: "new_order",
      title: "New order received",
      message: `${order.orderNumber} from ${order.customer.fullName} for ${orderAmount(order)}`,
      channels: ["center", "email", "whatsapp"],
      metadata: { trackingLink },
    }),
  ]);

  runInBackground(() => dispatchCustomerOrderSuccess(customerNotification, order), "customer order success dispatch");
  runInBackground(() => dispatchAdminNewOrder(adminNotification, order), "admin new order dispatch");

  return { customerNotification, adminNotification };
};

const notifyOrderStatusChange = async (order, status, note = "") => {
  const copy = statusCopy[status];

  if (!copy) return null;

  const trackingLink = getTrackingLink(order);
  const notification = await createNotification(order, {
    audience: "customer",
    type: copy.type,
    title: copy.title,
    message: `${copy.message} Order ${order.orderNumber}.`,
    channels: ["center"],
    metadata: {
      trackingLink,
      estimatedDelivery: order.estimatedDelivery,
      note,
    },
  });

  return notification;
};

module.exports = {
  notifyOrderStatusChange,
  notifyOrderSuccess,
};
