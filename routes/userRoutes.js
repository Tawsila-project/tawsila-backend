// src/routes/userRoutes.js
import { Router } from "express";
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  register,
  login
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Public routes
router.post("/register",authMiddleware(["staff"]), register);
router.post("/login", authMiddleware(["staff", "admin"]), login);

// Protected routes (example: admin only)
router.use(authMiddleware(["admin"]));

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
