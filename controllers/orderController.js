// src/controllers/orderController.js
import Order from "../models/Order.js";
import User from "../models/User.js"; // in case we need validations

// ===========================
// CREATE ORDER
// ===========================
export const createOrder = async (req, res) => {
  try {
    const {
      order_number,
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      assigned_staff_id,
      status,
      type_of_item,
      rating,
      tracked_location,
    } = req.body;

    // Optional: Validate customer exists
    const customer = await User.findById(customer_id);
    if (!customer)
      return res.status(400).json({ error: "Customer not found" });

    // Optional: Validate assigned staff exists
    if (assigned_staff_id) {
      const staff = await User.findById(assigned_staff_id);
      if (!staff)
        return res.status(400).json({ error: "Assigned staff not found" });
    }

    const order = await Order.create({
      order_number,
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      assigned_staff_id,
      status,
      type_of_item,
      rating,
      tracked_location,
    });

    res.status(201).json({ message: "Order created successfully", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===========================
// GET ALL ORDERS
// ===========================
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer_id", "-password")
      .populate("assigned_staff_id", "-password");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===========================
// GET SINGLE ORDER
// ===========================
export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer_id", "-password")
      .populate("assigned_staff_id", "-password");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===========================
// UPDATE ORDER
// ===========================
export const updateOrder = async (req, res) => {
  try {
    const updateData = { ...req.body };

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    })
      .populate("customer_id", "-password")
      .populate("assigned_staff_id", "-password");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({ message: "Order updated successfully", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===========================
// DELETE ORDER
// ===========================
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
