const mongoose = require("mongoose");

/**
 * Build MongoDB URI dynamically using environment variables.
 */
const getMongoURI = () => {
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  const host = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;

  // Validate required environment variables
  if (!user || !pass || !host || !dbName) {
    console.error("Missing required database environment variables. Exiting application.");
    process.exit(1);
  }

  // Construct URI dynamically
  return `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority`;
};

/**
 * Connect to MongoDB with retry logic and exponential backoff.
 * @param {number} retries - Number of retry attempts (default from .env or 5).
 * @param {number} waitTime - Initial wait time between retries in milliseconds (default from .env or 5000ms).
 */
const connectDB = async (retries = parseInt(process.env.DB_RETRIES) || 5, waitTime = parseInt(process.env.DB_WAIT_TIME) || 5000) => {
  const dbURI = getMongoURI(); // Fetch URI dynamically
  const debugMode = process.env.DEBUG === "true"; // Enable debug mode

  let attempt = 0;

  while (retries > 0) {
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

      // Mask sensitive credentials in logs
      if (debugMode) {
        console.log(`DB URI: ${dbURI.replace(/\/\/.*@/, "//[REDACTED]")}`);
      }

      retries -= 1;
      attempt += 1;

      if (retries === 0) {
        console.error("All retries exhausted. Exiting application.");
        process.exit(1); // Exit after retries are exhausted
      }

      // Exponential backoff with a cap
      const backoffTime = Math.min(Math.pow(2, attempt) * 1000, waitTime * 2); // Max 2x waitTime
      console.log(
        `Retries left: ${retries}. Retrying in ${(backoffTime / 1000).toFixed(2)} seconds...`
      );

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

  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error(`Error during shutdown: ${error.message}`);
  }

  console.log("Exiting application.");
  process.exit(0);
};

// Listen for shutdown signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = connectDB;
