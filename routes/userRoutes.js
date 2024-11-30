const express = require("express");
const { registerUser, loginUser, sendOtp, verifyOtp , updateUserProfile} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const { otpLimiter } = require("../middlewares/rateLimiter");



const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.put("/profile", protect, updateUserProfile);

// Protected route: Get user profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      name: user.name,
      phone: user.phone,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
