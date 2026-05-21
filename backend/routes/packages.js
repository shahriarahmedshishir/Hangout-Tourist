const express = require("express");
const router = express.Router();
const { getDb } = require("../db");

// GET /api/packages — public endpoint to fetch all packages
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const packages = await db
      .collection("packages")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ packages });
  } catch (err) {
    console.error("Failed to fetch packages:", err);
    res.status(500).json({ error: err.message || "Failed to fetch packages" });
  }
});

module.exports = router;
