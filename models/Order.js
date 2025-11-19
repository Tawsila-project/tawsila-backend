const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, required: true },
  customer_address: { type: String },
  assigned_staff_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["received", "in_transit", "delivered"], default: "received" },
  type_of_item: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  tracked_location: { type: Object }, // store JSON: { lat, lng, time }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
