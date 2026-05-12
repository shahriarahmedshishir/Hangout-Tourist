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
    const { date } = req.query; // Optional: ?date=YYYY-MM-DD for specific date availability

    const cars = await db
      .collection("cars")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const checkDate = date ? new Date(date) : null;

    const enriched = await Promise.all(
      cars.map(async (car) => {
        let available;
        const quantity = car.quantity || 1; // Default to 1

        if (checkDate) {
          // Date-specific availability: count bookings that overlap this date
          checkDate.setHours(0, 0, 0, 0);
          const nextDay = new Date(checkDate);
          nextDay.setDate(nextDay.getDate() + 1);

          const activeBookings = await db
            .collection("bookings")
            .countDocuments({
              carId: car._id.toString(),
              type: "car",
              status: { $in: ["confirmed", "pending"] },
              pickupDate: { $lt: nextDay },
              returnDate: { $gt: checkDate },
            });
          available = Math.max(0, quantity - activeBookings);
        } else {
          // Overall availability: count any future bookings
          const now = new Date();
          const activeBookings = await db
            .collection("bookings")
            .countDocuments({
              carId: car._id.toString(),
              type: "car",
              status: { $in: ["confirmed", "pending"] },
              returnDate: { $gte: now },
            });
          available = Math.max(0, quantity - activeBookings);
        }

        return {
          ...car,
          quantity,
          available,
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
    const { date } = req.query; // Optional: ?date=YYYY-MM-DD for specific date availability

    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const quantity = car.quantity || 1; // Default to 1
    let available;

    if (date) {
      // Date-specific availability
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const activeBookings = await db.collection("bookings").countDocuments({
        carId: req.params.id,
        type: "car",
        status: { $in: ["confirmed", "pending"] },
        pickupDate: { $lt: nextDay },
        returnDate: { $gt: checkDate },
      });
      available = Math.max(0, quantity - activeBookings);
    } else {
      // Overall availability
      const now = new Date();
      const activeBookings = await db.collection("bookings").countDocuments({
        carId: req.params.id,
        type: "car",
        status: { $in: ["confirmed", "pending"] },
        returnDate: { $gte: now },
      });
      available = Math.max(0, quantity - activeBookings);
    }

    res.json({
      ...car,
      quantity,
      available,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
