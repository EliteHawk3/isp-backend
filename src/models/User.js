import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    active: { type: Boolean, default: true },

    // Fields only required for users (NOT admins)
    cnic: {
      type: String,
      unique: true,
      sparse: true, // ✅ Allows admins to not have CNIC
      validate: {
        validator: function (value) {
          return this.role === "admin" ? !value : !!value;
        },
        message: "CNIC is required for users but not for admins",
      },
    },
    address: {
      type: String,
      required: function () {
        return this.role === "user";
      },
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: function () {
        return this.role === "user";
      },
    },
    installationCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["one-time", "everytime"],
      default: "one-time",
    },
  },
  { timestamps: true }
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
