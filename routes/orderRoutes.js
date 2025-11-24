// src/routes/orderRoutes.js
import { Router } from "express";
import {
  // createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  // updateLocation,
  acceptOrder
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Staff & admin only
router.use(authMiddleware(["staff", "admin"]));

// router.post("/", createOrder);
router.get("/", getOrders);
router.post("/accept", acceptOrder);

router.get("/:id", getOrder);
router.put("/:id", updateOrder);
// router.post("/update-location", updateLocation); 
router.delete("/:id", authMiddleware(["admin"]), deleteOrder);


export default router;
