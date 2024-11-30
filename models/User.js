const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // User's full name
    phone: { type: String, unique: true, required: true }, // Unique phone number
    address: { type: String, required: true }, // User's address (immutable by the user)
    password: { type: String, required: true, select: false }, // Hashed password, excluded by default
    packageName: { type: String }, // Name of the package assigned to the user
    packageDetails: {
      speed: { type: String }, // Speed of the package (e.g., "50 Mbps")
      price: { type: Number }, // Price charged to the user
    },
    dueDate: { type: Date }, // Payment due date for the user's subscription
    paymentStatus: {
      type: String,
      enum: ["paid", "pending"], // Indicates whether the payment is made
      default: "pending", // Default value is "pending"
    },
    notifications: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Notification" }, // Reference to Notification model
    ],
    role: {
      type: String,
      enum: ["user", "admin"], // Role-based access control (user or admin)
      default: "user",
    },
    otp: { type: String }, // OTP code for login
    otpExpiry: { type: Date }, // Expiry time for the OTP
    isActive: { type: Boolean, default: true }, // Indicates if the user account is active
  },
  {
    timestamps: true, // Adds `createdAt` and `updatedAt` fields automatically
  }
);

module.exports = mongoose.model("User", userSchema);
