const jwt = require("jsonwebtoken");

/**
 * Generate a JSON Web Token (JWT) for user authentication.
 * @param {string} id - The user's unique identifier.
 * @param {string} role - The user's role (e.g., "user", "admin").
 * @param {string} phone - The user's phone number for identification.
 * @returns {string} - A signed JWT.
 */
const generateToken = (id, role, phone) => {
  // Input validation
  if (!id || !role || !phone) {
    throw new Error("Missing required fields: id, role, or phone.");
  }
  if (typeof id !== "string" || typeof role !== "string" || typeof phone !== "string") {
    throw new Error("Invalid input types. Expected string values for id, role, and phone.");
  }

  // Ensure JWT secret is defined
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(`[TOKEN ERROR]: JWT_SECRET is missing in environment variables.`);
    throw new Error("Token generation failed. Missing server configuration.");
  }

  // Token expiration configuration
  const expiresIn = process.env.JWT_EXPIRES_IN || "1h";

  try {
    // Generate and return the signed token
    return jwt.sign(
      { id, role, phone }, // Payload
      secret, // Secret key
      { expiresIn } // Options
    );
  } catch (error) {
    // Detailed error logging
    console.error(`[TOKEN ERROR]: Failed to generate token. ${error.message}`, {
      timestamp: new Date().toISOString(),
      user: { id, role, phone },
    });
    throw new Error("Token generation failed.");
  }
};

module.exports = generateToken;
