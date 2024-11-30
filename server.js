require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");

// Initialize Database
connectDB()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const app = express();

// Middleware
app.use(cors({ origin: "*" })); // Allow all origins for testing purposes
app.use(express.json());
app.use(helmet());

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
app.get("/", (req, res) => {
  res.status(200).json({ message: "Server is running!" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong!",
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
