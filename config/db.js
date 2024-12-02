const mongoose = require("mongoose");

const connectDB = async (retries = process.env.DB_RETRIES || 5, waitTime = process.env.DB_WAIT_TIME || 5000) => {
  const dbURI = process.env.MONGO_URI;

  while (retries) {
    try {
      const conn = await mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      break; // Exit loop if successful
    } catch (err) {
      console.error(`Error connecting to MongoDB: ${err.message}`);
      console.log(`DB URI: ${dbURI.replace(/\/\/.*@/, "//[REDACTED]")}`); // Hide credentials for security
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      if (retries === 0) {
        console.error("All retries exhausted. Exiting application.");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, waitTime)); // Wait before retrying
    }
  }
};

// Listen for connection errors
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

// Graceful shutdown on SIGINT
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed due to app termination (SIGINT)");
  process.exit(0);
});

// Graceful shutdown on SIGTERM
process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed due to app termination (SIGTERM)");
  process.exit(0);
});

module.exports = connectDB;
