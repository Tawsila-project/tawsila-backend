import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import publicOrderRoutes from "./routes/publicOrderRoutes.js";
import Order from "./models/Order.js";

dotenv.config();

// =======================================
// EXPRESS INIT
// =======================================
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// =======================================
// ROUTES
// =======================================
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/public/order", publicOrderRoutes);

// =======================================
// SOCKET.IO SERVER
// =======================================
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ⚡️ Expose io to controllers
app.set("io", io);

// حفظ جميع السائقين المتصلين
const activeDrivers = new Map();

// =======================================
// SOCKET LOGIC
// =======================================
io.on("connection", (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  // ============================
  // Driver joins + register
  // ============================
  socket.on("driver-join", (driverId) => {
    activeDrivers.set(driverId, socket.id);
    console.log(`🚗 Driver joined: ${driverId} → socket ${socket.id}`);
  });

  // ============================
  // Customer joins order room
  // ============================
  socket.on("join-order", async (orderId) => {
    socket.join(orderId);
    console.log(`📦 Customer joined order room: ${orderId}`);

    // Send last known location immediately
    const order = await Order.findOne({ order_number: orderId });
    if (order?.tracked_location) {
      socket.emit("location-updated", {
          lat: order.tracked_location.lat,
          lng: order.tracked_location.lng,
          // لا نرسل driverId هنا لأنه غير مهم للعميل في أول اتصال
        });
      // socket.emit("location-updated", order.tracked_location);
    }
  });

  // ============================
  // Driver Live Location
  // ============================
  socket.on("update-location", async ({ orderId, driverId, lat, lng }) => {
    if (!orderId || !lat || !lng) return;

    console.log(`📍 Driver(${driverId}) → Order(${orderId}) location: ${lat}, ${lng}`);

    // Update location in DB
    await Order.findOneAndUpdate(
      { order_number: orderId },
      { tracked_location: { lat, lng, time: Date.now() } }
    );

    // Emit to customers in room
    io.to(orderId).emit("location-updated", { lat, lng, driverId, timestamp: Date.now() });
  });

  // ============================
  // Disconnect
  // ============================
  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
    for (const [driverId, sockId] of activeDrivers.entries()) {
      if (sockId === socket.id) {
        activeDrivers.delete(driverId);
        console.log(`🚗❌ Driver offline: ${driverId}`);
      }
    }
  });
});

// =======================================
// START SERVER + MONGO
// =======================================
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () =>
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`)
    );
  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);
    process.exit(1);
  }
};

startServer();
