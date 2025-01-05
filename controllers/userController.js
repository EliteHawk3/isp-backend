const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const Joi = require("joi");

// Utility for handling server errors
const handleServerError = (res, error, message = "Server error") => {
  console.error(`[SERVER ERROR ${new Date().toISOString()}]: ${error.message}`);
  res.status(500).json({ status: "error", message });
};

// Joi Validation Schemas
const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required(),
  password: Joi.string().min(6).max(16).required(),
  address: Joi.string().required(),
  cnic: Joi.string()
    .pattern(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/)
    .required(),
  securityQuestion: Joi.string().required(),
  securityAnswer: Joi.string().required(),
  packageName: Joi.string().default("Basic"),
  packageSpeed: Joi.string().default("N/A"),
  installationCosts: Joi.object({
    wireCost: Joi.number().min(0).default(0),
    modemFee: Joi.number().min(0).default(0),
    promo: Joi.number().min(0).max(100).default(0),
  }).optional(),
  role: Joi.string().valid("user", "admin").default("user"), // <-- Add this line
});


const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^\d+$/).required(),
  password: Joi.string().required(),
});

const resetPasswordSchema = Joi.object({
  phone: Joi.string().pattern(/^\d+$/).required(),
  securityAnswer: Joi.string().required(),
  newPassword: Joi.string().min(6).max(16).required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(3),
  phone: Joi.string()
  .pattern(/^\d{10}$/), // Exactly 10 digits

  address: Joi.string(), // Add this line
});


// Register a User
const registerUser = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const {
      name,
      phone,
      password,
      address,
      cnic,
      securityQuestion,
      securityAnswer,
      packageName,
      packageSpeed,
      installationCosts,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ phone }, { cnic }] });
    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.phone === phone
            ? "Phone number already registered."
            : "CNIC already registered.",
      });
    }

    // Hash password and security answer
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Registration Hashed Password:", hashedPassword);
    
    const hashedAnswer = await bcrypt.hash(securityAnswer, 10);

    const newUser = new User({
      name,
      phone,
      cnic,
      password: hashedPassword,
      address,
      securityQuestion,
      securityAnswer: hashedAnswer,
      packageName,
      packageSpeed,
      installationCosts,
      role: req.body.role || "user", // <-- Add this line
    });
    

    await newUser.save();

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
    });
  } catch (error) {
    handleServerError(res, error, "Failed to register user");
  }
};

const loginUser = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Extract and sanitize login data
    const { phone, password } = req.body;
    const sanitizedPhone = phone.trim(); // Trim spaces

    // Find user by phone
    const user = await User.findOne({ phone: sanitizedPhone }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    // Debug Logs
    console.log("Entered Password:", password);
    console.log("Stored Password:", user.password);

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password Match:", isMatch); // Debug this line

    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    // Generate JWT Token
    const token = generateToken(
      user._id.toString(),
      user.role || "user",
      user.phone,
      user.packageName || "Basic",
      user.installationCosts?.promo || 0
    );

    // Send response
    res.status(200).json({
      status: "success",
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        cnic: user.cnic,
        address: user.address,
        role: user.role,
        packageName: user.packageName,
        promo: user.installationCosts?.promo || 0,
      },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to log in user");
  }
};




// Reset Password with Security Question
const resetPassword = async (req, res) => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { phone, securityAnswer, newPassword } = req.body;

    const user = await User.findOne({ phone }).select(
      "+securityAnswer +securityAnswerAttempts +accountLockedUntil"
    );

    if (!user) return res.status(404).json({ message: "User not found." });

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      return res.status(403).json({ message: "Account is locked. Try again later." });
    }

    // Verify security answer
    const isAnswerMatch = await bcrypt.compare(securityAnswer, user.securityAnswer);
    if (!isAnswerMatch) {
      user.securityAnswerAttempts += 1;

      // Lock account after 3 failed attempts
      if (user.securityAnswerAttempts >= 3) {
        user.accountLockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 24 hours
      }

      await user.save();
      return res.status(400).json({ message: "Incorrect security answer." });
    }

    // Reset password
    user.password = await bcrypt.hash(newPassword, 10);
    user.securityAnswerAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    res.status(200).json({ status: "success", message: "Password reset successfully." });
  } catch (error) {
    handleServerError(res, error, "Failed to reset password");
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const { name, phone } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;

    const updatedUser = await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    handleServerError(res, error, "Failed to update profile");
  }
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  updateUserProfile,
};
