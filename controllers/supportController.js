const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");
const Joi = require("joi");

// Utility function for handling server errors
const handleServerError = (res, error, customMessage = "Server error") => {
  console.error(`[SERVER ERROR]: ${error.message}`);
  res.status(500).json({ message: customMessage });
};

// Validation schema for support tickets
const ticketValidationSchema = Joi.object({
  subject: Joi.string().max(100).required(),
  description: Joi.string().max(1000).required(),
});

// Create a support ticket
const createTicket = async (req, res) => {
  try {
    const { error } = ticketValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { subject, description } = req.body;

    const ticket = new SupportTicket({
      user: req.user.id, // User ID from the logged-in user
      subject,
      description,
    });

    await ticket.save();

    res.status(201).json({ message: "Support ticket created successfully.", ticket });
  } catch (error) {
    handleServerError(res, error, "Failed to create support ticket");
  }
};

// Get all tickets (admin only) with optional pagination
const getAllTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const tickets = await SupportTicket.find()
      .populate("user", "name phone") // Populate user details
      .sort({ createdAt: -1 }) // Sort by most recent
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalTickets = await SupportTicket.countDocuments();

    res.status(200).json({
      tickets,
      pagination: {
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        totalPages: Math.ceil(totalTickets / limit),
        totalTickets,
      },
    });
  } catch (error) {
    handleServerError(res, error, "Failed to fetch all support tickets");
  }
};

// Get tickets for a specific user
const getUserTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id }).sort({ createdAt: -1 });

    if (!tickets.length) {
      return res.status(404).json({ message: "No tickets found for the user." });
    }

    res.status(200).json(tickets);
  } catch (error) {
    handleServerError(res, error, "Failed to fetch user tickets");
  }
};

// Update ticket status (admin only)
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status value. Allowed values: ${validStatuses.join(", ")}.`,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: `Ticket with ID ${ticketId} not found.` });
    }

    ticket.status = status;
    await ticket.save();

    res.status(200).json({ message: "Ticket status updated successfully.", ticket });
  } catch (error) {
    handleServerError(res, error, "Failed to update ticket status");
  }
};

// Soft delete a ticket (admin only)
const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: `Ticket with ID ${ticketId} not found.` });
    }

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    await ticket.save();

    res.status(200).json({ message: "Ticket soft-deleted successfully." });
  } catch (error) {
    handleServerError(res, error, "Failed to delete ticket");
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getUserTickets,
  updateTicketStatus,
  deleteTicket,
};
