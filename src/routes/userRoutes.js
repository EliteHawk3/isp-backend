import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getActiveUsers,
  addUser,
} from "../controllers/userController.js";
import { protect, adminProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Protect admin-only routes
router.get("/", protect, adminProtect, getAllUsers);
router.get("/active", protect, getActiveUsers);
router.post("/", protect, adminProtect, addUser);
router.delete("/:id", protect, adminProtect, deleteUser);

// ✅ Allow users to access only their own profile
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);

export default router;
