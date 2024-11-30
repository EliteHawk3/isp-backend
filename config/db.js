const mongoose = require("mongoose");

const connectDB = async (retries = 5, waitTime = 5000) => {
  const dbURI = process.env.MONGO_URI; // Use a single environment variable for MongoDB URI

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
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      if (retries === 0) process.exit(1); // Exit if no retries left
      await new Promise((res) => setTimeout(res, waitTime)); // Wait before retrying
    }
  }
};

// Listen for connection errors
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed due to app termination");
  process.exit(0);
});

module.exports = connectDB;
