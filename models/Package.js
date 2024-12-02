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
    discount: { type: Number, default: 0, min: 0, max: 100 }, // Discount in percentage
    totalCost: {
      type: Number,
      required: true,
      default: function () {
        const discountAmount = (this.userCost * this.discount) / 100;
        return this.userCost - discountAmount;
      },
    },
    description: { type: String, default: "", maxlength: 500 }, // Optional description with length limit
    isActive: { type: Boolean, default: true }, // Whether the package is active
    deletedAt: { type: Date, default: null }, // For soft delete
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  }
);

// Pre-save hook to recalculate `totalCost` when relevant fields change
packageSchema.pre("save", function (next) {
  const discountAmount = (this.userCost * this.discount) / 100;
  this.totalCost = this.userCost - discountAmount;
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
        profit: { $subtract: ["$userCost", "$providerCost"] },
        margin: {
          $multiply: [
            { $divide: [{ $subtract: ["$userCost", "$providerCost"] }, "$userCost"] },
            100,
          ],
        },
      },
    },
  ]);
};

// Static method to soft delete a package by ID
packageSchema.statics.softDeleteById = async function (id) {
  return this.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false }, { new: true });
};

// Index `isActive` and `deletedAt` for faster querying of active packages
packageSchema.index({ isActive: 1, deletedAt: 1 });

module.exports = mongoose.model("Package", packageSchema);
