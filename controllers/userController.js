// src/controllers/userController.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


// ===========================
// REGISTER
// ===========================
export const register = async (req, res) => {
  try {
    const { full_name, username, phone, address, password, role } = req.body;

    // Validate required fields
    if (!full_name || !username || !phone || !password || !role) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      full_name,
      username,
      phone,
      address,
      password: hashedPassword, // hashed password saved
      role,
    });

    // Send response without password
    res.status(201).json({
      message: "User registered successfully",
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


export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Make sure to select password explicitly if needed
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    if (!user.password) {
      return res.status(500).json({ error: "User has no password set" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ===========================
// CRUD OPERATIONS
// ===========================

// Create User (admin use)
export const createUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    let hashedPassword = undefined;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await User.create({ ...rest, password: hashedPassword });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // hide password
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

    // If password is updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

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

    // req.user comes from JWT (decoded payload)
    const requestingUserRole = req.user.role;

    // Prevent deleting admin → admin
    if (targetUser.role === "admin") {
      return res.status(403).json({
        error: "Admins cannot delete other admins",
      });
    }

    // Only admin can delete users
    if (requestingUserRole !== "admin") {
      return res.status(403).json({
        error: "Only admins can delete users",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

