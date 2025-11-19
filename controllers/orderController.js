const Order = require("../models/Order");

// Create Order
exports.createOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("customer_id assigned_staff_id");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Single Order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customer_id assigned_staff_id");
    if(!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Order
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if(!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if(!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
