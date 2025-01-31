import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  packageName: { type: String, required: true }, // Stores package name at payment time
  costAtPaymentTime: { type: Number, required: true },
  discountedAmount: { type: Number, required: true },
  discountAtPaymentTime: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Paid", "Pending", "Overdue"],
    default: "Pending",
  },
  date: { type: Date, default: Date.now }, // Actual date payment is created
  dueDate: { type: Date, required: true }, // Payment deadline
  paidDate: { type: Date }, // When the payment was actually paid
  deleted: { type: Boolean, default: false }, // ✅ Soft delete flag
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
