const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^[a-zA-Z\s]+$/.test(v), // Only letters and spaces
        message: (props) => `${props.value} is not a valid name!`,
      },
    },
    phone: {
      type: String,
      unique: true,
      required: true,
      match: /^[0-9]{10,15}$/, // Phone number validation
    },
    address: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    packageName: { type: String, default: "Basic" },
    packageDetails: {
      speed: { type: String, default: "N/A" },
      price: { type: Number, default: 0 },
    },
    dueDate: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },
    notifications: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Notification" },
    ],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }, // For soft delete
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Index for optimized queries
userSchema.index({ isActive: 1, phone: 1 });
userSchema.index({ deletedAt: 1 }); // For soft delete optimization

// Virtual property for full package info
userSchema.virtual("fullPackageInfo").get(function () {
  return `${this.packageName} - ${this.packageDetails.speed} - $${this.packageDetails.price}`;
});

// Virtual property for unread notifications count
userSchema.virtual("unreadNotificationsCount").get(function () {
  return this.notifications ? this.notifications.filter((n) => !n.read).length : 0;
});

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Pre-save middleware to clean up expired OTPs
userSchema.pre("save", function (next) {
  if (this.otpExpiry && new Date() > this.otpExpiry) {
    this.otp = null;
    this.otpExpiry = null;
  }

  // Automatically flag users as "overdue" if their dueDate is in the past
  if (this.dueDate && new Date(this.dueDate) < new Date() && this.paymentStatus !== "paid") {
    this.paymentStatus = "overdue";
  }

  next();
});

// Middleware to enforce unique phone validation with readable errors
userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("Phone number already exists. Please use a different phone number."));
  } else {
    next(error);
  }
});

// Pre-remove hook for soft delete
userSchema.pre("remove", function (next) {
  this.deletedAt = new Date();
  this.isActive = false;
  next();
});

module.exports = mongoose.model("User", userSchema);
