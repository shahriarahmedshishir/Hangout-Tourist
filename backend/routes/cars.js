const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/cars — all active cars with available count
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const cars = await db
      .collection("cars")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const now = new Date();
    const enriched = await Promise.all(
      cars.map(async (car) => {
        const activeBookings = await db.collection("bookings").countDocuments({
          carId: car._id.toString(),
          type: "car",
          status: { $in: ["confirmed", "pending"] },
          returnDate: { $gte: now },
        });
        return {
          ...car,
          available: Math.max(0, (car.quantity || 0) - activeBookings),
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cars/:id — single car with availability
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const now = new Date();
    const activeBookings = await db.collection("bookings").countDocuments({
      carId: req.params.id,
      type: "car",
      status: { $in: ["confirmed", "pending"] },
      returnDate: { $gte: now },
    });

    res.json({
      ...car,
      available: Math.max(0, (car.quantity || 0) - activeBookings),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
