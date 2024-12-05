const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (admin)
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "READ", "LOGIN", "LOGOUT", "LOGIN_FAILED"], // Expanded action types
    },
    target: {
      type: String,
      required: true, // The type of resource modified (e.g., User, Package, Notification)
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId, // ID of the resource being modified
      required: false, // Optional
    },
    description: {
      type: String,
      required: true, // Details about the action
      trim: true,
      maxlength: 500, // Limit the description length
    },
    ipAddress: {
      type: String, // Store the IP address of the admin
      required: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Indexes for efficient querying
auditLogSchema.index({ adminId: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetId: 1 });

// Pre-save middleware to ensure consistent formatting
auditLogSchema.pre("save", function (next) {
  if (this.description) {
    this.description = this.description.trim();
  }
  next();
});

// Static method to fetch logs by admin
auditLogSchema.statics.findByAdmin = function (adminId) {
  return this.find({ adminId }).sort({ createdAt: -1 });
};

// Static method to fetch logs by action
auditLogSchema.statics.findByAction = function (action) {
  return this.find({ action }).sort({ createdAt: -1 });
};

// Static method to fetch logs for a specific time range
auditLogSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ createdAt: -1 });
};

// Static method for paginated logs
auditLogSchema.statics.paginateLogs = function (filter, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
