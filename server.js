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
const supportRoutes = require("./routes/supportRoutes");

// Validate Environment Variables
["MONGO_URI", "JWT_SECRET", "PORT", "NODE_ENV"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

// App Initialization
const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Middleware
app.use(cors({ origin: isProduction ? process.env.CORS_ORIGIN : "*" }));
app.use(express.json());
app.use(helmet());
if (!isProduction) app.use(morgan("dev")); // Logging only in non-production

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", generalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: "Too many login attempts, please try again later.",
});
app.use("/api/v1/users/login", loginLimiter);

// Root Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the ISP Management API!" });
});

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);

// Health Check Endpoint
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "healthy" : "unhealthy";
  res.status(200).json({
    message: "Server is running!",
    dbStatus,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

// 404 Fallback Route
app.use((req, res) => {
  res.status(404).json({ message: "The requested endpoint does not exist." });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[ERROR]: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Initialize Database with Retry Logic
const connectWithRetries = async () => {
  try {
    await connectDB(); // Calls the retry-enabled connectDB function
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Initial database connection failed, retrying...");
    setTimeout(connectWithRetries, 5000); // Retry every 5 seconds
  }
};

// Start with DB connection and then start the server
connectWithRetries().then(() => {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Closing server...`);
    server.close(() => console.log("Server closed."));
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
});
