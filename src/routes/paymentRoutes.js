import express from "express";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePaymentStatus,
  deletePayment,
  getUserPayments,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/", protect, getAllPayments);
router.get("/:id", protect, getPaymentById);
router.post("/", protect, createPayment);
router.put("/:id", protect, updatePaymentStatus);
router.delete("/:id", protect, deletePayment);
router.get("/user/:userId", protect, getUserPayments);

export default router;
