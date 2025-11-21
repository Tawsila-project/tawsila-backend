// src/controllers/publicOrderController.js
import Order from "../models/Order.js";

// ===========================
// CUSTOMER - SUBMIT ORDER
// ===========================

export const submitOrder = async (req, res) => {
  try {
    // ⚡️ يجب التأكد من استخراج tracked_location هنا 
    // ⚡️ (كان هذا هو مصدر الخطأ ReferenceError)
    const { customer_name, customer_phone, customer_address, type_of_item, tracked_location } = req.body;
// ______________________________________________________________________

    // Validate required fields + location
    if (!customer_name || !customer_phone || !tracked_location?.lat || !tracked_location?.lng) {
      return res.status(400).json({ error: "Customer name, phone, and delivery location are required" });
    }

    // Generate a unique order number
    const order_number = "ORD-" + Date.now();

    const order = await Order.create({
      customer: {
        name: customer_name,
        phone: customer_phone,
        address: customer_address || "",
        // حفظ إحداثيات الوجهة النهائية للعميل
        coords: {
            lat: tracked_location.lat,
            lng: tracked_location.lng,
        }
      },
      type_of_item,
      order_number,
      // حفظ الموقع الأولي للسائق (موقع العميل هو نقطة البداية مؤقتاً)
      tracked_location: { 
        lat: tracked_location.lat, 
        lng: tracked_location.lng,
      },
    });

    res.status(201).json({
      message: "Order submitted successfully",
      order: {
        id: order._id,
        order_number: order.order_number,
      },
    });
  } catch (err) {
    console.error("❌ Error submitting order:", err.message);
    // إرجاع خطأ 500 مفصل (للتطوير)
    res.status(500).json({ error: "Failed to process order", details: err.message }); 
  }
};
// export const submitOrder = async (req, res) => {
//   try {
//     const { customer_name, customer_phone, customer_address, type_of_item } = req.body;

//     // Validate required fields
//     if (!customer_name || !customer_phone) {
//       return res.status(400).json({ error: "Customer name and phone are required" });
//     }

//     // Generate a unique order number
//     const order_number = "ORD-" + Date.now();

//     const order = await Order.create({
//       customer: {
//         name: customer_name,
//         phone: customer_phone,
//         address: customer_address || "",
//         coords: {
//             lat: tracked_location.lat,
//             lng: tracked_location.lng,
//         }
//       },
//       type_of_item,
//       order_number,
//         tracked_location: {
//         lat: tracked_location.lat, // الموقع الأولي (موقع العميل/الاستلام)
//         lng: tracked_location.lng,
//     },
//     });

//     res.status(201).json({
//       message: "Order submitted successfully",
//       order: {
//         id: order._id,
//         order_number: order.order_number,
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };



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
      // customer: order.customer,
      customer: {
          name: order.customer.name,
          phone: order.customer.phone,
          address: order.customer.address,
          // ⚡️ إرجاع إحداثيات الوجهة النهائية
          lat: order.customer.coords.lat, 
          lng: order.customer.coords.lng,
      },
      type_of_item: order.type_of_item,
      created_at: order.createdAt,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
