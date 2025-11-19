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

router.post("/",  authMiddleware(["admin"]), createUser);
router.get("/", authMiddleware(["admin"]), getUsers);
router.get("/:id",authMiddleware(["admin"]), getUser);
router.put("/:id", authMiddleware(["admin"]), updateUser);
router.delete("/:id", authMiddleware(["admin"]), deleteUser);

export default router;
