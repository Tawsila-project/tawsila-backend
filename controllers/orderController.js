// src/controllers/orderController.js
import Order from "../models/Order.js";
import User from "../models/User.js"; // in case we need validations

// ===========================
// CREATE ORDER
// ===========================
// export const createOrder = async (req, res) => {
//   try {
//     const {
//       order_number,
//       customer_name,
//       customer_phone,
//       customer_address,
//       assigned_staff_id,
//       type_of_item,
//     } = req.body;

//     // Validate assigned staff exists if provided
//     if (assigned_staff_id) {
//       const staff = await User.findById(assigned_staff_id);
//       if (!staff) return res.status(400).json({ error: "Assigned staff not found" });
//     }

//     const order = await Order.create({
//       order_number,
//       customer: {
//         name: customer_name,
//         phone: customer_phone,
//         address: customer_address,
//       },
//       assigned_staff_id,
//       type_of_item,
//     });

//     res.status(201).json({ message: "Order created successfully", order });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


// ===========================
// GET ALL ORDERS
// ===========================
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("assigned_staff_id", "-password -token"); // never expose sensitive data

    res.status(200).json(orders);
  } catch (err) {
    console.error("GET ORDERS ERROR:", err);
    res.status(500).json({ error: "Server error while fetching orders" });
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
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // return updated document
    ).populate("assigned_staff_id", "-password -token");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json({ message: "Order updated successfully", order });
  } catch (err) {
    console.error("UPDATE ORDER ERROR:", err);
    res.status(500).json({ error: "Server error while updating order" });
  }
};


// ===========================
// DELETE ORDER
// ===========================
export const deleteOrder = async (req, res) => {
  console.log("Received delete request for ID:", req.params.id);
  console.log("Request user:", req.user); // Check role
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ error: "Server error while deleting order" });
  }
};





// ===========================
// DRIVER - UPDATE LIVE LOCATION
// ===========================
// export const updateLocation = async (req, res) => {
//   try {
//     const { order_number, lat, lng } = req.body;

//     if (!order_number || !lat || !lng) {
//       return res.status(400).json({ error: "order_number, lat & lng are required" });
//     }

//     const order = await Order.findOneAndUpdate(
//       { order_number },
//       {
//         tracked_location: {
//           lat,
//           lng,
//           time: Date.now(),
//         },
//       },
//       { new: true }
//     );

//     if (!order) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     res.json({ message: "Location updated", order });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };




// ... (جميع الـ exports السابقة: createOrder, getOrders, getOrder, updateOrder, deleteOrder, updateLocation)

// ===========================
// DRIVER - ACCEPT ORDER 🟢
// ===========================
// src/controllers/orderController.js
export const acceptOrder = async (req, res) => {
    try {
        const { order_number, driver_id } = req.body;

        // ... (التحقق من order_number و driver_id يبقى كما هو)

        // 1. Find the order and update its status
        const order = await Order.findOneAndUpdate(
            // 🚨 التعديل الأول: البحث عن الطلبات التي حالتها 'received' (المتطابقة مع حالة الإنشاء)
            { order_number, status: 'received' }, 
            {
                // 🚨 التعديل الثاني: تعيين حالة صالحة من الـ Enum (مثل 'in_transit')
                status: 'in_transit',
                assigned_staff_id: driver_id,
            },
            { new: true }
        );

        if (!order) {
            // الآن رسالة الخطأ 404 منطقية: إما أن الطلب لم يوجد أو تم قبوله بالفعل
            return res.status(404).json({ error: "Order not found or already assigned" });
        }

        // 2. Notify ALL drivers that the order is no longer available
        if (req.app.get("io")) {
            req.app.get("io").emit("order-accepted", { order_number: order.order_number });
        }
        
        // 3. Notify the customer that a driver has been assigned
        if (req.app.get("io")) {
            req.app.get("io").to(order.order_number).emit("status-update", { 
                status: 'in_transit', // 🚨 استخدام الحالة الجديدة الصحيحة
                driver_id: driver_id 
            });
        }

        res.json({ message: "Order accepted successfully", order });

    } catch (err) {
        console.error("❌ Error accepting order:", err.message);
        res.status(500).json({ error: "Failed to accept order", details: err.message });
    }
};