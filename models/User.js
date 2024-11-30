const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Store hashed password
  otp: { type: String }, // OTP for verification
  otpExpiry: { type: Date }, // OTP expiry time
});

module.exports = mongoose.model("User", userSchema);
