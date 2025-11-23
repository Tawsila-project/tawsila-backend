// src/socket/socketHandler.js
import Order from "../models/Order.js";

// Map لتتبع السائقين المتصلين (driverId -> socket.id)
const activeDrivers = new Map();

export const initializeSocketListeners = (io) => {
    
    // 💡 يمكن استخدام متغير Driver Pool هنا بدلاً من global scope
    const DRIVERS_POOL_ROOM = "drivers-pool"; 

    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id}`);

        // ============================
        // 1. Driver joins + registers
        // ============================
        socket.on("driver-join", (driverId) => {
            if (driverId) {
                socket.join(DRIVERS_POOL_ROOM); // ⬅️ الإضافة الجديدة لنظام إرسال الطلبات
                activeDrivers.set(driverId, socket.id);
                // تعيين DriverId على Socket object ليسهل إزالته لاحقًا
                socket.data.driverId = driverId; 
                console.log(`🚗 Driver joined: ${driverId} → socket ${socket.id} (Pool: ${DRIVERS_POOL_ROOM})`);
            }
        });

        // ============================
        // 2. Customer joins order room
        // ============================
        socket.on("join-order", async (orderId) => {
            if (!orderId) return;

            // 💡 الانضمام إلى غرفة باسم رقم الطلب
            socket.join(orderId);
            console.log(`📦 Customer joined order room: ${orderId}`);

            // إرسال آخر موقع معروف فورًا
            try {
                const order = await Order.findOne({ order_number: orderId });
                if (order?.tracked_location) {
                    socket.emit("location-updated", {
                        lat: order.tracked_location.lat,
                        lng: order.tracked_location.lng,
                    });
                }
            } catch (error) {
                console.error("Error fetching order on join:", error);
            }
        });

        // ============================
        // 3. Driver Live Location Update
        // ============================
        socket.on("update-location", async ({ orderId, driverId, lat, lng }) => {
            // تحقق صارم من البيانات
            if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') {
                console.warn(`Invalid location data from Driver ${driverId}`);
                return;
            }

            // لا حاجة لـ console.log في كل إرسال، يفضل تركها في مرحلة التطوير فقط
            // console.log(`📍 Driver(${driverId}) → Order(${orderId}) location: ${lat}, ${lng}`);

            // Update location in DB (بدون انتظار الـ Promise)
            Order.findOneAndUpdate(
                { order_number: orderId },
                { tracked_location: { lat, lng, time: Date.now() } }
            ).catch(err => console.error("DB update error:", err));

            // Emit to customers in room
            io.to(orderId).emit("location-updated", { lat, lng, driverId, timestamp: Date.now() });
        });

        // ============================
        // 4. Disconnect
        // ============================
        socket.on("disconnect", () => {
            console.log(`🔴 Socket disconnected: ${socket.id}`);
            
            // 💡 استخدام socket.data.driverId لتحديد السائق المغادر
            const driverId = socket.data.driverId;
            if (driverId && activeDrivers.get(driverId) === socket.id) {
                activeDrivers.delete(driverId);
                console.log(`🚗❌ Driver offline: ${driverId}`);
            }
        });
    });
};

export const getActiveDriversMap = () => activeDrivers;