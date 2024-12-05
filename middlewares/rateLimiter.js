const rateLimit = require("express-rate-limit");

// Helper function for dynamic rate limits
const dynamicRateLimit = (req) => {
  try {
    if (req.user && req.user.role === "admin") {
      console.log(`[RATE LIMIT] Admin user detected: ID=${req.user.id}`);
      return 100; // Admins get higher limits
    }
    console.log(`[RATE LIMIT] Standard user detected or unauthenticated request from IP: ${req.ip}`);
    return 3; // Default limit for regular users
  } catch (err) {
    console.error(`[RATE LIMIT ERROR] Error determining dynamic limit: ${err.message}`);
    return 3; // Fallback limit
  }
};

// Function to check if an IP is whitelisted
const isWhitelisted = (ip) => {
  const whitelist = process.env.RATE_LIMIT_WHITELIST
    ? process.env.RATE_LIMIT_WHITELIST.split(",")
    : [];
  const isAllowed = whitelist.includes(ip);
  if (isAllowed) {
    console.log(`[RATE LIMIT] Whitelisted IP: ${ip}`);
  }
  return isAllowed;
};

// Custom abuse logger
const abuseLogger = (req) => {
  console.warn(
    `[RATE LIMIT] Exceeded: IP=${req.ip} | Endpoint=${req.originalUrl} | Method=${req.method} | User ID=${req.user?.id || "Unauthenticated"} | Time=${new Date().toISOString()}`
  );
};

// Password Reset Rate Limiter
const passwordResetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24-hour window
  max: (req) => dynamicRateLimit(req), // Dynamic rate limit based on user role or IP
  standardHeaders: true, // Include standard rate limit headers
  legacyHeaders: false, // Disable legacy headers
  message: {
    message: "Too many password reset attempts. Please try again after 24 hours or contact admin support.",
  },
  skip: (req) => isWhitelisted(req.ip), // Skip rate limiting for whitelisted IPs
  handler: (req, res, next, options) => {
    abuseLogger(req); // Log abuse attempts
    res.status(options.statusCode).json(options.message); // Send rate-limit response
  },
});

// Global Rate Limiter for All Requests
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100, // Default limit for all requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
  skip: (req) => isWhitelisted(req.ip), // Skip rate limiting for whitelisted IPs
  handler: (req, res, next, options) => {
    abuseLogger(req); // Log abuse attempts
    res.status(options.statusCode).json(options.message);
  },
});

// Wrapper to apply the password reset limiter
const rateLimitMiddleware = (req, res, next) => {
  passwordResetLimiter(req, res, (err) => {
    if (err) {
      console.error(`[RATE LIMIT ERROR] ${err.message}`);
    }
    next();
  });
};

module.exports = {
  passwordResetLimiter: rateLimitMiddleware,
  globalRateLimiter,
};
