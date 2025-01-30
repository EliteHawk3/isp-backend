import AuditLog from "../models/AuditLog.js";

// @desc    Get all audit logs (Admin Only)
// @route   GET /api/audit-logs
export const getAllAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const logs = await AuditLog.find().populate("userId", "name phone");
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an audit log entry
// @route   POST /api/audit-logs
export const createAuditLog = async (
  userId,
  action,
  previousStatus,
  newStatus,
  amount = null
) => {
  try {
    await AuditLog.create({
      userId,
      action,
      previousStatus,
      newStatus,
      amount,
    });
  } catch (error) {
    console.error("Error creating audit log:", error.message);
  }
};
