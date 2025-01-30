import User from "../models/User.js";
import { createAuditLog } from "./auditLogController.js";

// @desc    Get all users (Admin Only)
// @route   GET /api/users
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only allow admins or the user themselves to access
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only allow admins or the user themselves to update
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update fields
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    user.packageId = req.body.packageId || user.packageId;
    user.installationCost = req.body.installationCost || user.installationCost;
    user.discount = req.body.discount || user.discount;
    user.discountType = req.body.discountType || user.discountType;

    const updatedUser = await user.save();
    res.json(updatedUser);
    await createAuditLog(req.user.id, "Update User", "Old Data", "New Data");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get all active users
// @route   GET /api/users/active
export const getActiveUsers = async (req, res) => {
  try {
    const activeUsers = await User.find({ active: true }).select("-password");
    res.json(activeUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Delete user
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only allow admins to delete users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await user.remove();
    res.json({ message: "User deleted successfully" });
    await createAuditLog(req.user.id, "Delete User", "Active", "Deleted");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
