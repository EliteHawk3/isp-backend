const express = require("express");
const {
  addUser,
  updateUser,
  deactivateUser,
  viewUsers,
  sendNotification,
  viewReports,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const Package = require("../models/Package");

const router = express.Router();

// Middleware: Protect all admin routes and ensure only admins can access them
router.use(protect, adminOnly);

// Utility function for handling server errors
const handleServerError = (res, error, customMessage = "Server error") => {
  console.error(`[SERVER ERROR]: ${error.message}`);
  res.status(500).json({ message: customMessage });
};

/** 
 * User Management Routes 
 */
router.post("/users", addUser); // Add a new user
router.put("/users/:userId", updateUser); // Update user details
router.delete("/users/:userId", deactivateUser); // Deactivate (soft delete) a user
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ isActive: true });

    res.status(200).json({
      users,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    handleServerError(res, err, "Failed to fetch users");
  }
});

/** 
 * Notification Routes 
 */
router.post("/notifications/:userId", sendNotification); // Send a notification to a user

/** 
 * Reporting and Analytics Routes 
 */
router.get("/reports", viewReports); // View aggregated reports

// Fetch audit logs with optional filters
router.get("/audit-logs", async (req, res) => {
  try {
    const { adminId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filters = {};
    if (adminId) filters.adminId = adminId;
    if (startDate && endDate) {
      filters.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const logs = await AuditLog.find(filters)
      .populate("adminId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filters);

    res.status(200).json({
      logs,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    handleServerError(res, err, "Failed to fetch audit logs");
  }
});

// Fetch analytics data
router.get("/analytics", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const overduePayments = await User.countDocuments({
      paymentStatus: "overdue",
    });
    const activePackages = await Package.find({ isActive: true }).select(
      "name speed price"
    );
    const packageUsage = await User.aggregate([
      {
        $group: {
          _id: "$packageName",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      totalUsers,
      overduePayments,
      activePackages,
      packageUsage,
    });
  } catch (err) {
    handleServerError(res, err, "Failed to fetch analytics data");
  }
});

/** 
 * Fallback Route
 * Handles undefined endpoints.
 */
router.all("*", (req, res) => {
  res.status(404).json({ message: "Admin endpoint not found" });
});

module.exports = router;
