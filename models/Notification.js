const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Link to User
    title: { type: String, required: true, trim: true }, // Notification title
    message: { type: String, required: true, trim: true }, // Notification content
    read: { type: Boolean, default: false }, // Tracks whether the notification has been read
    deleted: { type: Boolean, default: false }, // Soft delete option
    sentAt: { type: Date, default: Date.now }, // Timestamp for when the notification was sent
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Indexes for optimized queries
notificationSchema.index({ userId: 1, read: 1, sentAt: -1 });

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
  const notifications = await this.find(query).sort({ sentAt: -1 }).skip(skip).limit(limit);
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

// Export the model
module.exports = mongoose.model("Notification", notificationSchema);
