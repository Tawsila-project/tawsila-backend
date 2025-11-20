// src/controllers/publicOrderController.js
import Order from "../models/Order.js";

// ===========================
// CUSTOMER - SUBMIT ORDER
// ===========================
export const submitOrder = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_address,
      type_of_item,
    } = req.body;

    // Validate fields
    if (!customer_name || !customer_phone || !type_of_item) {
      return res.status(400).json({
        error: "Name, phone, and item type are required",
      });
    }

    // Generate random tracking/order number
    const order_number = "ORD-" + Math.floor(100000 + Math.random() * 900000);

    // Create order
    const order = await Order.create({
      order_number,
      customer: {
        name: customer_name,
        phone: customer_phone,
        address: customer_address,
      },
      type_of_item,
      status: "received",
    });

    res.status(201).json({
      message: "Order submitted successfully",
      order_number,
      order,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ===========================
// CUSTOMER - TRACK ORDER
// ===========================
export const trackOrder = async (req, res) => {
  try {
    const { order_number } = req.params;

    const order = await Order.findOne({ order_number });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      order_number: order.order_number,
      status: order.status,
      assigned_staff_id: order.assigned_staff_id,
      tracked_location: order.tracked_location,
      customer: order.customer,
      type_of_item: order.type_of_item,
      created_at: order.createdAt,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
