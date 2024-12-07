const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const Joi = require("joi");

// Utility function for handling server errors
const handleServerError = (res, error, customMessage = "Server error") => {
  console.error(`[SERVER ERROR]: ${error.message}`);
  res.status(500).json({ message: customMessage });
};

// Joi validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.string().pattern(/^\d+$/).required(),
  password: Joi.string().min(6).max(16).required(),
  address: Joi.string().required(),
  cnic: Joi.string()
    .pattern(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/) // Validates CNIC format
    .required(),
  securityQuestion: Joi.string().required(),
  securityAnswer: Joi.string().required(),
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

// Register a User
const registerUser = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone, password, address, cnic, securityQuestion, securityAnswer } = req.body;

    const existingUser = await User.findOne({ $or: [{ phone }, { cnic }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.phone === phone
          ? "Phone number is already registered."
          : "CNIC is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer = await bcrypt.hash(securityAnswer, 10);

    const newUser = new User({
      name,
      phone,
      cnic,
      password: hashedPassword,
      address,
      securityQuestion,
      securityAnswer: hashedAnswer,
    });

    await newUser.save();

    const { password: _, securityAnswer: __, ...userDetails } = newUser._doc;
    res.status(201).json({ message: "User registered successfully", user: userDetails });
  } catch (error) {
    handleServerError(res, error, "Failed to register user");
  }
};

// Login a User
const loginUser = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user._id.toString(), user.role || "user", user.phone);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        cnic: user.cnic,
        address: user.address,
        role: user.role,
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
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { phone, securityAnswer, newPassword } = req.body;

    const user = await User.findOne({ phone }).select("+securityAnswer +securityAnswerAttempts +accountLockedUntil");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      return res.status(403).json({ message: "Account is temporarily locked. Try again later." });
    }

    const isAnswerMatch = await bcrypt.compare(securityAnswer, user.securityAnswer);
    if (!isAnswerMatch) {
      user.securityAnswerAttempts += 1;

      if (user.securityAnswerAttempts >= 3) {
        user.accountLockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 24 hours
        await user.save();
        return res.status(403).json({ message: "Too many attempts. Account locked temporarily." });
      }

      await user.save();
      return res.status(400).json({ message: "Incorrect security answer." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.securityAnswerAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    handleServerError(res, error, "Failed to reset password");
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

    if (req.body.cnic) {
      return res.status(400).json({ message: "CNIC cannot be updated by the user." });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        cnic: updatedUser.cnic,
        address: updatedUser.address,
      },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to update user profile");
  }
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  updateUserProfile,
};
