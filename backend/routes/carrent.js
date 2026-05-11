const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/carrent — all active cars with available count
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const cars = await db
      .collection("carrent")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const now = new Date();
    const enriched = await Promise.all(
      cars.map(async (car) => {
        const activeBookings = await db.collection("carrentBookings").countDocuments({
          carId: car._id.toString(),
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

// GET /api/carrent/:id — single car with availability
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const now = new Date();
    const activeBookings = await db.collection("carrentBookings").countDocuments({
      carId: req.params.id,
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

// POST /api/carrent/:id/book — book a car (user)
router.post("/:id/book", auth, async (req, res) => {
  try {
    const { pickupDate, returnDate, pickupLocation } = req.body;

    if (!pickupDate || !returnDate || !pickupLocation) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await getDb();
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!car) return res.status(404).json({ message: "Car not found" });

    // Calculate days
    const pickup = new Date(pickupDate);
    const returned = new Date(returnDate);
    const days = Math.ceil((returned - pickup) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    // Check availability
    const activeBookings = await db.collection("carrentBookings").countDocuments({
      carId: req.params.id,
      status: { $in: ["confirmed", "pending"] },
      $or: [
        { pickupDate: { $lt: returned }, returnDate: { $gt: pickup } },
      ],
    });

    if (activeBookings >= (car.quantity || 0)) {
      return res.status(400).json({ message: "Car not available for selected dates" });
    }

    const totalAmount = (car.price || 0) * days;

    const booking = {
      carId: req.params.id,
      carName: car.name,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      pickupDate: pickup,
      returnDate: returned,
      pickupLocation,
      days,
      totalAmount,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("carrentBookings").insertOne(booking);

    res.json({
      _id: result.insertedId,
      ...booking,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;