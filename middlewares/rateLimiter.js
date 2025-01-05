const mongoose = require("mongoose");

// Notification Schema
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Linked User ID
    title: { type: String, required: true, trim: true }, // Notification title
    message: { type: String, required: true, trim: true }, // Notification message
    type: { type: String, enum: ["info", "warning", "alert"], default: "info" }, // Notification type
    priority: { type: Number, default: 1 }, // Priority for sorting (1 = low, 5 = high)
    read: { type: Boolean, default: false }, // Read status
    deleted: { type: Boolean, default: false }, // Soft delete status
    sentAt: { type: Date, default: Date.now }, // Sent timestamp
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Indexes for optimized queries
notificationSchema.index({ userId: 1, read: 1, sentAt: -1 });
notificationSchema.index({ type: 1, priority: -1 });

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function (userId, notificationIds) {
  return this.updateMany(
    { _id: { $in: notificationIds }, userId },
    { $set: { read: true } }
  );
};

// Static method to fetch unread notifications
notificationSchema.statics.fetchUnread = async function (userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { userId, read: false, deleted: false };

  const notifications = await this.find(query).sort({ priority: -1, sentAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments(query);

  return { notifications, total, currentPage: page, totalPages: Math.ceil(total / limit) };
};

// Static method for paginated notifications
notificationSchema.statics.fetchPaginated = async function (userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { userId, deleted: false };

  const notifications = await this.find(query).sort({ sentAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments(query);

  return { notifications, total, currentPage: page, totalPages: Math.ceil(total / limit) };
};

// Soft delete notifications
notificationSchema.statics.softDelete = async function (userId, notificationIds) {
  return this.updateMany(
    { _id: { $in: notificationIds }, userId },
    { $set: { deleted: true } }
  );
};

// Clear all notifications for a user
notificationSchema.statics.clearAll = async function (userId) {
  return this.updateMany({ userId }, { $set: { deleted: true } });
};

// Export the model
module.exports = mongoose.model("Notification", notificationSchema);
