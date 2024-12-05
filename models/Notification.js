const mongoose = require("mongoose");

const PRIORITY_EXPIRATION = {
  low: 30, // Days
  medium: 15, // Days
  high: 7, // Days
};

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Title of the notification
    message: { type: String, required: true }, // Main content of the notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Null for general announcements
    },
    forAll: { type: Boolean, default: true }, // True for broadcast to all users
    audience: {
      type: String,
      enum: ["all", "admins", "users"], // Example audience categories
      default: "all",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"], // Priority levels
      default: "low",
    },
    read: {
      type: Boolean,
      default: false, // Tracks whether a user has read the notification
    },
    expiresAt: {
      type: Date,
      default: function () {
        const daysToExpire = PRIORITY_EXPIRATION[this.priority];
        return new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);
      },
    },
    deleted: {
      type: Boolean,
      default: false, // Soft delete flag
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Add indexes for frequently queried fields
notificationSchema.index({ userId: 1, forAll: 1, deleted: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ priority: 1 });

// Virtuals for computed fields
notificationSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save middleware for logging
notificationSchema.pre("save", function (next) {
  if (this.isNew) {
    console.log(`New notification created: ${this.title}`);
  }
  next();
});

// Static method to clean up expired notifications (soft delete)
notificationSchema.statics.softDeleteExpired = async function () {
  const now = new Date();
  const result = await this.updateMany({ expiresAt: { $lt: now } }, { $set: { deleted: true } });
  console.log(`Soft-deleted ${result.modifiedCount} expired notifications.`);
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  const query = userId ? { userId, read: false, deleted: false } : { forAll: true, read: false, deleted: false };
  const result = await this.updateMany(query, { $set: { read: true } });
  return result.modifiedCount;
};

// Static method to fetch unread notifications for a user
notificationSchema.statics.fetchUnread = async function (userId) {
  const query = userId ? { userId, read: false, deleted: false } : { forAll: true, read: false, deleted: false };
  return this.find(query).sort({ createdAt: -1 });
};

// Static method for paginated notifications
notificationSchema.statics.fetchPaginated = async function (filter, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { ...filter, deleted: false }; // Ensure soft-deleted notifications are excluded
  const notifications = await this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments(query);
  return { notifications, total, currentPage: page, totalPages: Math.ceil(total / limit) };
};

// Export the model
module.exports = mongoose.model("Notification", notificationSchema);
