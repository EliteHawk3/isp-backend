const User = require("../models/User");
const Notification = require("../models/Notification");
const bcrypt = require("bcrypt");
const AuditLog = require("../models/AuditLog");
const Joi = require("joi");

// Utility function for handling server errors
const handleServerError = (res, error, customMessage = "Server error") => {
  console.error(`[SERVER ERROR]: ${error.message}`);
  res.status(500).json({ message: customMessage });
};

// Validation schemas
const userValidationSchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.string().pattern(/^\d+$/).required(),
  password: Joi.string().min(8).max(16).required(),
  address: Joi.string().required(),
  packageName: Joi.string().optional(),
  packageDetails: Joi.object({
    speed: Joi.string().optional(),
    price: Joi.number().optional(),
  }).optional(),
});

// Add a new user
const addUser = async (req, res) => {
  try {
    const { error } = userValidationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, phone, password, address, packageName, packageDetails } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      address,
      packageName: packageName || "Basic",
      packageDetails: packageDetails || { speed: "N/A", price: 0 },
    });

    await newUser.save();

    // Add audit log
    await AuditLog.create({
      adminId: req.user.id,
      action: "CREATE",
      target: "User",
      description: `Added user ${name} (${phone})`,
    });

    res.status(201).json({
      message: "User added successfully",
      user: { name: newUser.name, phone: newUser.phone, address: newUser.address },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to add user");
  }
};

// Update user details
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, address, packageName, packageDetails } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (packageName) user.packageName = packageName;
    if (packageDetails) user.packageDetails = packageDetails;

    const updatedUser = await user.save();

    // Add audit log
    await AuditLog.create({
      adminId: req.user.id,
      action: "UPDATE",
      target: "User",
      description: `Updated user ${user.name} (${user.phone})`,
    });

    res.status(200).json({
      message: "User updated successfully",
      user: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        packageName: updatedUser.packageName,
        packageDetails: updatedUser.packageDetails,
      },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to update user");
  }
};

// Deactivate (soft delete) a user
const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    // Add audit log
    await AuditLog.create({
      adminId: req.user.id,
      action: "DELETE",
      target: "User",
      description: `Deactivated user ${user.name} (${user.phone})`,
    });

    res.status(200).json({ message: "User deactivated successfully" });
  } catch (error) {
    handleServerError(res, error, "Failed to deactivate user");
  }
};

// View all users (with pagination)
const viewUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const users = await User.find({ isActive: true })
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({ totalUsers, users });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch users");
  }
};

// Send a notification to a user
const sendNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, message } = req.body;

    if (!title || !message || title.length > 100 || message.length > 500) {
      return res.status(400).json({
        message: "Title (max 100 characters) and message (max 500 characters) are required.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const notification = new Notification({ title, message, user: userId, read: false });
    await notification.save();

    user.notifications.push(notification._id);
    await user.save();

    // Add audit log
    await AuditLog.create({
      adminId: req.user.id,
      action: "CREATE",
      target: "Notification",
      description: `Sent notification to user ${user.name} (${user.phone}): ${title}`,
    });

    res.status(201).json({ message: "Notification sent successfully" });
  } catch (error) {
    handleServerError(res, error, "Failed to send notification");
  }
};

// View reports (payment status, package details, etc.)
const viewReports = async (req, res) => {
  try {
    const reports = await User.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          totalUsers: { $sum: 1 },
          packageNames: { $addToSet: "$packageName" },
        },
      },
      { $sort: { totalUsers: -1 } }, // Sort by total users in descending order
    ]);

    res.status(200).json({ reports });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch reports");
  }
};

module.exports = {
  addUser,
  updateUser,
  deactivateUser,
  viewUsers,
  sendNotification,
  viewReports,
};
