const express = require("express");
const {
  addUser,
  updateUser,
  deactivateUser,
  viewUsers,
  sendNotification,
  viewReports,
  viewAnalytics,
  viewAdmins
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const { roleCheck } = require("../middlewares/roleMiddleware"); // Import roleCheck

// Initialize router
const router = express.Router();

// Middleware: Protect all admin routes and restrict access to admins only
router.use(protect, adminOnly);

// Utility function for server errors
const handleServerError = (res, error, message = "Server error") => {
  console.error(`[SERVER ERROR ${new Date().toISOString()}]: ${error.message}`);
  res.status(500).json({ status: "error", message });
};

/** 
 * User Management Routes 
 */
// Add a new user
router.post("/users", addUser);

// Update user details
router.put("/users/:userId", updateUser);

// Deactivate (soft delete) a user
router.delete("/users/:userId", deactivateUser);

// View all users with filters and pagination
router.get("/users", viewUsers);


/** 
 * Notification Routes 
 */
// Send notification to a user
router.post("/notifications/:userId", sendNotification);

/** 
 * Reporting and Analytics Routes 
 */
// View aggregated reports
router.get("/reports", viewReports);

// Fetch analytics data
router.get("/analytics", viewAnalytics);

router.get("/admins", roleCheck("admin"), viewAdmins);

/** 
 * Fallback Route
 * Handles undefined admin routes
 */
router.all("*", (req, res) => {
  console.warn(`[404 NOT FOUND] ${req.method} - ${req.originalUrl}`);
  res.status(404).json({
    status: "error",
    message: "Admin endpoint not found",
  });
});

module.exports = router;
