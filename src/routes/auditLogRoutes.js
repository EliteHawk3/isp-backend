import express from "express";
import { getAllAuditLogs } from "../controllers/auditLogController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllAuditLogs);

export default router;
