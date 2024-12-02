const rateLimit = require("express-rate-limit");

// Helper function for dynamic rate limits
const dynamicRateLimit = (req) => {
  if (req.user && req.user.role === "admin") {
    return 100; // Admins get higher limits
  }
  return 3; // Default limit
};

// Custom logging for abuse attempts
const abuseLogger = (req) => {
  console.warn(`[RATE LIMIT] Exceeded for IP: ${req.ip} | Endpoint: ${req.originalUrl} | Time: ${new Date().toISOString()}`);
};

// OTP rate limiter
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10-minute window
  max: (req) => dynamicRateLimit(req), // Dynamic rate limit
  standardHeaders: true, // Include standard rate limit headers
  legacyHeaders: false, // Disable legacy headers
  message: {
    message: "Too many OTP requests. Please try again after 10 minutes.",
  },
  skip: (req) => {
    // Whitelist specific IPs
    const whitelist = process.env.RATE_LIMIT_WHITELIST ? process.env.RATE_LIMIT_WHITELIST.split(",") : [];
    return whitelist.includes(req.ip);
  },
  handler: (req, res, next, options) => {
    abuseLogger(req); // Log abuse attempts
    res.status(options.statusCode).json(options.message); // Send rate-limit response
  },
});

// Wrapper to ensure rate limiter is applied correctly
const rateLimitMiddleware = (req, res, next) => {
  otpLimiter(req, res, (err) => {
    if (err) {
      console.error(`[RATE LIMIT ERROR] ${err.message}`);
    }
    next();
  });
};

module.exports = { otpLimiter: rateLimitMiddleware };
