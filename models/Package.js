const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Name of the package
    speed: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\d+ (Mbps|Gbps)$/i.test(v), // Format: "100 Mbps" or "1 Gbps"
        message: (props) => `${props.value} is not a valid speed format!`,
      },
    },
    userCost: { type: Number, required: true, min: 0 }, // Cost charged to the user
    providerCost: { type: Number, required: true, min: 0 }, // Cost paid to the provider
    durationInDays: { type: Number, default: 30, min: 1 }, // Duration in days
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // Discount as a percentage
      validate: {
        validator: (v) => v >= 0 && v <= 100,
        message: "Discount must be between 0 and 100.",
      },
    },
    totalCost: {
      type: Number,
      required: true,
      default: function () {
        const discountAmount = (this.userCost * this.discount) / 100;
        return this.userCost - discountAmount;
      },
    },
    description: {
      type: String,
      default: function () {
        return `${this.name} - ${this.speed} Plan`;
      },
      maxlength: 500,
    }, // Optional description with a default generator
    isActive: { type: Boolean, default: true }, // Whether the package is active
    deletedAt: { type: Date, default: null }, // For soft delete
    expiresAt: { type: Date, default: null }, // Optional expiration field
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  }
);

// Pre-save hook to recalculate `totalCost` when relevant fields change
packageSchema.pre("save", function (next) {
  if (this.isModified("userCost") || this.isModified("discount")) {
    const discountAmount = (this.userCost * this.discount) / 100;
    this.totalCost = this.userCost - discountAmount;
  }

  if (!this.description) {
    this.description = `${this.name} - ${this.speed} Plan`;
  }

  next();
});

// Static method to retrieve all active (non-deleted) packages
packageSchema.statics.findActivePackages = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to calculate profit margin for all packages
packageSchema.statics.calculateProfit = function () {
  return this.aggregate([
    {
      $project: {
        name: 1,
        profit: {
          $cond: [
            { $gte: ["$userCost", "$providerCost"] },
            { $subtract: ["$userCost", "$providerCost"] },
            0, // Prevent negative profit
          ],
        },
        margin: {
          $cond: [
            { $gt: ["$userCost", 0] },
            {
              $multiply: [
                { $divide: [{ $subtract: ["$userCost", "$providerCost"] }, "$userCost"] },
                100,
              ],
            },
            0, // Prevent division by zero
          ],
        },
      },
    },
  ]);
};

// Static method to paginate active packages
packageSchema.statics.paginatePackages = async function (page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const query = { isActive: true, deletedAt: null };
  const packages = await this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await this.countDocuments(query);
  return { packages, total, currentPage: page, totalPages: Math.ceil(total / limit) };
};

// Static method to soft delete a package by ID
packageSchema.statics.softDeleteById = async function (id) {
  return this.findByIdAndUpdate(
    id,
    { deletedAt: new Date(), isActive: false },
    { new: true }
  );
};

// Static method to restore a soft-deleted package
packageSchema.statics.restoreById = async function (id) {
  return this.findByIdAndUpdate(
    id,
    { deletedAt: null, isActive: true },
    { new: true }
  );
};

// Static method to find expiring packages
packageSchema.statics.findExpiringSoon = function (days = 7) {
  const now = new Date();
  const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return this.find({ expiresAt: { $lte: soon }, isActive: true, deletedAt: null });
};

// Index `isActive`, `deletedAt`, and `expiresAt` for efficient queries
packageSchema.index({ isActive: 1, deletedAt: 1, expiresAt: 1 });

module.exports = mongoose.model("Package", packageSchema);
