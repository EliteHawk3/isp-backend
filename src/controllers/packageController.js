import Package from "../models/Package.js";
import User from "../models/User.js";
import { createAuditLog } from "./auditLogController.js";

// @desc    Get all packages
// @route   GET /api/packages
export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single package by ID
// @route   GET /api/packages/:id
export const getPackageById = async (req, res) => {
  try {
    const packageItem = await Package.findById(req.params.id);
    if (!packageItem)
      return res.status(404).json({ message: "Package not found" });

    res.json(packageItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new package (Admin Only)
// @route   POST /api/packages
export const createPackage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, speed, cost } = req.body;

    const newPackage = await Package.create({
      name,
      speed,
      cost,
    });

    res.status(201).json(newPackage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update package details (Admin Only)
// @route   PUT /api/packages/:id
export const updatePackage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const packageItem = await Package.findById(req.params.id);
    if (!packageItem)
      return res.status(404).json({ message: "Package not found" });

    packageItem.name = req.body.name || packageItem.name;
    packageItem.speed = req.body.speed || packageItem.speed;
    packageItem.cost = req.body.cost || packageItem.cost;

    const updatedPackage = await packageItem.save();
    res.json(updatedPackage);
    await createAuditLog(
      req.user.id,
      "Update Package",
      "Old Package Data",
      "Updated Package Data"
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a package (Admin Only)
// @route   DELETE /api/packages/:id
export const deletePackage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const packageItem = await Package.findById(req.params.id);
    if (!packageItem)
      return res.status(404).json({ message: "Package not found" });

    // Ensure no users are subscribed before deleting
    const usersUsingPackage = await User.findOne({
      packageId: packageItem._id,
    });
    if (usersUsingPackage) {
      return res
        .status(400)
        .json({ message: "Cannot delete package with active users" });
    }

    await packageItem.remove();
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
