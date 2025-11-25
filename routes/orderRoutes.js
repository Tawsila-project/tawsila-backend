// src/routes/orderRoutes.js
import { Router } from "express";
import {
  // createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  // updateLocation,
  acceptOrder,
  // getPendingOrdersForDriver,
  // completeDelivery
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Staff & admin only
// router.use(authMiddleware(["staff", "admin"]));

// router.post("/", createOrder);
router.get("/", getOrders);
router.post("/accept", authMiddleware(["staff", "admin"]), acceptOrder);
// router.post("/complete", completeDelivery);

// router.get("/pending/:driverId" , getPendingOrdersForDriver);

router.get("/:id", getOrder);
router.put("/:id", authMiddleware(["staff", "admin"]), updateOrder);
// router.post("/update-location", updateLocation); 
router.delete("/:id", authMiddleware(["admin"]), deleteOrder);


export default router;
