const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// Register a user
const registerUser = async (req, res) => {
    try {
      const { name, phone, password } = req.body;
  
      // Check if the password is exactly 8 characters long
      if (password.length < 8 || password.length > 8) {
        return res
          .status(400)
          .json({ message: "Password must be exactly 8 characters long" });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = new User({ name, phone, password: hashedPassword });
      await newUser.save();
  
      res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  
  

// Login a user
const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Send OTP
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    res.status(200).json({ message: "OTP sent successfully", otp }); // Only for in-app usage
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUserProfile = async (req, res) => {
    try {
      const user = await User.findById(req.user);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const { name, phone } = req.body;
  
      // Update only provided fields
      if (name) user.name = name;
      if (phone) user.phone = phone;
  
      const updatedUser = await user.save();
  
      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          name: updatedUser.name,
          phone: updatedUser.phone,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  
module.exports = { registerUser, loginUser, sendOtp, verifyOtp, updateUserProfile };
