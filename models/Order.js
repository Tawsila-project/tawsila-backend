// src/models/Order.js
import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const orderSchema = new Schema({
  order_number: {
    type: String,
    required: [true, "Order number is required"],
    unique: true,
    trim: true,
  },
  customer_id: {
    type: Types.ObjectId,
    ref: "User",
    required: [true, "Customer ID is required"],
  },
  customer_name: {
    type: String,
    required: [true, "Customer name is required"],
    trim: true,
  },
  customer_phone: {
    type: String,
    required: [true, "Customer phone is required"],
    trim: true,
  },
  customer_address: {
    type: String,
    trim: true,
  },
  assigned_staff_id: {
    type: Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["received", "in_transit", "delivered"],
    default: "received",
  },
  type_of_item: {
    type: String,
    trim: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  tracked_location: {
    lat: { type: Number },
    lng: { type: Number },
    time: { type: Date, default: Date.now },
  },
}, { timestamps: true });

// Virtual example: check if assigned
orderSchema.virtual("isAssigned").get(function () {
  return !!this.assigned_staff_id;
});

// Include virtuals in JSON output
orderSchema.set("toJSON", { virtuals: true });

export default model("Order", orderSchema);
