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
    // Ensure the secret is defined
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    // Generate the token with user details
    return jwt.sign(
      { id, role, phone }, // Payload includes user ID, role, and phone number
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h", // Configurable expiration time
      }
    );
  } catch (error) {
    console.error("[TOKEN ERROR]:", error.message, {
      id,
      role,
      phone,
    });
    throw new Error("Token generation failed");
  }
};

module.exports = generateToken;
