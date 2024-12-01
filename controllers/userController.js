const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// Register a User
const registerUser = async (req, res) => {
  try {
    const { name, phone, password, address } = req.body;

    // Validate input
    if (password.length !== 6) {
      return res.status(400).json({ message: "Password must be exactly 6 characters long." });
    }
    if (!address) {
      return res.status(400).json({ message: "Address is required." });
    }

    // Check if phone number is already registered
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number is already registered." });
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, phone, password: hashedPassword, address });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required." });
    }

    // Find user and include the password
    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Debug: Log user data
    console.log("User retrieved from DB:", user);

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);
    console.log("Generated token:", token);

    // Return success response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

  

// Send OTP
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log(`OTP for ${phone}: ${otp}`); // For development/testing

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (err) {
    console.error("Send OTP error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("Verify OTP error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { name, phone } = req.body;

    if (req.body.address) {
      return res.status(400).json({ message: "Address cannot be updated by the user." });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  updateUserProfile,
};
