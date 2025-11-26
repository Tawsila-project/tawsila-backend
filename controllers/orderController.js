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
// GET PLACES STATS
// ===========================

export const getPlacesStats = async (req, res) => {
  try {
    const { range } = req.query;

    let startDate = new Date();

    if (range === "daily") {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const results = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$customer.address",
          deliveries: { $sum: 1 }
        }
      },
      {
        $project: {
          city: "$_id",
          deliveries: 1,
          _id: 0
        }
      }
    ]);

    res.json(results);

  } catch (error) {
    console.log("❌ Stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};


// ===========================
// GET Orders STATS
// ===========================

export const getOrdersByRange = async (req, res) => {
  try {
    const { range } = req.query;

    let startDate = new Date();

    if (range === "daily") {
      startDate.setHours(0, 0, 0, 0);
    } 
    else if (range === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } 
    else if (range === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: "$_id",
          orders: 1,
          _id: 0
        }
      }
    ]);

    res.json(stats);

  } catch (error) {
    console.error("❌ Error loading range stats:", error);
    res.status(500).json({ error: "Failed to load statistics" });
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






// ===========================
// DRIVER - ACCEPT ORDER 🟢
// ===========================


export const acceptOrder = async (req, res) => {
    try {
        const { order_number, driver_id } = req.body;

        const order = await Order.findOneAndUpdate(
            { order_number, status: 'received' }, 
            {
                status: 'in_transit',
                assigned_staff_id: driver_id,
            },
            { new: true }
        );

        if (!order) {
            // يتم إرجاع هذا إذا لم يتم العثور على الطلب أو كانت حالته ليست 'received' (أي تم قبوله من سائق آخر)
            return res.status(409).json({ error: "Order not found or already assigned/accepted." });
        }

        // 2. Notify ALL drivers that the order is no longer available
        if (req.app.get("io")) {
            req.app.get("io").emit("order-accepted", { order_number: order.order_number });
            
            // 3. Notify the customer that a driver has been assigned (افتراضاً أن العميل في غرفة بنفس رقم الطلب)
            req.app.get("io").to(order.order_number).emit("status-update", { 
                status: 'in_transit', 
                driver_id: driver_id,
                driver_phone: "DRIVER_PHONE_PLACEHOLDER" // يجب جلب رقم هاتف السائق من DB
            });
        }

        res.json({ message: "Order accepted successfully", order });

    } catch (err) {
        console.error("❌ Error accepting order:", err.message);
        res.status(500).json({ error: "Failed to accept order", details: err.message });
    }
};
// export const acceptOrder = async (req, res) => {
//     try {
//         const { order_number, driver_id } = req.body;

//         const order = await Order.findOneAndUpdate(
//             // البحث عن الطلبات التي حالتها 'received' لمنع قبول نفس الطلب مرتين
//             { order_number, status: 'received' }, 
//             {
//                 status: 'in_transit',
//                 assigned_staff_id: driver_id,
//             },
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).json({ error: "Order not found or already assigned" });
//         }

//         // 2. Notify ALL drivers that the order is no longer available
//         if (req.app.get("io")) {
//             req.app.get("io").emit("order-accepted", { order_number: order.order_number });
//         }

//         // 3. Notify the customer that a driver has been assigned
//         if (req.app.get("io")) {
//             req.app.get("io").to(order.order_number).emit("status-update", { 
//                 status: 'in_transit', 
//                 driver_id: driver_id 
//             });
//         }

//         res.json({ message: "Order accepted successfully", order });

//     } catch (err) {
//         console.error("❌ Error accepting order:", err.message);

//         // إرجاع 500 لأخطاء الخادم الأخرى
//         res.status(500).json({ error: "Failed to accept order", details: err.message });
//     }
// }

// export const acceptOrder = async (req, res) => {
//     try {
//         const { order_number, driver_id } = req.body;

//           const order = await Order.findOneAndUpdate(
//             // 🚨 التعديل الأول: البحث عن الطلبات التي حالتها 'received' (المتطابقة مع حالة الإنشاء)
//             { order_number, status: 'received' }, 
//                {
//                 // 🚨 التعديل الثاني: تعيين حالة صالحة من الـ Enum (مثل 'in_transit')
//                 status: 'in_transit',
//                 assigned_staff_id: driver_id,
//                 },
//             { new: true }
//         );

//         if (!order) {
//             // الآن رسالة الخطأ 404 منطقية: إما أن الطلب لم يوجد أو تم قبوله بالفعل
//             return res.status(404).json({ error: "Order not found or already assigned" });

//              }

//         // 2. Notify ALL drivers that the order is no longer available
//         if (req.app.get("io")) {
//             req.app.get("io").emit("order-accepted", { order_number: order.order_number });

//               }

//         // 3. Notify the customer that a driver has been assigned
//         if (req.app.get("io")) {
//             req.app.get("io").to(order.order_number).emit("status-update", { 
//                 status: 'in_transit', // 🚨 استخدام الحالة الجديدة الصحيحة
//                 driver_id: driver_id 

//                      });
//         }

//          res.json({ message: "Order accepted successfully", order });

//            } catch (err) {
//         console.error("❌ Error accepting order:", err.message);

//         res.status(500).json({ error: "Failed to accept order", details: err.message });
//     }

//   }


export const getAvailableOrders = async (req, res) => {
    try {
        // 🚨 ملاحظة: يمكنك إضافة منطق بحث جغرافي هنا (مثلاً: within 10km of driver's location)
        // حالياً، سنبحث عن جميع الطلبات الجديدة (received).
        const availableOrders = await Order.find({ status: "received" })
            .select("order_number customer.address customer.coords type_of_item createdAt") // اختيار الحقول الضرورية فقط
            .sort({ createdAt: -1 }); // ترتيبها من الأحدث للأقدم

        res.json({
            message: "Available orders retrieved successfully.",
            orders: availableOrders
        });

    } catch (error) {
        console.error("❌ Error fetching available orders:", error);
        res.status(500).json({ error: "Failed to fetch available orders.", details: error.message });
    }
};

// =======================================
// UPDATE DRIVER LOCATION (POST /driver/location/update)
// =======================================

export const updateDriverLocation = async (req, res) => {
    try {
        const { driver_id, lat, lng } = req.body;

        // 1. تحديث موقع السائق في قاعدة بيانات المستخدمين (افتراضي: User model)

        // 2. البحث عن الطلبات التي تم تعيينها لهذا السائق والتي حالتها 'in_transit'
        const orders = await Order.find({ assigned_staff_id: driver_id, status: 'in_transit' })
                                  .select("order_number");

        if (req.app.get("io")) {
            // 3. البث إلى غرف العملاء المتأثرين (كل عميل في غرفة برقم طلبه)
            orders.forEach(order => {
                req.app.get("io").to(order.order_number).emit("driver-location-update", {
                    lat, 
                    lng, 
                    time: new Date() 
                });
            });
        }

        res.json({ message: "Location updated and broadcasted successfully" });
    } catch (error) {
        console.error("❌ Error updating driver location:", error.message);
        res.status(500).json({ error: "Failed to update location", details: error.message });
    }
};