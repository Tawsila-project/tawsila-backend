// src/routes/orderRoutes.js
import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  updateLocation
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Staff & admin only
router.use(authMiddleware(["staff", "admin"]));

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.post("/update-location", updateLocation); 


export default router;
