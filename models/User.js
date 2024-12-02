const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // User's full name
    phone: { type: String, unique: true, required: true, match: /^[0-9]{10,15}$/ }, // Phone number validation
    address: { type: String, required: true, trim: true }, // User's address (immutable by the user)
    password: { type: String, required: true, select: false }, // Hashed password, excluded by default
    packageName: { type: String, default: "Basic" }, // Default package if not assigned
    packageDetails: {
      speed: { type: String, default: "N/A" }, // Default value if speed is not assigned
      price: { type: Number, default: 0 }, // Default price
    },
    dueDate: { type: Date, default: null }, // Default value if no due date
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"], // Added "overdue" for better status tracking
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
    otp: { type: String, select: false }, // OTP code for login, excluded by default
    otpExpiry: { type: Date, select: false }, // Expiry time for the OTP
    isActive: { type: Boolean, default: true }, // Indicates if the user account is active
  },
  {
    timestamps: true, // Adds `createdAt` and `updatedAt` fields automatically
  }
);

// Index `isActive` and `phone` for optimized queries
userSchema.index({ isActive: 1, phone: 1 });

// Virtual property for full package info
userSchema.virtual("fullPackageInfo").get(function () {
  return `${this.packageName} - ${this.packageDetails.speed} - $${this.packageDetails.price}`;
});

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

// Middleware to clean up expired OTPs
userSchema.pre("save", function (next) {
  if (this.otpExpiry && new Date() > this.otpExpiry) {
    this.otp = null;
    this.otpExpiry = null;
  }
  next();
});

// Middleware to enforce unique phone validation in a human-readable way
userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Phone number already exists. Please use a different phone number."));
  } else {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
