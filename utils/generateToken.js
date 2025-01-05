const jwt = require("jsonwebtoken");

/**
 * Generate a JSON Web Token (JWT) for user authentication.
 * @param {string} id - The user's unique identifier.
 * @param {string} role - The user's role (e.g., "user", "admin").
 * @param {string} phone - The user's phone number for identification.
 * @param {string} packageName - The user's assigned package name.
 * @param {number} promo - The user's promo discount percentage.
 * @returns {string} - A signed JWT.
 */
const generateToken = (id, role, phone, packageName = "Basic", promo = 0) => {
  // Input validation
  if (!id || !role || !phone) {
    throw new Error("Missing required fields: id, role, or phone.");
  }
  if (
    typeof id !== "string" ||
    typeof role !== "string" ||
    typeof phone !== "string" ||
    typeof packageName !== "string" ||
    typeof promo !== "number"
  ) {
    throw new Error("Invalid input types. Ensure correct data types for inputs.");
  }

  // Ensure JWT secret is defined
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(`[TOKEN ERROR]: JWT_SECRET is missing in environment variables.`);
    throw new Error("Token generation failed. Missing server configuration.");
  }

  // Token expiration configuration
  const expiresIn = process.env.JWT_EXPIRES_IN || "2h";

  try {
    // Generate and return the signed token
    return jwt.sign(
      {
        id,
        role,
        phone,
        packageName, // Add package name to payload
        promo, // Add promo discount to payload
        iat: Math.floor(Date.now() / 1000), // Issued at timestamp
      },
      secret, // Secret key
      { expiresIn } // Options
    );
  } catch (error) {
    // Detailed error logging
    console.error(`[TOKEN ERROR]: Failed to generate token. ${error.message}`, {
      timestamp: new Date().toISOString(),
      user: { id, role, phone, packageName, promo },
    });
    throw new Error("Token generation failed.");
  }
};

module.exports = generateToken;
