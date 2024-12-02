const rateLimit = require("express-rate-limit");

// Helper function for dynamic rate limits
const dynamicRateLimit = (req) => {
  try {
    if (req.user && req.user.role === "admin") {
      console.log(`[RATE LIMIT] Admin user detected: ID=${req.user.id}`); // Debugging: Log admin users
      return 100; // Admins get higher limits
    }
    console.log(`[RATE LIMIT] Standard user detected or unauthenticated request from IP: ${req.ip}`);
    return 3; // Default limit
  } catch (err) {
    console.error(`[RATE LIMIT ERROR] Error determining dynamic limit: ${err.message}`);
    return 3; // Default fallback limit
  }
};

// Custom logging for abuse attempts
const abuseLogger = (req) => {
  console.warn(`[RATE LIMIT] Exceeded for IP: ${req.ip} | Endpoint: ${req.originalUrl} | User ID: ${req.user?.id || "Unauthenticated"} | Time: ${new Date().toISOString()}`);
};

// OTP rate limiter
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10-minute window
  max: (req) => dynamicRateLimit(req), // Dynamic rate limit based on role or IP
  standardHeaders: true, // Include standard rate limit headers
  legacyHeaders: false, // Disable legacy headers
  message: {
    message: "Too many OTP requests. Please try again after 10 minutes.",
  },
  skip: (req) => {
    // Whitelist specific IPs
    const whitelist = process.env.RATE_LIMIT_WHITELIST ? process.env.RATE_LIMIT_WHITELIST.split(",") : [];
    const isWhitelisted = whitelist.includes(req.ip);
    if (isWhitelisted) {
      console.log(`[RATE LIMIT] Whitelisted IP: ${req.ip}`);
    }
    return isWhitelisted;
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
