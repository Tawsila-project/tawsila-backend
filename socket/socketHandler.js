import Order from "../models/Order.js";

// Map لتتبع السائقين المتصلين (driverId -> { socketId, lat, lng, availability })
const activeDrivers = new Map();

export const initializeSocketListeners = (io) => {
    
    const DRIVERS_POOL_ROOM = "drivers-pool"; 

    io.on("connection", (socket) => {
        console.log(`🟢 Socket connected: ${socket.id}`);

        // ============================
        // 1. Driver joins + registers
        // ============================
        socket.on("driver-join", (driverId) => {
            if (driverId) {
                socket.join(DRIVERS_POOL_ROOM);
                
                // 🛑 التعديل الأول: إضافة حقل availability عند الانضمام
                // يُفترض أن السائق متاح افتراضياً عند تسجيل دخوله
                activeDrivers.set(driverId, {
                    socketId: socket.id, 
                    lat: null, 
                    lng: null,
                    availability: true, // 👈 تم إضافة هذا الحقل
                });
                
                socket.data.driverId = driverId;
                console.log(`🚗 Driver joined: ${driverId} → socket ${socket.id} (Pool: ${DRIVERS_POOL_ROOM})`);
            }
        });

        // =====================================
        // 2. NEW: Driver toggles availability
        // =====================================
        // يجب أن نتيح للسائق تغيير حالته بين متاح/مشغول يدوياً
        socket.on("toggle-availability", ({ driverId, isAvailable }) => {
            const driverData = activeDrivers.get(driverId);

            if (driverData) {
                // 🛑 التعديل الثاني: تحديث حالة التوفر
                activeDrivers.set(driverId, {
                    ...driverData, // نحافظ على كل البيانات الأخرى (socketId, lat, lng)
                    availability: isAvailable, // نحدث حالة التوفر فقط
                });
                console.log(`🔄 Driver ${driverId} availability updated to: ${isAvailable}`);
            }
        });

        // ============================
        // 3. Customer joins order room
        // ============================
        socket.on("join-order", async (orderId) => {
            if (!orderId) return;

            socket.join(orderId);
            console.log(`📦 Customer joined order room: ${orderId}`);

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
        // 4. Driver Live Location Update
        // ============================
        socket.on("update-location", async ({ orderId, driverId, lat, lng }) => {

            const driverData = activeDrivers.get(driverId);
            if (driverData) {
                // 🛑 التعديل الثالث: استخدام الـ Spread Operator للحفاظ على الحقول الأخرى (availability)
                activeDrivers.set(driverId, {
                    ...driverData, // 👈 نحافظ على البيانات القديمة بما في ذلك availability
                    lat: lat, // الموقع الجديد
                    lng: lng, // الموقع الجديد
                });
            }
            // تحقق صارم من البيانات
            if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') {
                console.warn(`Invalid location data from Driver ${driverId}`);
                return;
            }

            // Update location in DB (بدون انتظار الـ Promise)
            Order.findOneAndUpdate(
                { order_number: orderId },
                { tracked_location: { lat, lng, time: Date.now() } }
            ).catch(err => console.error("DB update error:", err));

            // Emit to customers in room
            io.to(orderId).emit("location-updated", { lat, lng, driverId, timestamp: Date.now() });
        });
        
        // =====================================
        // 5. Driver completes the delivery
        // =====================================
        socket.on("complete-order", async ({ orderId, driverId }) => {
            if (!orderId || !driverId) return;

            console.log(`✅ Driver ${driverId} completed Order ${orderId}`);

            try {
                // 1. Update the order status in the database
                const updatedOrder = await Order.findOneAndUpdate(
                    { order_number: orderId, driver_id: driverId },
                    // 💡 هنا يجب أن تعيد تعيين حالة السائق إلى "متاح" في قاعدة البيانات أيضاً
                    { status: "COMPLETED", $unset: { tracked_location: 1 } }, 
                    { new: true }
                );

                if (updatedOrder) {
                    // 2. Notify the customer in the order room
                    io.to(orderId).emit("status-update", { 
                        status: "COMPLETED", 
                        message: "The driver has marked the delivery as complete. Enjoy your order!"
                    });
                    
                    // 3. 💡 التعديل الرابع: إعادة تعيين التوفر للسائق إلى 'متاح' في الذاكرة بعد الإكمال
                    const driverData = activeDrivers.get(driverId);
                    if (driverData) {
                         activeDrivers.set(driverId, {
                            ...driverData,
                            availability: true, // 👈 مهم جداً لكي يتمكن من أخذ طلب جديد
                        });
                        console.log(`🔄 Driver ${driverId} is now available again.`);
                    }
                } else {
                    console.warn(`Order ${orderId} not found or driver mismatch during completion.`);
                }

            } catch (error) {
                console.error(`Error completing order ${orderId}:`, error);
            }
        });


        // ============================
        // 6. Disconnect
        // ============================
        socket.on("disconnect", () => {
            console.log(`🔴 Socket disconnected: ${socket.id}`);
            
            const driverId = socket.data.driverId;
            const driverData = activeDrivers.get(driverId);

            if (driverId && driverData && driverData.socketId === socket.id) {
                activeDrivers.delete(driverId);
                console.log(`🚗❌ Driver offline: ${driverId}`);
            }
        });
    });
};

export const getActiveDriversMap = () => activeDrivers;

// // src/socket/socketHandler.js
// import Order from "../models/Order.js";

// // Map لتتبع السائقين المتصلين (driverId -> socket.id)
// const activeDrivers = new Map();

// export const initializeSocketListeners = (io) => {
    
//     // 💡 يمكن استخدام متغير Driver Pool هنا بدلاً من global scope
//     const DRIVERS_POOL_ROOM = "drivers-pool"; 

//     io.on("connection", (socket) => {
//         console.log(`🟢 Socket connected: ${socket.id}`);

//         // ============================
//         // 1. Driver joins + registers
//         // ============================
//         socket.on("driver-join", (driverId) => {
//             if (driverId) {
//             socket.join(DRIVERS_POOL_ROOM);
//                             // 💡 التعديل هنا: تخزين الـ socketId والموقع الأولي
//             activeDrivers.set(driverId, {
//                     socketId: socket.id, 
//                     lat: null, 
//                     lng: null 
//                 });
//                 activeDrivers.set(driverId, socket.id);
//                 // تعيين DriverId على Socket object ليسهل إزالته لاحقًا
//                 socket.data.driverId = driverId;
//                 console.log(`🚗 Driver joined: ${driverId} → socket ${socket.id} (Pool: ${DRIVERS_POOL_ROOM})`);
//             }
//         });

//         // ============================
//         // 2. Customer joins order room
//         // ============================
//         socket.on("join-order", async (orderId) => {
//             if (!orderId) return;

//             // 💡 الانضمام إلى غرفة باسم رقم الطلب
//             socket.join(orderId);
//             console.log(`📦 Customer joined order room: ${orderId}`);

//             // إرسال آخر موقع معروف فورًا
//             try {
//                 const order = await Order.findOne({ order_number: orderId });
//                 if (order?.tracked_location) {
//                     socket.emit("location-updated", {
//                         lat: order.tracked_location.lat,
//                         lng: order.tracked_location.lng,
//                     });
//                 }
//             } catch (error) {
//                 console.error("Error fetching order on join:", error);
//             }
//         });

//         // ============================
//         // 3. Driver Live Location Update
//         // ============================
//         socket.on("update-location", async ({ orderId, driverId, lat, lng }) => {

//             const driverData = activeDrivers.get(driverId);
//             if (driverData) {
//                 activeDrivers.set(driverId, {
//                     // نحافظ على الـ socketId
//                     socketId: driverData.socketId, 
//                     lat: lat, // الموقع الجديد
//                     lng: lng, // الموقع الجديد
//                 });
//             }
//             // تحقق صارم من البيانات
//             if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') {
//                 console.warn(`Invalid location data from Driver ${driverId}`);
//                 return;
//             }

//             // لا حاجة لـ console.log في كل إرسال، يفضل تركها في مرحلة التطوير فقط
//             // console.log(`📍 Driver(${driverId}) → Order(${orderId}) location: ${lat}, ${lng}`);

//             // Update location in DB (بدون انتظار الـ Promise)
//             Order.findOneAndUpdate(
//                 { order_number: orderId },
//                 { tracked_location: { lat, lng, time: Date.now() } }
//             ).catch(err => console.error("DB update error:", err));

//             // Emit to customers in room
//             io.to(orderId).emit("location-updated", { lat, lng, driverId, timestamp: Date.now() });
//         });

//         // ============================
//         // 4. Disconnect
//         // ============================
//         socket.on("disconnect", () => {
//             console.log(`🔴 Socket disconnected: ${socket.id}`);
            
//             // 💡 استخدام socket.data.driverId لتحديد السائق المغادر
//             const driverId = socket.data.driverId;
//             if (driverId && activeDrivers.get(driverId) === socket.id) {
//                 activeDrivers.delete(driverId);
//                 console.log(`🚗❌ Driver offline: ${driverId}`);
//             }
//         });
//     });
// };

// export const getActiveDriversMap = () => activeDrivers;