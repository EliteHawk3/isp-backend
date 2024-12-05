const jwt = require("jsonwebtoken");

/**
 * Generate a JSON Web Token (JWT) for user authentication
 * @param {String} id - The user's unique identifier
 * @param {String} role - The user's role (e.g., "user" or "admin")
 * @param {String} phone - The user's phone number for identification
 * @returns {String} - A signed JWT
 */
const generateToken = (id, role, phone) => {
  try {
    // Validate input types
    if (!id || !role || !phone) {
      throw new Error("Missing required fields: id, role, or phone");
    }
    if (typeof id !== "string" || typeof role !== "string" || typeof phone !== "string") {
      throw new Error("Invalid input types for token generation");
    }

    // Ensure the secret is defined
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    // Configure token expiration
    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";

    // Generate the token
    return jwt.sign(
      { id, role, phone }, // Payload includes user ID, role, and phone number
      secret,
      { expiresIn }
    );
  } catch (error) {
    // Enhanced error logging
    console.error(`[TOKEN ERROR]: ${error.message}`, {
      timestamp: new Date().toISOString(),
      id,
      role,
      phone,
    });
    throw new Error("Token generation failed");
  }
};

module.exports = generateToken;
