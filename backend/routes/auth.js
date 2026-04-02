const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth, role } = require("../middleware/auth");

const SECRET = process.env.JWT_SECRET || "hangout_secret_dev_only";

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Register (user only)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const db = await getDb();
    const existing = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.collection("users").insertOne({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: "user",
      createdAt: new Date(),
    });

    const token = jwt.sign(
      { id: result.insertedId.toString(), role: "user", name },
      SECRET,
      { expiresIn: "7d" },
    );
    res.status(201).json({
      token,
      user: {
        id: result.insertedId,
        name,
        email: email.toLowerCase(),
        role: "user",
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId || null,
        hotelName: user.hotelName || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.user.id))
      return res.status(400).json({ message: "Invalid user id" });
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { password: 0 } },
      );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch wallet balance from coin_ledger
    const wallet = await db
      .collection("coin_ledger")
      .findOne({ userId: req.user.id });

    const userData = {
      ...user,
      walletBalance: wallet?.coins || 0,
    };
    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password
router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "All fields are required" });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    if (!isValidObjectId(req.user.id))
      return res.status(400).json({ message: "Invalid user id" });

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(401).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(req.user.id) },
        { $set: { password: hashed } },
      );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
