import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import { createAuditLog } from "./auditLogController.js";

// @desc    Get all payments (Admin Only)
// @route   GET /api/payments
export const getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find();
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

// @desc    Delete a payment (Admin Only)
// @route   DELETE /api/payments/:id
export const deletePayment = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    await payment.remove();
    res.json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
