import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // Description of action performed
  previousStatus: { type: String, required: false }, // Optional previous state
  newStatus: { type: String, required: false }, // Optional new state
  timestamp: { type: Date, default: Date.now },
  amount: { type: Number, required: false }, // Optional payment amount
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
