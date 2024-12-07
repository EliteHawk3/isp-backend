const mongoose = require("mongoose");

/**
 * Connect to MongoDB with retry logic and exponential backoff.
 * @param {number} retries - Number of retry attempts (default from .env or 5).
 * @param {number} waitTime - Initial wait time between retries in milliseconds (default from .env or 5000ms).
 */
const connectDB = async (retries = process.env.DB_RETRIES || 5, waitTime = process.env.DB_WAIT_TIME || 5000) => {
  const dbURI = process.env.MONGO_URI;

  if (!dbURI) {
    console.error("MongoDB URI is not defined in the .env file. Exiting application.");
    process.exit(1); // Exit the application if the database URI is missing
  }

  let attempt = 0;

  while (retries) {
    try {
      // Attempt to connect to MongoDB
      const conn = await mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout for server selection
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return; // Exit the loop on a successful connection
    } catch (error) {
      console.error(`Error connecting to MongoDB: ${error.message}`);
      console.log(`DB URI: ${dbURI.replace(/\/\/.*@/, "//[REDACTED]")}`); // Mask sensitive credentials
      retries -= 1;
      attempt += 1;

      if (retries === 0) {
        console.error("All retries exhausted. Exiting application.");
        process.exit(1); // Exit after all retries are exhausted
      }

      const backoffTime = Math.min(Math.pow(2, attempt) * 1000, waitTime * retries); // Cap backoff at waitTime * retries
      console.log(`Retries left: ${retries}. Retrying in ${(backoffTime / 1000).toFixed(2)} seconds...`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }
};

// Event listener for MongoDB connection errors
mongoose.connection.on("error", (error) => {
  console.error(`MongoDB connection error: ${error.message}`);
});

// Graceful shutdown on process signals (e.g., SIGINT and SIGTERM)
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log("MongoDB connection closed. Exiting application.");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = connectDB;
