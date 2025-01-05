const User = require("../models/User");
const Notification = require("../models/Notification");
const bcrypt = require("bcrypt");
const Joi = require("joi");

// Utility for handling server errors
const handleServerError = (res, error, message = "Server error") => {
  console.error(`[SERVER ERROR ${new Date().toISOString()}]: ${error.message}`);
  res.status(500).json({ status: "error", message });
};

// Validation Schemas
const userValidationSchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.string().pattern(/^\d+$/).required(),
  cnic: Joi.string()
    .pattern(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/)
    .required(),
  password: Joi.string().min(8).max(16).required(),
  address: Joi.string().required(),
  packageName: Joi.string().required(),
  packageSpeed: Joi.string().required(),
  installationCosts: Joi.object({
    wireCost: Joi.number().min(0).required(),
    modemFee: Joi.number().min(0).required(),
    promo: Joi.number().min(0).max(100).required(),
  }).required(),
  role: Joi.string().valid("user").default("user"),
  securityQuestion: Joi.string().required(),
  securityAnswer: Joi.string().required(),
});

const adminValidationSchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.string().pattern(/^\d+$/).required(),
  password: Joi.string().min(8).max(16).required(),
  role: Joi.string().valid("admin").default("admin"),
  securityQuestion: Joi.string().required(),
  securityAnswer: Joi.string().required(),
});

const updateUserValidationSchema = Joi.object({
  name: Joi.string().min(3),
  phone: Joi.string().pattern(/^\d+$/),
  cnic: Joi.string().pattern(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/),
  address: Joi.string(),
  packageName: Joi.string(),
  packageSpeed: Joi.string(),
  installationCosts: Joi.object({
    wireCost: Joi.number().min(0),
    modemFee: Joi.number().min(0),
    promo: Joi.number().min(0).max(100),
  }),
  role: Joi.string().valid("user"),
});

// Add a new user or admin
const addUser = async (req, res) => {
  try {
    const { role } = req.body;

    // Choose schema based on role
    const schema = role === "admin" ? adminValidationSchema : userValidationSchema;
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const {
      name,
      phone,
      cnic,
      password,
      address,
      packageName,
      packageSpeed,
      installationCosts,
      securityQuestion,
      securityAnswer,
    } = req.body;

    // Check for duplicates
    const existingUser = await User.findOne({ $or: [{ phone }, { cnic }] });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number or CNIC already registered." });
    }

    // Hash password and security answer
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer = await bcrypt.hash(securityAnswer, 10);

    // Create user/admin
    const newUser = new User({
      name,
      phone,
      cnic,
      password: hashedPassword,
      address,
      packageName,
      packageSpeed,
      installationCosts,
      role,
      securityQuestion,
      securityAnswer: hashedAnswer,
    });

    await newUser.save();

    res.status(201).json({
      status: "success",
      message: "User added successfully",
      data: { name: newUser.name, phone: newUser.phone, role: newUser.role },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to add user");
  }
};

// Update user details
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = updateUserValidationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    Object.assign(user, req.body);
    const updatedUser = await user.save();

    res.status(200).json({
      status: "success",
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    handleServerError(res, error, "Failed to update user");
  }
};

// Deactivate user (soft delete)
const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({ status: "success", message: "User deactivated successfully" });
  } catch (error) {
    handleServerError(res, error, "Failed to deactivate user");
  }
};

// View reports
const viewReports = async (req, res) => {
  try {
    const reports = await User.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          totalUsers: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({ status: "success", data: reports });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch reports");
  }
};

// Send notification
const sendNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, message } = req.body;

    const notification = new Notification({ userId, title, message });
    await notification.save();

    res.status(201).json({ status: "success", message: "Notification sent successfully" });
  } catch (error) {
    handleServerError(res, error, "Failed to send notification");
  }
};

// View users with filters
const viewUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const filters = { isActive: true };
    if (role) filters.role = role;

    const users = await User.find(filters)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({ status: "success", data: users });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch users");
  }
};

// View admins
const viewAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password");
    res.status(200).json({ status: "success", data: admins });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch admins");
  }
};

const viewAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const overduePayments = await User.countDocuments({ paymentStatus: "overdue" });
    const pendingPayments = await User.countDocuments({ paymentStatus: "pending" });

    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        overduePayments,
        pendingPayments,
      },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch analytics data");
  }
};

// Export the function
module.exports = {
  viewAnalytics, // <-- Ensure this export exists
  addUser,
  updateUser,
  deactivateUser,
  viewUsers,
  sendNotification,
  viewReports,
  viewAdmins,
};

