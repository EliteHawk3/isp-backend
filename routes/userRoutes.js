const express = require("express");
const {
  registerUser,
  loginUser,
  updateUserProfile,
  resetPassword,
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Initialize router
const router = express.Router();

// Utility for handling server errors
const handleServerError = (res, error, message = "Server error") => {
  console.error(`[SERVER ERROR ${new Date().toISOString()}]: ${error.message}`);
  res.status(500).json({ status: "error", message });
};

/** 
 * Public Routes
 */
// User registration
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

// Reset password with security question
router.post("/reset-password", resetPassword);

/** 
 * Protected Routes
 */
// Fetch user profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name phone address cnic packageName packageSpeed installationCosts dueDate paymentStatus"
    );

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User profile not found.",
      });
    }

    // Calculate total cost
    const { wireCost, modemFee, promo } = user.installationCosts;
    const discount = (promo / 100) * (wireCost + modemFee);
    const totalCost = wireCost + modemFee - discount;

    res.status(200).json({
      status: "success",
      data: {
        ...user.toObject(),
        totalCost: totalCost.toFixed(2),
      },
    });
  } catch (err) {
    handleServerError(res, err, "Failed to fetch user profile");
  }
});

// Update user profile
router.put("/profile", protect, updateUserProfile);
// Fetch user dashboard data
router.get("/dashboard", protect, async (req, res) => {
  try {
    // Fetch user profile
    const user = await User.findById(req.user.id).select(
      "name phone cnic packageName packageSpeed installationCosts paymentStatus dueDate role"
    );

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
      });
    }

    // Handle admin case: Skip fields like packages, costs, and due dates
    if (user.role === "admin") {
      return res.status(200).json({
        status: "success",
        data: {
          profile: {
            name: user.name,
            phone: user.phone,
            role: user.role,
          },
          notifications: {
            total: 0,
            unreadCount: 0,
            list: [],
            totalPages: 0,
          },
        },
      });
    }

    // Calculate unread notifications
    const { page = 1, limit = 5 } = req.query;
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalNotifications = await Notification.countDocuments({ userId: req.user.id });
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });

    // Calculate total cost
    const { wireCost, modemFee, promo } = user.installationCosts;
    const discount = (promo / 100) * (wireCost + modemFee);
    const totalCost = wireCost + modemFee - discount;

    res.status(200).json({
      status: "success",
      data: {
        profile: {
          name: user.name,
          phone: user.phone,
          cnic: user.cnic,
          packageName: user.packageName,
          packageSpeed: user.packageSpeed,
          paymentStatus: user.paymentStatus,
          dueDate: user.dueDate,
          totalCost: totalCost.toFixed(2),
        },
        notifications: {
          total: totalNotifications,
          unreadCount,
          list: notifications,
          totalPages: Math.ceil(totalNotifications / limit),
        },
      },
    });
  } catch (err) {
    handleServerError(res, err, "Failed to fetch dashboard data");
  }
});

/** 
 * Fallback Route
 * Handles undefined routes
 */
router.all("*", (req, res) => {
  console.warn(`[404 NOT FOUND ${new Date().toISOString()}] ${req.method} - ${req.originalUrl}`);
  res.status(404).json({
    status: "error",
    message: "Endpoint not found. Please check the URL.",
  });
});

module.exports = router;
