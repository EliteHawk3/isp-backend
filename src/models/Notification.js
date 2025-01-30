import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Sent", "Pending"], default: "Pending" },
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: false,
  },
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
