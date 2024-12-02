const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// Register a User
const registerUser = async (req, res) => {
  try {
    const { name, phone, password, address } = req.body;

    if (password.length !== 6) {
      return res.status(400).json({ message: "Password must be exactly 6 characters long." });
    }
    if (!address) {
      return res.status(400).json({ message: "Address is required." });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, phone, password: hashedPassword, address });
    await newUser.save();

    // Remove sensitive data before sending response
    const { password: removedPassword, ...userDetails } = newUser._doc;

    res.status(201).json({ message: "User registered successfully", user: userDetails });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Login a User
const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required." });
    }

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user._id, user.role || "user");

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

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

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
