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
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put("/profile", protect, updateUserProfile);

module.exports = router;
