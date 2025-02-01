import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT Token (Now includes user role)
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register new user (Only "user" role allowed)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, phone, cnic, address, password, role } = req.body;

    // Prevent users from setting themselves as admin
    if (role === "admin") {
      return res.status(403).json({ message: "Cannot register as admin" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      name,
      phone,
      cnic,
      address,
      password: hashedPassword,
      role: "user", // Force "user" role to prevent unauthorized admin creation
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token: generateToken(user.id, user.role),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    console.log("🔹 Login attempt for name:", name);
    console.log("🔹 Password entered by user:", password);

    const user = await User.findOne({ name });
    if (!user) {
      console.log("❌ User not found in DB");
      return res.status(401).json({ message: "No user with this name" });
    }

    console.log("✅ User found in DB:", user);
    console.log("🔹 Hashed Password in Database:", user.password);

    // Compare passwords using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔹 Password Match Result:", isMatch);

    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(401).json({ message: "Incorrect password" });
    }

    console.log("✅ Password is correct. Logging in...");

    res.json({
      _id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error("🔥 Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser, getUserProfile };
