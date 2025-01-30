import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  speed: { type: Number, required: true }, // Speed in Mbps
  cost: { type: Number, required: true }, // Monthly cost
  usersCount: { type: Number, default: 0 }, // Number of subscribed users
});

const Package = mongoose.model("Package", packageSchema);
export default Package;
