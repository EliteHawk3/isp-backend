const express = require("express");
const {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  updateUserProfile,
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const { otpLimiter } = require("../middlewares/rateLimiter");
const User = require("../models/User");

const router = express.Router();

// Public Routes
router.post("/register", registerUser); // Register a new user
router.post("/login", loginUser); // Login a user
router.post("/send-otp", otpLimiter, sendOtp); // Send OTP with rate limiter
router.post("/verify-otp", verifyOtp); // Verify OTP

// Protected Routes
// Get user profile
router.get("/profile", protect, async (req, res) => {
  try {
    // Extract the user ID from the decoded token payload
    const user = await User.findById(req.user.id); // Use req.user.id instead of req.user
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the user profile data in response
    res.status(200).json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      address: user.address,
      packageName: user.packageName,
      packageDetails: user.packageDetails,
      dueDate: user.dueDate,
      paymentStatus: user.paymentStatus,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", protect, updateUserProfile);

module.exports = router;
