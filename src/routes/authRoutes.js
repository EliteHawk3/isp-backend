import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Ensure users can only register as "user" (not admin)
router.post("/register", registerUser);

// ✅ Fix login to use phone instead of username
router.post("/login", loginUser);

// ✅ Protect profile access
router.get("/profile", protect, getUserProfile);

export default router;
