// src/controllers/publicOrderController.js
import Order from "../models/Order.js";
import { getActiveDriversMap } from "../socket/socketHandler.js"; 


// testing function

export const submitOrder = async (req, res) => {
    try {
        // 1. تحديد بيانات الطلب
        // نستخدم هنا req.body مباشرة لأننا قمنا بتعديل الواجهة الأمامية (CustomerForm.jsx)
        // لترسل customer: { name, phone, coords, ... }
        
        const orderData = { 
            ...req.body, 
            status: "received", // 🚨 تم التعديل ليتطابق مع enum: ["received", "in_transit", "delivered"]
            order_number: `ORD-${Date.now()}-${Math.floor(Math.random() * 100)}` 
        };
        
        const newOrder = await Order.create(orderData); 
        
        // 2. 💡 إشعار السائق المتصل عبر Socket.IO
        const targetDriverId = "69221010fe49bfdc7928fce7"; // ID السائق النشط لديك
        
        const io = req.app.get('io');
        const activeDriversMap = getActiveDriversMap();
        const targetSocketId = activeDriversMap.get(targetDriverId); 
        
        if (io && targetSocketId) {
            io.to(targetSocketId).emit('new-order', {
                order_number: newOrder.order_number,
                type_of_item: newOrder.type_of_item,
                // نستخدم customer.address و customer.coords التي تم حفظها الآن
                customer_address: newOrder.customer.address, 
                customer_coords: newOrder.customer.coords, 
            });
            console.log(`✅ Sent new order ${newOrder.order_number} to driver ${targetDriverId}`);
        } else {
            console.log(`⚠️ Driver ${targetDriverId} is offline or order routing failed.`);
        }

        // 3. إرجاع استجابة النجاح
        res.status(201).json({ 
            message: "Order submitted successfully", 
            order: { order_number: newOrder.order_number }
        });

    } catch (error) {
        console.error("❌ CRITICAL SUBMISSION ERROR:", error);
        
        let errorMessage = "Failed to process order submission.";
        if (error.name === 'ValidationError') {
            errorMessage = error.message; 
        }

        res.status(500).json({ error: errorMessage });
    }
};

// ===========================
// CUSTOMER - SUBMIT ORDER
// ===========================


// export const submitOrder = async (req, res) => {
//     try {
//         // 1. حفظ الطلب وتوليد رقم الطلب
//         const newOrder = await Order.create({ 
//             ...req.body, 
//             status: "Pending",
//             order_number: `ORD-${Date.now()}` // مثال لتوليد رقم
//         });
        
//         // 2. تعيين السائق المستهدف (نستخدم الهوية النشطة لديك)
//         const targetDriverId = "69221010fe49bfdc7928fce7"; // ⚠️ يجب أن يتطابق مع الهوية التي ظهرت في Console
        
//         // 3. جلب كائن io وقائمة السائقين
//         const io = req.app.get('io');
//         const activeDriversMap = getActiveDriversMap();
//         const targetSocketId = activeDriversMap.get(targetDriverId); 
        
//         // 4. إرسال الإشعار
//         if (io && targetSocketId) {
//             io.to(targetSocketId).emit('new-order', {
//                 order_number: newOrder.order_number,
//                 type_of_item: newOrder.type_of_item,
//                 customer_address: req.body.customer_address, 
//             });
//             console.log(`✅ Sent new order ${newOrder.order_number} to driver ${targetDriverId} at socket ${targetSocketId}`);
//         } else {
//             console.log(`⚠️ Driver ${targetDriverId} is offline or order routing failed.`);
//         }

//         res.status(201).json({ 
//             message: "Order submitted successfully", 
//             order: { order_number: newOrder.order_number }
//         });

//     } catch (error) {
//         console.error("❌ Order Submission Error:", error);
//         res.status(500).json({ error: "Failed to process order submission." });
//     }
// };



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
