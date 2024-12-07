const express = require("express");
const {
  registerUser,
  loginUser,
  updateUserProfile,
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// Utility function for error handling
const handleServerError = (res, error, customMessage = "Server error") => {
  console.error(`[SERVER ERROR]: ${error.message}`);
  res.status(500).json({ status: "error", message: customMessage });
};

// Public Routes
// Register a new user
router.post("/register", registerUser);
// Login a user
router.post("/login", loginUser);

// Protected Routes
// Fetch user profile
router.get("/profile", protect, async (req, res) => {
  try {
    const fieldsToSelect =
      "name phone address cnic packageName packageDetails dueDate paymentStatus";
    const user = await User.findById(req.user.id).select(fieldsToSelect);

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    res.status(200).json({ status: "success", data: user });
  } catch (err) {
    handleServerError(res, err, "Error fetching user profile");
  }
});

// Update user profile
router.put("/profile", protect, updateUserProfile);

// Fetch user dashboard
router.get("/dashboard", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name phone cnic packageName paymentStatus dueDate notifications");

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // Calculate unread notifications count
    const unreadNotificationsCount = user.notifications.filter(
      (n) => !n.read
    ).length;

    // Paginate notifications
    const { page = 1, limit = 5 } = req.query;
    const skip = (page - 1) * limit;
    const paginatedNotifications = user.notifications.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      status: "success",
      data: {
        profile: {
          name: user.name,
          phone: user.phone,
          cnic: user.cnic,
          packageName: user.packageName,
          paymentStatus: user.paymentStatus,
          dueDate: user.dueDate,
        },
        notifications: {
          total: user.notifications.length,
          unreadCount: unreadNotificationsCount,
          list: paginatedNotifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(user.notifications.length / limit),
          },
        },
      },
    });
  } catch (err) {
    handleServerError(res, err, "Error fetching dashboard data");
  }
});

// Fallback route for undefined endpoints
router.all("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "The requested endpoint does not exist. Please check the URL.",
  });
});

module.exports = router;
