
import express from "express";
import mongoose from "mongoose";
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

// =======================================
// CORS CONFIGURATION (fix preflight for Netlify)
// =======================================
const allowedOrigins = [
  "http://localhost:5173",
  "https://curious-cascaron-69f699.netlify.app"
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

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
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("CORS not allowed"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

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
// import { initializeSocketListeners } from "./socket/socketHandler.js"; 

// import userRoutes from "./routes/userRoutes.js";
// import orderRoutes from "./routes/orderRoutes.js";
// import publicOrderRoutes from "./routes/publicOrderRoutes.js";

// dotenv.config();

// // =======================================
// // CRITICAL CORS CONFIGURATION FIX
// // This section allows multiple frontend origins (local and deployed)
// // =======================================

// // 1. Define the list of allowed origins (frontend URLs)
// const allowedOrigins = [
//     "http://localhost:5173" , "https://curious-cascaron-69f699.netlify.app" // Development environment
//     // IMPORTANT: Add your deployed frontend URL here, e.g., "https://your-website.com"
// ];

// // 2. Conditionally add the CLIENT_URL from environment variables if it exists
// if (process.env.CLIENT_URL) {
//     if (!allowedOrigins.includes(process.env.CLIENT_URL)) {
//         allowedOrigins.push(process.env.CLIENT_URL);
//     }
// }

// // =======================================
// // EXPRESS INIT
// // =======================================
// const app = express();

// // Middleware: Configure CORS with the list of allowed origins
// app.use(
//     cors({
//         // Set the origin to the robust list
//         origin: allowedOrigins,
//         credentials: true,
//         optionsSuccessStatus: 200, 
//     })
// );

// app.use(express.json());

// // =======================================
// // ROUTES
// // =======================================
// app.use("/api/users", userRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/public/order", publicOrderRoutes);

// // =======================================
// // SOCKET.IO SERVER
// // =======================================
// const httpServer = createServer(app);

// const io = new Server(httpServer, {
//     cors: {
//         // Use the same robust list for Socket.IO
//         origin: allowedOrigins,
//         methods: ["GET", "POST"],
//         credentials: true,
//     },
// });

// // ⚡️ Expose io to controllers
// app.set("io", io);

// initializeSocketListeners(io); 


// // =======================================
// // START SERVER + MONGO
// // =======================================

// const startServer = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_URI);
//         console.log("✅ MongoDB Connected Successfully");

//         const PORT = process.env.PORT || 5000;
//         httpServer.listen(PORT, () =>
//             console.log(`🚀 Server + Socket.IO running on port ${PORT}`)
//         );
//     } catch (error) {
//         console.error("❌ MongoDB Error:", error.message);
//         process.exit(1);
//     }
// };

// startServer();

