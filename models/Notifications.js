const mongoose = require("mongoose");

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
        // Default expiration for all notifications: 30 days unless specified
        return this.priority === "high"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for high-priority
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for others
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Add indexes for frequently queried fields
notificationSchema.index({ userId: 1, forAll: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ priority: 1 });

// Virtuals for computed fields
notificationSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save middleware for logging or analytics
notificationSchema.pre("save", function (next) {
  if (this.isNew) {
    console.log(`New notification created: ${this.title}`);
  }
  next();
});

// Static method to clean up expired notifications
notificationSchema.statics.deleteExpired = async function () {
  const now = new Date();
  const result = await this.deleteMany({ expiresAt: { $lt: now } });
  console.log(`Deleted ${result.deletedCount} expired notifications.`);
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );
  console.log(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
};

// Export the model
module.exports = mongoose.model("Notification", notificationSchema);
