const express = require("express");
const {
  createTicket,
  getAllTickets,
  getUserTickets,
  updateTicketStatus,
  deleteTicket,
} = require("../controllers/supportController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * Public Routes
 * Accessible to authenticated users.
 */

// Create a support ticket (User)
router.post("/", protect, createTicket);

// Get all tickets for the logged-in user
router.get("/my-tickets", protect, getUserTickets);

/**
 * Admin Routes
 * Accessible only to admin users.
 */

// Get all support tickets (Admin only) with optional filters and pagination
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, userId } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (userId) filters.user = userId;

    const tickets = await getAllTickets(filters, parseInt(page), parseInt(limit));
    const total = await getAllTickets(filters).countDocuments();

    res.status(200).json({
      tickets,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(`[SERVER ERROR]: ${error.message}`);
    res.status(500).json({ message: "Failed to fetch support tickets." });
  }
});

// Update ticket status (Admin only)
router.put("/:ticketId/status", protect, adminOnly, updateTicketStatus);

// Delete a support ticket (Admin only)
router.delete("/:ticketId", protect, adminOnly, deleteTicket);

/**
 * Fallback Route
 * Handles undefined endpoints.
 */
router.all("*", (req, res) => {
  res.status(404).json({ message: "Support endpoint not found." });
});

module.exports = router;
