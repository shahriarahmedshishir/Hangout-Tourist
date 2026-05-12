const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/buses — all active buses with available count
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const buses = await db
      .collection("buses")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const now = new Date();
    const enriched = await Promise.all(
      buses.map(async (bus) => {
        const bookedSeats = await db
          .collection("busBookings")
          .aggregate([
            {
              $match: {
                busId: bus._id.toString(),
                status: { $in: ["confirmed", "pending"] },
                travelDate: { $gte: now },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $toInt: "$seats" } },
              },
            },
          ])
          .toArray();
        const totalBooked = bookedSeats[0]?.total || 0;
        const { totalSeats, ...busWithoutTotal } = bus;
        return {
          ...busWithoutTotal,
          bookedSeats: totalBooked,
          availableSeats: Math.max(0, (bus.totalSeats || 0) - totalBooked),
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/buses/:id — single bus with availability
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const bus = await db
      .collection("buses")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!bus) return res.status(404).json({ message: "Bus not found" });

    const now = new Date();
    const bookedSeats = await db
      .collection("busBookings")
      .aggregate([
        {
          $match: {
            busId: req.params.id,
            status: { $in: ["confirmed", "pending"] },
            travelDate: { $gte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $toInt: "$seats" } },
          },
        },
      ])
      .toArray();
    const totalBooked = bookedSeats[0]?.total || 0;
    const { totalSeats, ...busWithoutTotal } = bus;

    res.json({
      ...busWithoutTotal,
      bookedSeats: totalBooked,
      availableSeats: Math.max(0, (bus.totalSeats || 0) - totalBooked),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
