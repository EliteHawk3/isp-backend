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
    throw new Error("Authentication failed");
  }

  if (!decoded.id) {
    throw new Error("Token payload is missing required user ID");
  }

  return decoded;
};

// General authentication middleware
const protect = async (req, res, next) => {
  try {
    const decoded = verifyToken(req.headers.authorization);

    // Attach user details to request (can add database query if more details are needed)
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    res.status(401).json({ error: "Unauthorized", message: "Authentication failed" });
  }
};

// Admin-only middleware
const adminProtect = async (req, res, next) => {
  try {
    const decoded = verifyToken(req.headers.authorization);

    // Verify if the user has the admin role
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden", message: "Admins only" });
    }

    // Attach admin details to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.error("Authorization error:", err.message);
    res.status(403).json({ error: "Forbidden", message: "Authorization failed" });
  }
};

module.exports = { protect, adminProtect };
