const jwt = require("jsonwebtoken");

// Helper function to extract and verify the token
const verifyToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw new Error("No token provided");
  }

  const token = authorizationHeader.split(" ")[1]; // Format: Bearer <token>
  if (!token) {
    throw new Error("Invalid token format");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired token");
  }

  if (!decoded.id) {
    throw new Error("Token payload is missing required user ID");
  }

  return decoded;
};

// General authentication middleware
const protect = (req, res, next) => {
  try {
    const decoded = verifyToken(req.headers.authorization);
    req.user = {
      id: decoded.id, // Attach user ID explicitly
      role: decoded.role, // Attach user role if available
    };
    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};

// Admin-only middleware
const adminProtect = (req, res, next) => {
  try {
    const decoded = verifyToken(req.headers.authorization);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden", message: "Admins only" });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    console.error("Authorization error:", err.message);
    res.status(403).json({ error: "Forbidden", message: err.message });
  }
};

module.exports = { protect, adminProtect };
