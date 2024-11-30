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
      default: null, // Expiration date for the notification, if any
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Pre-save middleware to automatically set expiration for priority notifications (optional)
notificationSchema.pre("save", function (next) {
  if (this.priority === "high" && !this.expiresAt) {
    // Set expiration date to 7 days from creation for high-priority notifications
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Static method to clean up expired notifications
notificationSchema.statics.deleteExpired = async function () {
  const now = new Date();
  await this.deleteMany({ expiresAt: { $lt: now } });
};

module.exports = mongoose.model("Notification", notificationSchema);
