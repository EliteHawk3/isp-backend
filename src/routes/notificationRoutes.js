import express from "express";
import {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotificationStatus,
  deleteNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllNotifications);
router.get("/:id", protect, getNotificationById);
router.post("/", protect, createNotification);
router.put("/:id", protect, updateNotificationStatus);
router.delete("/:id", protect, deleteNotification);

export default router;
