const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Utility function for error response
const handleAuthError = (res, status, message) => {
  res.status(status).json({ status: "error", error: "Unauthorized", message });
};

/**
 * Middleware to protect routes (requires authentication).
 */
const protect = async (req, res, next) => {
  let token;

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch the authenticated user and attach to the request object
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return handleAuthError(res, 401, "User not found.");
      }

      if (!req.user.isActive) {
        return handleAuthError(res, 403, "Account is inactive.");
      }

      next(); // Proceed to the next middleware or route handler
    } else {
      return handleAuthError(res, 401, "Token is missing.");
    }
  } catch (error) {
    console.error(`[AUTH ERROR] ${error.message}`);

    // Handle specific token errors
    if (error.name === "TokenExpiredError") {
      return handleAuthError(res, 401, "Token has expired. Please log in again.");
    }

    handleAuthError(res, 401, "Invalid token.");
  }
};

/**
 * Middleware to allow only admin access.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); // Proceed to the next middleware or route handler
  } else {
    console.warn(
      `[ACCESS DENIED] User: ${req.user?.id || "Unknown"} | Role: ${
        req.user?.role || "None"
      } | Route: ${req.originalUrl}`
    );
    res.status(403).json({
      status: "error",
      error: "Forbidden",
      message: "Access restricted to admins only.",
    });
  }
};

/**
 * Middleware to restrict access by user roles dynamically.
 * @param {...string} roles - Allowed roles for the route.
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next(); // Proceed if the user's role matches any of the allowed roles
    } else {
      console.warn(
        `[ACCESS DENIED] User: ${req.user?.id || "Unknown"} | Role: ${
          req.user?.role || "None"
        } | Route: ${req.originalUrl} | Required Roles: ${roles.join(", ")}`
      );
      res.status(403).json({
        status: "error",
        error: "Forbidden",
        message: "Access forbidden. Insufficient permissions.",
      });
    }
  };
};

module.exports = { protect, adminOnly, roleCheck };
