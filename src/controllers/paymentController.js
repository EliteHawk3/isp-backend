import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import { createAuditLog } from "./auditLogController.js";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv"; // Convert JSON to CSV
import * as XLSX from "xlsx";

// @desc    Get all payments (Admin Only)
// @route   GET /api/payments
export const getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    let query = { deleted: false };

    // ✅ Filter by payment status
    if (req.query.status) {
      query.status = { $in: req.query.status.split(",") };
    }

    // ✅ Filter by month (current month & beyond)
    if (req.query.month) {
      const [year, month] = req.query.month.split("-");
      query.date = {
        $gte: new Date(year, month - 1, 1), // First day of the selected month
        $lt: new Date(year, month, 1), // First day of next month
      };
    }

    // ✅ Search payments by user name or package name
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i"); // Case-insensitive search
      const userIds = await User.find({ name: searchRegex }).distinct("_id");

      query.$or = [
        { packageName: searchRegex }, // Match package name
        { userId: { $in: userIds } }, // Match user by name
      ];
    }

    const payments = await Payment.find(query)
      .populate("userId", "name") // ✅ Include user name
      .populate("packageId", "name cost"); // ✅ Include package name & cost
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

    const payments = await Payment.find({ userId })
      .populate("userId", "name")
      .populate("packageId", "name cost");
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

    // ✅ Reset user count for each package
    await Package.updateMany({}, { users: 0 });

    for (const user of users) {
      if (user.packageId) {
        await Package.findByIdAndUpdate(user.packageId, { $inc: { users: 1 } });
      }
    }
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
      if (!existingPayment && !deletedPayment && user.active) {
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
export const exportPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    let query = { deleted: false };

    // ✅ Apply filters (same logic as getAllPayments)
    if (req.query.months) {
      const monthsArray = req.query.months.split(",");
      query.date = {
        $gte: new Date(monthsArray[0] + "-01T00:00:00.000Z"),
        $lte: new Date(
          monthsArray[monthsArray.length - 1] + "-31T23:59:59.999Z"
        ),
      };
    }

    if (req.query.statuses) {
      query.status = { $in: req.query.statuses.split(",") };
    }

    const payments = await Payment.find(query);

    // ✅ Convert payments to CSV format
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(payments);

    res.header("Content-Type", "text/csv");
    res.attachment("payments.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getPaymentSummary = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Total revenue for the current month
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          status: "Paid",
          paidDate: { $gte: currentMonthStart, $lt: nextMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$discountedAmount" } } },
    ]);

    // Outstanding payments
    const outstandingPayments = await Payment.aggregate([
      { $match: { status: { $in: ["Pending", "Overdue"] } } },
      { $group: { _id: null, total: { $sum: "$discountedAmount" } } },
    ]);

    // Unique users who paid this month
    const paidUsers = await Payment.distinct("userId", {
      status: "Paid",
      paidDate: { $gte: currentMonthStart, $lt: nextMonthStart },
    });

    // Unique users with outstanding payments
    const outstandingUsers = await Payment.distinct("userId", {
      status: { $in: ["Pending", "Overdue"] },
    });
    // ✅ Count users who paid previous months' overdue payments this month
    const previousPaidUsers = await Payment.distinct("userId", {
      status: "Paid",
      date: { $lt: currentMonthStart }, // Payment was due before this month
      paidDate: { $gte: currentMonthStart, $lt: nextMonthStart }, // Paid this month
    });
    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      outstandingPayments: outstandingPayments[0]?.total || 0,
      paidUsers: paidUsers.length,
      outstandingUsers: outstandingUsers.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getRevenueReport = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    let query = { status: "Paid" };

    // ✅ Filter by month if provided
    if (req.query.month) {
      const [year, month] = req.query.month.split("-");
      query.paidDate = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      };
    }

    // ✅ Aggregate revenue by date or month
    const revenueData = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: "$paidDate" },
            month: { $month: "$paidDate" },
            day: req.query.month ? { $dayOfMonth: "$paidDate" } : null, // Daily if month is specified
          },
          totalRevenue: { $sum: "$discountedAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          label: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: "$_id.month" },
              req.query.month ? ["-", { $toString: "$_id.day" }] : [],
            ],
          },
          totalRevenue: 1,
        },
      },
      { $sort: { label: 1 } }, // ✅ Sort results chronologically
    ]);

    res.json(revenueData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const exportRevenueReport = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch revenue data
    const revenueData = await getRevenueReport(req, res); // ✅ Use the existing function

    // Convert to Excel format
    const worksheet = XLSX.utils.json_to_sheet(revenueData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Report");

    // ✅ Send the file as a response
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=RevenueReport.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
