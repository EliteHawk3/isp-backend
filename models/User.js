const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// User Schema
const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^[a-zA-Z\s]+$/.test(v),
        message: (props) => `${props.value} is not a valid name!`,
      },
    },
    phone: {
      type: String,
      unique: true,
      required: true,
      match: /^\+?[1-9][0-9]{9,14}$/, // Validate phone with optional country code
    },
    password: { type: String, required: true, select: false }, // Hidden by default

    // Role and Access Control
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }, // Soft delete timestamp

    // Security Questions
    securityQuestion: { type: String, required: true },
    securityAnswer: { type: String, required: true, select: false },
    securityAnswerAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date, default: null },

    // User-Specific Fields (conditional for role: "user")
    address: { type: String, trim: true },
    cnic: {
      type: String,
      unique: true,
      match: /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/, // CNIC validation
    },
    packageName: { type: String, default: "Basic" },
    packageSpeed: { type: String, default: "N/A" },
    installationCosts: {
      wireCost: { type: Number, default: 0 },
      modemFee: { type: Number, default: 0 },
      promo: {
        type: Number,
        default: 0,
        min: [0, "Promo must be at least 0%."],
        max: [100, "Promo cannot exceed 100%."],
      },
    },

    // Payment Tracking
    dueDate: { type: Date, default: null },
    lastPaidDate: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },

    // Notifications
    unreadCount: { type: Number, default: 0 }, // Tracks unread notifications
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Conditional Requirements for Role: "user"
userSchema.pre("validate", function (next) {
  if (this.role === "user") {
    if (!this.address) return next(new Error("Address is required for users."));
    if (!this.cnic) return next(new Error("CNIC is required for users."));
    if (!this.packageName) return next(new Error("Package Name is required for users."));
    if (!this.packageSpeed) return next(new Error("Package Speed is required for users."));
    if (!this.installationCosts.wireCost && this.installationCosts.wireCost !== 0)
      return next(new Error("Wire Cost is required for users."));
    if (!this.installationCosts.modemFee && this.installationCosts.modemFee !== 0)
      return next(new Error("Modem Fee is required for users."));
  }
  next();
});

// Indexes for optimization
userSchema.index({ isActive: 1, phone: 1 });
userSchema.index({ cnic: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ paymentStatus: 1, dueDate: 1 });
userSchema.index({ role: 1 });

// Pre-save hook for payment updates
userSchema.pre("save", function (next) {
  if (this.role === "user") {
    const { wireCost, modemFee, promo } = this.installationCosts;
    const discount = (promo / 100) * (wireCost + modemFee);
    const totalCost = wireCost + modemFee - discount;

    // Mark overdue
    if (
      this.dueDate &&
      new Date(this.dueDate) < new Date() &&
      this.paymentStatus !== "paid" &&
      totalCost > 0
    ) {
      this.paymentStatus = "overdue";
    }
  }
  next();
});

// Pre-save hook to hash passwords
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && !this.password.startsWith("$2b$")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("securityAnswer") && !this.securityAnswer.startsWith("$2b$")) {
    this.securityAnswer = await bcrypt.hash(this.securityAnswer, 10);
  }
  next();
});

// Pre-query hook to exclude soft-deleted users
userSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

// Middleware for unique constraints
userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    if (error.keyValue.cnic) {
      next(new Error("CNIC already exists. Use a different one."));
    } else if (error.keyValue.phone) {
      next(new Error("Phone number already exists."));
    } else {
      next(error);
    }
  } else {
    next(error);
  }
});

// Soft delete method
userSchema.pre("remove", function (next) {
  this.deletedAt = new Date();
  this.isActive = false;
  next();
});

// Export the model
module.exports = mongoose.model("User", userSchema);
