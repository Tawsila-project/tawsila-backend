// src/controllers/userController.js

import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


// ===========================
// ADMIN / STAFF REGISTER
// ===========================
export const register = async (req, res) => {
  try {
    const { full_name, username, phone, address, password, role } = req.body;

    // Validate fields
    if (!full_name || !username || !phone || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Only allow admin or staff
    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Prevent creating admin from frontend
    if (role === "admin") {
      return res.status(403).json({ error: "Admins can only be created manually or by another admin" });
    }

    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const salt = Number(process.env.SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      full_name,
      username,
      phone,
      address,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        full_name: user.full_name,
        username: user.username,
        phone: user.phone,
        address: user.address,
        role: user.role,
        availability: user.availability,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ===========================
// LOGIN
// ===========================
export const login = async (req, res) => {
 try {
 const { username, password } = req.body;

 const user = await User.findOne({ username });
 if (!user) return res.status(400).json({ error: "Invalid username or password" });

 const isMatch = await bcrypt.compare(password, user.password);
 if (!isMatch) return res.status(400).json({ error: "Invalid username or password" });

 const token = jwt.sign(
 { id: user._id, role: user.role },
 process.env.JWT_SECRET,
 { expiresIn: "1d" }
 );
 res.json({
 message: "Login successful",
 token,
 user: {
 _id: user._id, // 💡 تمت إضافتها هنا - هذه هي الهوية التي سنستخدمها كـ driverId**
 username: user.username,
 full_name: user.full_name,
 role: user.role,
 }
 });

 } catch (err) {
 res.status(500).json({ error: err.message });
 }
};



// ===========================
// CRUD OPERATIONS
// ===========================
export const createUser = async (req, res) => {
  try {
    const { role, password, ...rest } = req.body;

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Only admin can create new users
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create users" });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const user = await User.create({
      ...rest,
      role,
      password: hashedPassword
    });

    res.status(201).json({
      _id: user._id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Get All Users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Get Single User
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Update User
export const updateUser = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Hash new password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Prevent changing role to admin unless requester is admin
    if (updateData.role === "admin" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can assign admin role" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select("-password");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Delete User
export const deleteUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent deleting admins
    if (targetUser.role === "admin") {
      return res.status(403).json({ error: "Admins cannot delete other admins" });
    }

    // Only admins can delete users
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete users" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
