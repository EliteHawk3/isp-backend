import Notification from "../models/Notification.js";

// @desc    Get all notifications
// @route   GET /api/notifications
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single notification by ID
// @route   GET /api/notifications/:id
export const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new notification (Admin Only)
// @route   POST /api/notifications
export const createNotification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, body, userIds, packageId, payments } = req.body;

    const newNotification = await Notification.create({
      title,
      body,
      userIds,
      packageId,
      payments,
    });

    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update notification status
// @route   PUT /api/notifications/:id
export const updateNotificationStatus = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });

    // Only admins can update notification status
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    notification.status = req.body.status || notification.status;
    const updatedNotification = await notification.save();
    res.json(updatedNotification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification (Admin Only)
// @route   DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });

    await notification.remove();
    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
