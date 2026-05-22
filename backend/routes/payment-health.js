const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { auth } = require("../middleware/auth");

// Admin-only: basic payment health checks
router.get("/", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });
    const db = await getDb();
    const now = new Date();
    const olderThanMinutes = parseInt(req.query.minutes || "10", 10);
    const cutoff = new Date(now.getTime() - olderThanMinutes * 60 * 1000);

    const pendingCount = await db
      .collection("payment_sessions")
      .countDocuments({ createdAt: { $lt: cutoff }, processed: { $ne: true } });
    const recentAttempts = await db
      .collection("payment_sessions")
      .countDocuments({
        createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
      });

    res.json({
      pendingOlderThanMinutes: olderThanMinutes,
      pendingCount,
      recentAttempts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
