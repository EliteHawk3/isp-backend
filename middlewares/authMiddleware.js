const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Extract and verify the JWT from the Authorization header.
 * @param {string} authorizationHeader - The Authorization header value.
 * @returns {object} - The decoded token payload.
 */
const verifyToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw new Error("Authorization header is missing");
  }

  const token = authorizationHeader.split(" ")[1]; // Format: Bearer <token>
  if (!token) {
    throw new Error("Invalid token format. Expected 'Bearer <token>'");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id) {
      throw new Error("Invalid token payload: User ID is missing");
    }
    return decoded;
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token has expired. Please log in again.");
    }
    throw new Error("Token verification failed");
  }
};

/**
 * Middleware to protect routes (requires authentication).
 */
const protect = async (req, res, next) => {
  try {
    const decoded = verifyToken(req.headers.authorization);

    // Fetch user details from the database
    const user = await User.findById(decoded.id).select("name phone isActive role");
    if (!user || !user.isActive) {
      throw new Error("User account not found or is inactive");
    }

    // Attach user details to the request object
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: user.name,
      phone: user.phone,
    };

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error(`[AUTH ERROR]: ${err.message}`, {
      route: req.originalUrl,
      method: req.method,
      token: req.headers.authorization,
    });
    res.status(401).json({
      status: "error",
      error: "Unauthorized",
      message: err.message,
    });
  }
};

/**
 * Middleware for admin-only routes.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({
    status: "error",
    error: "Forbidden",
    message: "Access restricted to admins only",
  });
};

/**
 * Middleware for dynamic role-based access control.
 * @param {...string} roles - Allowed roles for the route.
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({
      status: "error",
      error: "Forbidden",
      message: `Access restricted to roles: ${roles.join(", ")}`,
    });
  };
};

module.exports = { protect, adminOnly, roleCheck };
