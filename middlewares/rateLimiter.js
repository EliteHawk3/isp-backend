const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 OTP requests per windowMs
  message: {
    message: "Too many OTP requests. Please try again later.",
  },
});

module.exports = { otpLimiter };
