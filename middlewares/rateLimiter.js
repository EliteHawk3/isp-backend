const rateLimit = require("express-rate-limit");

// Helper function for dynamic rate limits
const dynamicRateLimit = (req, res) => {
  if (req.user && req.user.role === "admin") {
    return 100; // Admins get higher limits
  }
  return 3; // Default limit
};

// OTP rate limiter: Prevents abuse of OTP requests
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes window
  max: dynamicRateLimit, // Use dynamic rate limit based on user roles
  standardHeaders: true, // Include rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    message: "Too many OTP requests. Please try again after 10 minutes.",
  },
  skip: (req) => {
    // Whitelist specific IPs or conditions
    const whitelist = ["127.0.0.1", "192.168.1.1"];
    return whitelist.includes(req.ip);
  },
});

// Log abuse attempts for monitoring
const abuseLogger = (req) => {
  console.warn(`Rate limit exceeded for IP: ${req.ip}`);
};

// Middleware wrapper to handle custom logic for logging
const rateLimitMiddleware = (req, res, next) => {
  otpLimiter(req, res, (err) => {
    if (err) {
      abuseLogger(req);
    }
    next();
  });
};

module.exports = { otpLimiter: rateLimitMiddleware };
