require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Validate Required Environment Variables
const requiredEnvVars = ["DB_USER", "DB_PASS", "DB_HOST", "DB_NAME", "JWT_SECRET", "PORT", "NODE_ENV"];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[ERROR] Missing environment variable: ${key}`);
    process.exit(1); // Stop server if env variables are missing
  }
});

// App Initialization
const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Middleware
app.use(cors({ origin: isProduction ? process.env.CORS_ORIGIN : "*" }));
app.use(express.json());
app.use(helmet()); // Security headers
if (!isProduction) app.use(morgan("dev")); // Logs for non-production

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Default limit
  message: "Too many requests. Please try again later.",
});
app.use("/api", generalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts
  message: "Too many login attempts. Try again later.",
});
app.use("/api/v1/users/login", loginLimiter);

// Root Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the ISP Management API!" });
});

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);

// Health Check Endpoint
app.get("/api/v1/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "healthy" : "unhealthy";

  res.status(200).json({
    message: "Server is running!",
    dbStatus,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Fallback Route for Undefined Endpoints
app.use((req, res) => {
  console.warn(`[404 NOT FOUND ${new Date().toISOString()}] ${req.method} - ${req.originalUrl}`);
  res.status(404).json({ status: "error", message: "Endpoint not found." });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[ERROR ${new Date().toISOString()}]: ${err.message}`, {
    route: req.originalUrl,
    method: req.method,
  });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Database Connection with Retry Logic
const connectWithRetries = async () => {
  try {
    await connectDB();
    console.log("[DB CONNECTED] Successfully connected to MongoDB.");
  } catch (error) {
    console.error("[DB CONNECTION FAILED] Retrying in 5 seconds...");
    setTimeout(connectWithRetries, 5000); // Retry every 5 seconds
  }
};

// Server Startup
connectWithRetries().then(() => {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`[SERVER STARTED] Running on http://localhost:${PORT}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`[SHUTDOWN SIGNAL RECEIVED] ${signal}. Closing server...`);
    server.close(() => console.log("[SERVER CLOSED]"));
    await mongoose.connection.close();
    console.log("[DB DISCONNECTED] MongoDB connection closed.");
    process.exit(0);
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
});
