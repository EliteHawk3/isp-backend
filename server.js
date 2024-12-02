require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");

// Validate Environment Variables
if (!process.env.MONGO_URI || !process.env.JWT_SECRET || !process.env.PORT) {
  console.error("Critical environment variables are missing. Please check your .env file.");
  process.exit(1);
}

// Initialize Database
connectDB()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const app = express();

// Middleware
app.use(cors({ origin: "*" })); // Adjust origin in production
app.use(express.json());
app.use(helmet());
app.use(morgan("dev")); // Logs HTTP requests

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", apiLimiter);

// Routes
app.use("/api/users", userRoutes);

// Health Check Endpoint
app.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "healthy" : "unhealthy";
  res.status(200).json({ message: "Server is running!", dbStatus });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong!",
  });
});

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
