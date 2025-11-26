// src/routes/orderRoutes.js
import { Router } from "express";
import {
  // createOrder,
  getOrders,
  getOrder,
  getPlacesStats,
  getOrdersByRange,
  updateOrder,
  deleteOrder,
  // updateLocation,
  getAvailableOrders,
  acceptOrder,
  updateDriverLocation,
  calculateRouteInfo
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Staff & admin only
// router.use(authMiddleware(["staff", "admin"]));

// router.post("/", createOrder);
router.get('/orders/available', getAvailableOrders);
router.get("/", getOrders);
router.get("/places", authMiddleware(["admin"]), getPlacesStats);
router.get("/logs-status", authMiddleware(["admin"]), getOrdersByRange);
router.post('/route-info', calculateRouteInfo);
router.post("/accept", authMiddleware(["staff", "admin"]), acceptOrder);
router.post('/location/update', updateDriverLocation);
router.get("/:id", getOrder);
router.put("/:id", authMiddleware(["staff", "admin"]), updateOrder);
// router.post("/update-location", updateLocation); 
router.delete("/:id", authMiddleware(["admin"]), deleteOrder);


export default router;
