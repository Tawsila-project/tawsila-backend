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
      customer_name,
      customer_phone,
      customer_address,
      assigned_staff_id,
      type_of_item,
    } = req.body;

    // Validate assigned staff exists if provided
    if (assigned_staff_id) {
      const staff = await User.findById(assigned_staff_id);
      if (!staff) return res.status(400).json({ error: "Assigned staff not found" });
    }

    const order = await Order.create({
      order_number,
      customer: {
        name: customer_name,
        phone: customer_phone,
        address: customer_address,
      },
      assigned_staff_id,
      type_of_item,
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


// ===========================
// DRIVER - UPDATE LIVE LOCATION
// ===========================
export const updateLocation = async (req, res) => {
  try {
    const { order_number, lat, lng } = req.body;

    if (!order_number || !lat || !lng) {
      return res.status(400).json({ error: "order_number, lat & lng are required" });
    }

    const order = await Order.findOneAndUpdate(
      { order_number },
      {
        tracked_location: {
          lat,
          lng,
          time: Date.now(),
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Location updated", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ===========================
// CUSTOMER - SUBMIT ORDER
// ===========================
export const submitOrder = async (req, res) => {
  try {
    const { customer_name, customer_phone, customer_address, type_of_item, tracked_location } = req.body;

    if (!customer_name || !customer_phone || !tracked_location) {
      return res.status(400).json({ error: "Name, phone and location are required" });
    }

    const order_number = "ORD-" + Date.now();

    const order = await Order.create({
      customer: {
        name: customer_name,
        phone: customer_phone,
        address: customer_address || "",
      },
      type_of_item,
      order_number,
      tracked_location: tracked_location, // Save client selected location
    });

    // EMIT event to all connected drivers
    if (req.app.get("io")) {
      req.app.get("io").emit("new-order", {
        order_number: order.order_number,
        customer: order.customer,
        type_of_item: order.type_of_item,
      });
    }

    res.status(201).json({
      message: "Order submitted successfully",
      order: {
        id: order._id,
        order_number: order.order_number,
      },
    });
  } catch (err) {
    console.error(err);
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