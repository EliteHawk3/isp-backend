const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100, // Subject cannot exceed 100 characters
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000, // Description cannot exceed 1000 characters
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    adminComments: [
      {
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Reference to admin user
        },
        comment: { type: String, trim: true, maxlength: 500 }, // Limit comment length
        addedAt: { type: Date, default: Date.now },
      },
    ],
    deleted: {
      type: Boolean,
      default: false, // Soft delete flag
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ deleted: 1 });

// Static method to fetch tickets for a user
supportTicketSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId, deleted: false }).sort({ createdAt: -1 });
};

// Static method to fetch tickets by status
supportTicketSchema.statics.findByStatus = function (status) {
  return this.find({ status, deleted: false }).sort({ createdAt: -1 });
};

// Static method to fetch high-priority tickets
supportTicketSchema.statics.findHighPriority = function () {
  return this.find({ priority: "high", deleted: false }).sort({ createdAt: -1 });
};

// Static method for paginated tickets
supportTicketSchema.statics.paginateTickets = async function (filter, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { ...filter, deleted: false };
  const tickets = await this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments(query);
  return { tickets, total, currentPage: page, totalPages: Math.ceil(total / limit) };
};

// Static method to soft delete a ticket
supportTicketSchema.statics.softDeleteById = async function (id) {
  return this.findByIdAndUpdate(id, { deleted: true }, { new: true });
};

// Middleware to validate status transitions
supportTicketSchema.pre("save", function (next) {
  const validTransitions = {
    open: ["in_progress", "resolved", "closed"],
    in_progress: ["resolved", "closed"],
    resolved: ["closed"],
    closed: [],
  };

  if (this.isModified("status")) {
    const previousStatus = this.get("status");
    if (!validTransitions[previousStatus]?.includes(this.status)) {
      return next(
        new Error(
          `Invalid status transition from ${previousStatus} to ${this.status}`
        )
      );
    }
  }
  next();
});

// Middleware to log ticket updates
supportTicketSchema.post("save", function (doc) {
  console.log(
    `Support ticket [ID: ${doc._id}, Status: ${doc.status}] was updated.`
  );
});

// Middleware to log ticket soft deletion
supportTicketSchema.post("findOneAndUpdate", function (doc) {
  if (doc.deleted) {
    console.log(`Support ticket [ID: ${doc._id}] was soft-deleted.`);
  }
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
