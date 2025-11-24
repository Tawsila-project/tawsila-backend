import Order from "../models/Order.js";
import { getActiveDriversMap } from "../socket/socketHandler.js";

// =======================================
// SUBMIT ORDER
// =======================================
export const submitOrder = async (req, res) => {
    try {
        // 1. Prepare order data
        const orderData = {
            ...req.body,
            status: "received", // must match enum
            order_number: `ORD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        };

        const newOrder = await Order.create(orderData);

        // 2. Notify driver via Socket.IO
        const targetDriverId = "69221010fe49bfdc7928fce7";

        const io = req.app.get("io");
        const activeDriversMap = getActiveDriversMap();
        const targetSocketId = activeDriversMap.get(targetDriverId);

        if (io && targetSocketId) {
            io.to(targetSocketId).emit("new-order", {
                order_number: newOrder.order_number,
                type_of_item: newOrder.type_of_item,
                customer_address: newOrder.customer.address,
                customer_coords: newOrder.customer.coords,
            });

            console.log(`✅ Sent new order ${newOrder.order_number} to driver ${targetDriverId}`);
        } else {
            console.log(`⚠️ Driver ${targetDriverId} is offline or order routing failed.`);
        }

        // 3. Return success response
        res.status(201).json({
            message: "Order submitted successfully",
            order: { order_number: newOrder.order_number },
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
