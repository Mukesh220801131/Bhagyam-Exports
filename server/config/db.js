require("./env");

const mongoose = require("mongoose");

const connectionStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

let listenersRegistered = false;

const getDatabaseStatus = () => ({
  readyState: mongoose.connection.readyState,
  state: connectionStates[mongoose.connection.readyState] || "unknown",
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
});

const registerConnectionEvents = () => {
  if (listenersRegistered) return;

  mongoose.connection.on("disconnected", () => {
    console.warn("[database] MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    console.info("[database] MongoDB reconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error(`[database] MongoDB error: ${error.message}`);
  });

  listenersRegistered = true;
};

const connectDB = async () => {
  registerConnectionEvents();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== "production",
    });

    console.info(
      `[database] Connected to ${conn.connection.name || "MongoDB"} at ${conn.connection.host}`
    );

    return conn.connection;
  } catch (error) {
    console.error(`[database] Connection failed: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.info("[database] MongoDB connection closed");
  }
};

module.exports = connectDB;
module.exports.getDatabaseStatus = getDatabaseStatus;
module.exports.disconnectDB = disconnectDB;
