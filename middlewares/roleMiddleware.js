const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
        return res
          .status(401)
          .json({ status: "error", error: "Unauthorized", message: "User not found." });
      }

      next(); // Proceed to the next middleware or route handler
    } else {
      return res
        .status(401)
        .json({ status: "error", error: "Unauthorized", message: "Token is missing." });
    }
  } catch (error) {
    console.error(`[AUTH ERROR] ${error.message}`);
    res
      .status(401)
      .json({ status: "error", error: "Unauthorized", message: "Invalid token." });
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
    res
      .status(403)
      .json({ status: "error", error: "Forbidden", message: "Access restricted to admins only." });
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

/**
 * Middleware for role hierarchy-based access.
 * @param {string} requiredRole - Minimum role required for access.
 * Example: If the role hierarchy is ["admin", "moderator", "user"],
 * specifying "moderator" allows both "admin" and "moderator" roles.
 */
const roleHierarchy = (requiredRole) => {
  const roles = ["admin", "moderator", "user"]; // Define role hierarchy
  return (req, res, next) => {
    const userRoleIndex = roles.indexOf(req.user?.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);

    if (userRoleIndex !== -1 && userRoleIndex <= requiredRoleIndex) {
      next(); // Proceed if user's role is equal or higher in the hierarchy
    } else {
      console.warn(
        `[ACCESS DENIED] User: ${req.user?.id || "Unknown"} | Role: ${
          req.user?.role || "None"
        } | Route: ${req.originalUrl} | Required Role: ${requiredRole}`
      );
      res.status(403).json({
        status: "error",
        error: "Forbidden",
        message: `Access restricted to ${requiredRole} or higher roles.`,
      });
    }
  };
};

module.exports = { protect, adminOnly, roleCheck, roleHierarchy };
