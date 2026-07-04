const express = require("express");
const cors = require("cors");
const { env } = require("./config/env");
const connectDB = require("./config/db");
const { disconnectDB, getDatabaseStatus } = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const brandRoutes = require("./routes/brandRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const orderRoutes = require("./routes/orderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const {
  rateLimiter,
  sanitizeRequest,
  securityHeaders,
} = require("./middleware/securityMiddleware");

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(securityHeaders);
app.use(rateLimiter);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequest);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Fashion Store API Running",
  });
});

app.get("/api/health", (req, res) => {
  const database = getDatabaseStatus();
  const isDatabaseConnected = database.readyState === 1;

  res.status(isDatabaseConnected ? 200 : 503).json({
    success: isDatabaseConnected,
    status: isDatabaseConnected ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    database,
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const handleServerError = (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[server] Port ${env.port} is already in use. Set a different PORT in server/.env.`
    );
  } else {
    console.error(`[server] Error: ${err.message}`);
  }
  process.exit(1);
};

let server;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(env.port, () => {
      console.log(`[server] Running on http://localhost:${env.port}`);
    });

    server.on("error", handleServerError);
  } catch (error) {
    console.error(`[server] Startup failed: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received. Shutting down...`);

  if (!server) {
    await disconnectDB();
    process.exit(0);
  }

  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (error) => {
  console.error(`[server] Unhandled rejection: ${error.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

if (require.main === module) {
  startServer();
}

module.exports = app;
