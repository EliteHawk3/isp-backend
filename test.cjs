const bcrypt = require("bcryptjs");

const password = "admin123"; // 🔹 The password you're testing

bcrypt.hash(password, 10, (err, hash) => {
  if (err) console.error("❌ Error hashing password:", err);
  else console.log("✅ New Hashed Password:", hash);
});
