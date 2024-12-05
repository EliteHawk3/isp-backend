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
      match: /^\+?[0-9]{10,15}$/, // Accepts phone numbers with or without country codes
    },
    address: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package", // References a dynamic Package model
      default: null,
    },
    packageName: { type: String, default: "Basic" },
    packageDetails: {
      speed: { type: String, default: "N/A" },
      price: { type: Number, default: 0 },
    },
    dueDate: { type: Date, default: null },
    lastPaidDate: { type: Date, default: null }, // Tracks the last payment date
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },
    notifications: [
      {
        notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Notification" },
        read: { type: Boolean, default: false },
        sentAt: { type: Date, default: Date.now }, // Timestamp for when the notification was sent
      },
    ],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }, // For soft delete

    // Security Question and Answer for Password Reset
    securityQuestion: { type: String, required: true }, // Question
    securityAnswer: { type: String, required: true, select: false }, // Answer (hashed)
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Index for optimized queries
userSchema.index({ isActive: 1, phone: 1 });
userSchema.index({ deletedAt: 1 }); // For soft delete optimization
userSchema.index({ paymentStatus: 1, dueDate: 1 }); // Payment-related queries

// Virtual property for full package info
userSchema.virtual("fullPackageInfo").get(function () {
  return `${this.packageName} - ${this.packageDetails.speed} - $${this.packageDetails.price}`;
});

// Virtual property for unread notifications count
userSchema.virtual("unreadNotificationsCount").get(function () {
  return this.notifications
    ? this.notifications.filter((n) => !n.read).length
    : 0;
});

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to find users with overdue payments
userSchema.statics.findOverdueUsers = function () {
  return this.find({
    isActive: true,
    deletedAt: null,
    paymentStatus: "overdue",
  });
};

// Pre-save middleware to clean up expired data
userSchema.pre("save", function (next) {
  // Automatically flag users as "overdue" if their dueDate is in the past
  if (
    this.dueDate &&
    new Date(this.dueDate) < new Date() &&
    this.paymentStatus !== "paid"
  ) {
    this.paymentStatus = "overdue";
  }

  next();
});

// Middleware to enforce unique phone validation with readable errors
userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(
      new Error(
        "Phone number already exists. Please use a different phone number."
      )
    );
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

// Pre-query hook to exclude soft-deleted users
userSchema.pre("find", function () {
  this.where({ deletedAt: null });
});

// Static method for paginated user results
userSchema.statics.paginateUsers = async function (filter, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { ...filter, deletedAt: null }; // Exclude soft-deleted users
  const users = await this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments(query);
  return { users, total, currentPage: page, totalPages: Math.ceil(total / limit) };
};

module.exports = mongoose.model("User", userSchema);
