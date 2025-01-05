const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Utility for consistent error handling
const handleAuthError = (res, status, message) => {
  res.status(status).json({ status: "error", error: "Unauthorized", message });
};

// Utility to verify and decode JWT token
const verifyToken = (authorizationHeader) => {
  if (!authorizationHeader) throw new Error("Authorization header is missing");

  const token = authorizationHeader.split(" ")[1]; // Expect 'Bearer <token>'
  if (!token) throw new Error("Invalid token format. Expected 'Bearer <token>'");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id) throw new Error("Invalid token payload: User ID is missing");
    return decoded;
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token has expired. Please log in again.");
    }
    throw new Error("Token verification failed");
  }
};

// Middleware to protect routes (requires authentication)
const protect = async (req, res, next) => {
  try {
    const decoded = verifyToken(req.headers.authorization);

    // Fetch user details
    const user = await User.findById(decoded.id).select(
      "name phone cnic isActive role"
    );
    if (!user || !user.isActive) {
      throw new Error("User account not found or is inactive");
    }

    // Attach user data to the request object
    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: user.name,
      phone: user.phone,
      cnic: user.cnic,
    };

    next(); // Proceed to the next middleware
  } catch (err) {
    console.error(`[AUTH ERROR ${new Date().toISOString()}]: ${err.message}`, {
      route: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    handleAuthError(res, 401, err.message);
  }
};

// Middleware for admin-only routes
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  console.warn(
    `[ACCESS DENIED ${new Date().toISOString()}] IP: ${req.ip} | User ID: ${req.user?.id || "Unknown"} | Role: ${req.user?.role || "None"} | Route: ${req.originalUrl}`
  );
  res.status(403).json({
    status: "error",
    error: "Forbidden",
    message: "Access restricted to admins only",
  });
};

// Middleware for dynamic role-based access control
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next(); // Proceed if role matches
    }

    console.warn(
      `[ACCESS DENIED ${new Date().toISOString()}] IP: ${req.ip} | User ID: ${req.user?.id || "Unknown"} | Role: ${req.user?.role || "None"} | Route: ${req.originalUrl} | Required Roles: ${roles.join(", ")}`
    );
    res.status(403).json({
      status: "error",
      error: "Forbidden",
      message: `Access restricted to roles: ${roles.join(", ")}`,
    });
  };
};

module.exports = { protect, adminOnly, roleCheck };
