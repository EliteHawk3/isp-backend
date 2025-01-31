import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import { createAuditLog } from "./auditLogController.js";
import bcrypt from "bcryptjs";

// @desc    Get all payments (Admin Only)
// @route   GET /api/payments
export const getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find({ deleted: false });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single payment by ID
// @route   GET /api/payments/:id
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // Allow admins or the user who owns the payment
    if (
      req.user.role !== "admin" &&
      req.user.id !== payment.userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function to calculate the due date (1 month from now)
const calculateDueDate = () => {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  return now;
};

// @desc    Create a new payment (Admin Only)
// @route   POST /api/payments
export const createPayment = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { userId, packageId, discount } = req.body;

    // Validate user and package
    const user = await User.findById(userId);
    const userPackage = await Package.findById(packageId);
    if (!user || !userPackage) {
      return res.status(404).json({ message: "User or package not found" });
    }

    // Calculate discounted amount
    const discountedAmount = Math.max(userPackage.cost - discount, 0);

    const newPayment = await Payment.create({
      userId,
      packageId,
      packageName: userPackage.name,
      costAtPaymentTime: userPackage.cost,
      discountedAmount,
      discountAtPaymentTime: discount,
      status: "Pending",
      dueDate: calculateDueDate(),
    });

    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id
export const updatePaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // Only admins can update payment status
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    payment.status = req.body.status || payment.status;
    payment.paidDate =
      req.body.status === "Paid" ? new Date() : payment.paidDate;

    const updatedPayment = await payment.save();
    res.json(updatedPayment);
    await createAuditLog(
      req.user.id,
      "Payment Status Update",
      payment.status,
      req.body.status,
      payment.discountedAmount
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get all payments for a specific user
// @route   GET /api/payments/user/:userId
export const getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow admins or the user themselves to view payments
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find({ userId });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Sync payments with latest package data
// @route   PUT /api/payments/sync
export const syncPayments = async (req, res) => {
  try {
    const users = await User.find();
    const packages = await Package.find();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const user of users) {
      const packageDetails = packages.find(
        (pkg) => pkg.id.toString() === user.packageId?.toString()
      );

      if (!packageDetails) {
        // Archive payments for deleted packages
        await Payment.updateMany(
          { userId: user.id },
          { $set: { archived: true, packageName: "Deleted Package" } }
        );
        continue;
      }

      // Update existing payments
      await Payment.updateMany(
        { userId: user.id, status: { $in: ["Pending", "Overdue"] } },
        {
          $set: {
            costAtPaymentTime: packageDetails.cost,
            packageName: packageDetails.name,
            discountedAmount: Math.max(
              packageDetails.cost - (user.discount || 0),
              0
            ),
          },
        }
      );

      // Check if a payment already exists for the current month
      const existingPayment = await Payment.findOne({
        userId: user.id,
        date: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
        },
      });

      // Check if a deleted payment exists for the current month
      const deletedPayment = await Payment.findOne({
        userId: user.id,
        date: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
        },
        deleted: true,
      });

      // ✅ Generate a new payment only if no active or deleted payment exists
      if (!existingPayment && !deletedPayment) {
        await Payment.create({
          userId: user.id,
          packageId: packageDetails.id,
          packageName: packageDetails.name,
          costAtPaymentTime: packageDetails.cost,
          discountedAmount: Math.max(
            packageDetails.cost - (user.discount || 0),
            0
          ),
          discountAtPaymentTime: user.discount,
          status: "Pending",
          date: new Date(),
          dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // One month from now
        });

        console.log(
          `Generated new payment for user ${user.id} for ${
            currentMonth + 1
          }/${currentYear}`
        );
      } else {
        console.log(
          `Skipping payment generation for user ${user.id} (existing or deleted payment found)`
        );
      }
    }

    res.json({ message: "Payments synchronized and generated successfully." });
  } catch (error) {
    console.error("Error syncing payments:", error);
    res.status(500).json({ message: "Error syncing payments." });
  }
};

// @desc    Delete a payment (Admin Only)
// @route   DELETE /api/payments/:id
export const deletePayment = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // ✅ Mark payment as deleted instead of removing it
    payment.deleted = true;
    await payment.save();

    res.json({ message: "Payment marked as deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
