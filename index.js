import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSocketListeners } from "./socket/socketHandler.js"; 

import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import publicOrderRoutes from "./routes/publicOrderRoutes.js";

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

initializeSocketListeners(io); 



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


// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
// import dotenv from "dotenv";
// import { createServer } from "http";
// import { Server } from "socket.io";

// import userRoutes from "./routes/userRoutes.js";
// import orderRoutes from "./routes/orderRoutes.js";
// import publicOrderRoutes from "./routes/publicOrderRoutes.js";
// import Order from "./models/Order.js";

// dotenv.config();


// const app = express();

// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || "http://localhost:5173",
//     credentials: true,
//   })
// );

// app.use(express.json());


// app.use("/api/users", userRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/public/order", publicOrderRoutes);


// const httpServer = createServer(app);

// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.CLIENT_URL || "http://localhost:5173",
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// app.set("io", io);







// const startServer = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("✅ MongoDB Connected Successfully");

//     const PORT = process.env.PORT || 5000;
//     httpServer.listen(PORT, () =>
//       console.log(`🚀 Server + Socket.IO running on port ${PORT}`)
//     );
//   } catch (error) {
//     console.error("❌ MongoDB Error:", error.message);
//     process.exit(1);
//   }
// };

// startServer();
