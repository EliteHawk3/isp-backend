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

  return jwt.verify(token, process.env.JWT_SECRET);
};

// General authentication middleware
const protect = (req, res, next) => {
  try {
    // Verify token and attach the decoded payload to the request object
    const decoded = verifyToken(req.headers.authorization);
    req.user = decoded; // Attach the entire payload for more flexibility
    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    res.status(401).json({ message: "Unauthorized: " + err.message });
  }
};

// Admin-only middleware
const adminProtect = (req, res, next) => {
  try {
    // Verify token and check role
    const decoded = verifyToken(req.headers.authorization);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    req.user = decoded; // Attach the entire payload for flexibility
    next();
  } catch (err) {
    console.error("Authorization error:", err.message);
    res.status(403).json({ message: "Forbidden: " + err.message });
  }
};

module.exports = { protect, adminProtect };
