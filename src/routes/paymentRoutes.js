import express from "express";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePaymentStatus,
  deletePayment,
  getUserPayments,
  getPaymentSummary,
  exportPayments,
  getRevenueReport,
  exportRevenueReport,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/", protect, getAllPayments);
router.get("/:id", protect, getPaymentById);
router.post("/", protect, createPayment);
router.put("/:id", protect, updatePaymentStatus);
router.delete("/:id", protect, deletePayment);
router.get("/user/:userId", protect, getUserPayments);
router.get("/summary", protect, getPaymentSummary); // ✅ Fetch summary of payments
router.get("/export", protect, exportPayments); // ✅ Export payments to CSV
router.get("/revenue/export", protect, exportRevenueReport); // ✅ Export revenue as Excel
router.get("/revenue", protect, getRevenueReport); // ✅ Fetch revenue data

export default router;
