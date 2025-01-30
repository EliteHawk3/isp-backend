import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getActiveUsers,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);
router.get("/active", protect, getActiveUsers);

export default router;
