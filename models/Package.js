const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Name of the package (e.g., "Premium 100 Mbps")
    speed: { type: String, required: true }, // Speed of the package (e.g., "100 Mbps")
    userCost: { type: Number, required: true, min: 0 }, // Cost charged to the user
    providerCost: { type: Number, required: true, min: 0 }, // Cost paid to the provider
    durationInDays: { type: Number, default: 30, min: 1 }, // Duration of the package in days (default: 30 days)
    discount: { type: Number, default: 0, min: 0, max: 100 }, // Discount offered on the package (e.g., 10%)
    totalCost: {
      type: Number,
      required: true,
      default: function () {
        // Calculate total cost: userCost - discount
        const discountAmount = (this.userCost * this.discount) / 100;
        return this.userCost - discountAmount;
      },
    },
    description: { type: String, default: "" }, // Optional description of the package
    isActive: { type: Boolean, default: true }, // Whether the package is currently active
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

// Pre-save hook to ensure `totalCost` is recalculated when relevant fields change
packageSchema.pre("save", function (next) {
  const discountAmount = (this.userCost * this.discount) / 100;
  this.totalCost = this.userCost - discountAmount;
  next();
});

// Static method to retrieve all active packages
packageSchema.statics.findActivePackages = function () {
  return this.find({ isActive: true });
};

// Static method to calculate profit margin for packages
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

// Index `isActive` for faster querying of active packages
packageSchema.index({ isActive: 1 });

module.exports = mongoose.model("Package", packageSchema);
