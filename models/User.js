const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String },
  role: { type: String, enum: ["admin", "staff", "customer"], required: true },
  availability: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
