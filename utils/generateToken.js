const jwt = require("jsonwebtoken");

/**
 * Generate a JSON Web Token (JWT) for user authentication
 * @param {String} id - The user's unique identifier
 * @param {String} role - The user's role (e.g., "user" or "admin")
 * @returns {String} - A signed JWT
 */
const generateToken = (id, role) => {
  try {
    // Generate the token with user details
    return jwt.sign(
      { id, role }, // Include role in the payload
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h", // Configurable expiration time
      }
    );
  } catch (error) {
    console.error("Error generating token:", error.message);
    throw new Error("Token generation failed"); // Ensure the error is handled appropriately
  }
};

module.exports = generateToken;
