import Order from "../models/Order.js";
import { getActiveDriversMap } from "../socket/socketHandler.js";
import { haversineDistance } from "../utils/geoUtils.js";

// =======================================
// SUBMIT ORDER
// =======================================

// يرجى التأكد من بقاء جميع الاستيرادات الخاصة بك (مثل Order, haversineDistance, getActiveDriversMap) في أعلى الملف

export const submitOrder = async (req, res) => {
    try {
        const io = req.app.get("io");
        const activeDriversMap = getActiveDriversMap();
        
        // 🚨 تصحيح الأخطاء: اطبع محتوى الخريطة بالكامل
        console.log("------------------------------------------");
        console.log("Current Active Drivers Map Size:", activeDriversMap.size);
        if (activeDriversMap.size > 0) {
            console.log("Active Drivers Keys:", Array.from(activeDriversMap.keys()));
            // اطبع بيانات السائق الأول للتحقق من التنسيق وحالة التوفر (availability)
            console.log("Example Driver Data:", activeDriversMap.values().next().value);
        } else {
             console.log("Active Drivers Map is EMPTY.");
        }
        console.log("------------------------------------------");
        
        const customerCoords = req.body.customer?.coords; 

        // 1. تحديد أقرب سائق متاح (قد تكون النتيجة null)
        let nearestDriverId = null;
        let shortestDistance = Infinity;

        if (customerCoords && customerCoords.lat && customerCoords.lng) {
            
            for (const [driverId, driverData] of activeDriversMap.entries()) {
                
                // 🛑 التعديل الجوهري: التحقق من التوفر (availability: true) والموقع
                if (
                    driverData.lat !== null && 
                    driverData.lng !== null && 
                    driverData.availability === true // 👈 شرط التوفر الجديد
                ) {
                    
                    const distance = haversineDistance(
                        customerCoords.lat, 
                        customerCoords.lng, 
                        driverData.lat, 
                        driverData.lng
                    );

                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        nearestDriverId = driverId;
                    }
                }
            }
        }
        
        // Final Driver ID for assignment
        const targetDriverId = nearestDriverId;
        
        // 🛑 إذا لم يُعثر على سائق في الخريطة، يعود بـ 404
        if (!targetDriverId) {
             console.log("❌ Routing failed: No available or active drivers found with location and true availability.");
             return res.status(404).json({ error: "No nearby drivers are currently available." });
        }
        
        // 2. تجهيز بيانات الطلب وتعيين السائق
        const orderData = {
            ...req.body,
            status: "received",
            order_number: `ORD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
            assigned_staff_id: targetDriverId,
        };

        const newOrder = await Order.create(orderData);

        // 3. إرسال إشعار الـ Socket (يتم فقط إذا وجدنا سائقاً)
        if (targetDriverId) {
            const targetDriverData = activeDriversMap.get(targetDriverId);
            const targetSocketId = targetDriverData?.socketId; 

            if (io && targetSocketId) {
                io.to(targetSocketId).emit("new-order", {
                    order_number: newOrder.order_number,
                    type_of_item: newOrder.type_of_item,
                    customer_address: newOrder.customer.address,
                    customer_coords: newOrder.customer.coords,
                });

                console.log(`✅ Sent new order ${newOrder.order_number} to NEAREST driver ${targetDriverId}. Distance: ${shortestDistance.toFixed(2)} km`);
            } else {
                console.log(`⚠️ Driver ${targetDriverId} disconnected during routing. DB persistence ensures delivery.`);
            }
        } else {
            console.log(`⏱️ Order ${newOrder.order_number} created, waiting for driver assignment (assigned_staff_id: null).`);
        }

        // 4. إرجاع استجابة النجاح
        res.status(201).json({
            message: targetDriverId 
                ? "Order assigned successfully to the nearest driver." 
                : "Order received. Waiting for driver assignment.", 
            order: { 
                order_number: newOrder.order_number, 
                assigned_driver: targetDriverId,
            },
        });

    } catch (error) {
        console.error("❌ CRITICAL SUBMISSION ERROR:", error);
        let errorMessage = "Failed to process order submission.";
        if (error.name === "ValidationError") {
            errorMessage = error.message;
        }
        res.status(500).json({ error: errorMessage });
    }
};

// =======================================
// TRACK ORDER
// =======================================
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
            customer: {
                name: order.customer.name,
                phone: order.customer.phone,
                address: order.customer.address,
                coords: order.customer.coords, // matches frontend expectation
            },
            type_of_item: order.type_of_item,
            created_at: order.createdAt,
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
