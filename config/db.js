const mongoose = require("mongoose");

// Function to connect to MongoDB with retry logic
const connectDB = async (retries = process.env.DB_RETRIES || 5, waitTime = process.env.DB_WAIT_TIME || 5000) => {
  const dbURI = process.env.MONGO_URI; // Ensure MONGO_URI is set correctly in your .env file

  if (!dbURI) {
    console.error("MongoDB URI is not defined in .env file. Exiting application.");
    process.exit(1); // Exit the application if MONGO_URI is missing
  }

  let attempt = 0; // Track retry attempts

  while (retries) {
    try {
      // Attempt to connect to MongoDB
      const conn = await mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout for server selection
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      break; // Exit loop on successful connection
    } catch (err) {
      console.error(`Error connecting to MongoDB: ${err.message}`);
      console.log(`DB URI: ${dbURI.replace(/\/\/.*@/, "//[REDACTED]")}`); // Hide credentials for security
      retries -= 1;
      attempt += 1;
      
      // Exponential backoff: Increasing wait time after each attempt (1s, 2s, 4s, etc.)
      const backoffTime = Math.pow(2, attempt) * 1000; 
      console.log(`Retries left: ${retries}. Retrying in ${backoffTime / 1000} seconds...`);

      if (retries === 0) {
        console.error("All retries exhausted. Exiting application.");
        process.exit(1);
      }

      // Wait before retrying
      await new Promise((res) => setTimeout(res, backoffTime));
    }
  }
};

// Event listener for MongoDB connection errors
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed due to app termination (SIGINT)");
  process.exit(0);
});

// Graceful shutdown on SIGTERM (e.g., from Kubernetes or deployment environments)
process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed due to app termination (SIGTERM)");
  process.exit(0);
});

module.exports = connectDB;
