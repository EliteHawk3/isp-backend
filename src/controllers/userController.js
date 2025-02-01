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
    const previousPackageId = user.packageId; // Store the old package ID

    // Update fields
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    user.packageId = req.body.packageId || user.packageId;
    user.installationCost = req.body.installationCost || user.installationCost;
    user.discount = req.body.discount || user.discount;
    user.discountType = req.body.discountType || user.discountType;

    // ✅ Allow user to change their password (if provided)
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10); // ✅ Hash new password before saving
    }

    const updatedUser = await user.save();

    // ✅ If the user switched packages, update only unpaid payments
    if (
      previousPackageId &&
      previousPackageId.toString() !== user.packageId.toString()
    ) {
      console.log(`User ${user._id} switched packages. Updating payments...`);

      const newPackage = await Package.findById(user.packageId);
      if (!newPackage) {
        return res.status(400).json({ message: "New package not found" });
      }

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // ✅ Update only pending/overdue payments from this month onward
      await Payment.updateMany(
        {
          userId: user._id,
          status: { $in: ["Pending", "Overdue"] }, // Only unpaid payments
          date: { $gte: currentMonthStart }, // Payments from this month and beyond
        },
        {
          $set: {
            packageId: newPackage._id,
            packageName: newPackage.name,
            costAtPaymentTime: newPackage.cost,
            discountedAmount: Math.max(
              newPackage.cost - (user.discount || 0),
              0
            ),
          },
        }
      );

      console.log(
        `Updated payments for user ${user._id} with the new package.`
      );
    }
    // ✅ Automatically sync all payments to avoid duplicates & missing payments
    await syncPayments();
    res.json(updatedUser);
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
// @desc    Create a new user
// @route   POST /api/users
// ✅ Implement `generatePassword` function using the frontend logic
const generatePassword = (cnic, name) => {
  const lastFourCnic = cnic.replace(/\D/g, "").slice(-4); // ✅ Extract last 4 digits of CNIC
  const cleanName = name.replace(/[^A-Za-z]/g, "").toLowerCase(); // ✅ Remove non-letters
  const firstFiveChars = cleanName.slice(0, 5); // ✅ Get first 5 characters (or less if name is short)
  const symbols = ["#", "$", "%", "&", "*"]; // ✅ Predefined set of symbols
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]; // ✅ Pick a random symbol

  return `${lastFourCnic}${randomSymbol}${firstFiveChars}`; // ✅ Combine elements
};

// @desc    Create a new user with an auto-generated password
// @route   POST /api/users
export const addUser = async (req, res) => {
  try {
    const {
      name,
      phone,
      cnic,
      address,
      packageId,
      installationCost,
      discount,
      discountType,
      role,
    } = req.body;

    // ✅ Generate the password using the frontend logic
    const plainPassword = generatePassword(cnic, name);
    const hashedPassword = await bcrypt.hash(plainPassword, 10); // ✅ Hash the generated password

    const user = await User.create({
      name,
      phone,
      cnic,
      address,
      packageId,
      installationCost,
      discount,
      discountType,
      role,
      password: hashedPassword, // ✅ Store hashed password
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
