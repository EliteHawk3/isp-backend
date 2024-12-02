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

// Utility function for error handling
const handleServerError = (res, error, customMessage = "Server error") => {
  console.error(`[SERVER ERROR]: ${error.message}`);
  res.status(500).json({ message: customMessage });
};

// Log imported handlers for debugging
console.log({ registerUser, loginUser, sendOtp, verifyOtp, updateUserProfile });

// Public Routes
router.post("/register", registerUser); // Register a new user
router.post("/login", loginUser); // Login a user

// Debug send-otp route
router.post("/send-otp", otpLimiter, (req, res) => {
  console.log("Send OTP route hit");
  if (sendOtp) {
    sendOtp(req, res);
  } else {
    res.status(500).json({ message: "Send OTP handler not defined" });
  }
});

// Debug verify-otp route
router.post("/verify-otp", (req, res) => {
  console.log("Verify OTP route hit");
  if (verifyOtp) {
    verifyOtp(req, res);
  } else {
    res.status(500).json({ message: "Verify OTP handler not defined" });
  }
});

// Protected Routes
router.get("/profile", protect, async (req, res) => {
  try {
    const fieldsToSelect =
      "name phone address packageName packageDetails dueDate paymentStatus";
    const user = await User.findById(req.user.id).select(fieldsToSelect);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    handleServerError(res, err, "Error fetching user profile");
  }
});

router.put("/profile", protect, updateUserProfile);

// Fallback route for undefined endpoints
router.all("*", (req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

module.exports = router;
