const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "..", ".env");
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error && process.env.NODE_ENV !== "production") {
  console.warn(`[env] No .env file found at ${envPath}. Using process environment variables.`);
}

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];

const missingEnvVars = requiredEnvVars.filter((key) => {
  const value = process.env[key];
  return !value || !value.trim();
});

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missingEnvVars.join(
      ", "
    )}. Add them in server/.env or your deployment environment.`
  );
}

if (!/^mongodb(\+srv)?:\/\//.test(process.env.MONGODB_URI)) {
  throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
}

const parseAllowedOrigins = (value) =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = parseAllowedOrigins(
  process.env.CLIENT_URL ||
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || "24h",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  allowedOrigins,
  storefrontUrl: process.env.PUBLIC_STORE_URL || allowedOrigins[0] || "http://localhost:5173",
  supportEmail: process.env.SUPPORT_EMAIL || process.env.STORE_OWNER_EMAIL || "",
  supportPhone: process.env.SUPPORT_PHONE || process.env.STORE_OWNER_PHONE || "",
  storeOwnerEmail: process.env.STORE_OWNER_EMAIL || process.env.ADMIN_EMAIL || "",
  storeOwnerPhone: process.env.STORE_OWNER_PHONE || process.env.ADMIN_PHONE || "",
  storeOwnerWhatsApp:
    process.env.STORE_OWNER_WHATSAPP || process.env.STORE_OWNER_PHONE || process.env.ADMIN_PHONE || "",
  defaultPhoneCountryCode: process.env.DEFAULT_PHONE_COUNTRY_CODE || "91",
  emailApiUrl: process.env.EMAIL_API_URL || "",
  emailApiKey: process.env.EMAIL_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  whatsappApiUrl: process.env.WHATSAPP_API_URL || "",
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || "v20.0",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || "",
  whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
  smsApiUrl: process.env.SMS_API_URL || "",
  smsApiKey: process.env.SMS_API_KEY || "",
  smsFrom: process.env.SMS_FROM || "FashionStore",
};

module.exports = { env, requiredEnvVars };
