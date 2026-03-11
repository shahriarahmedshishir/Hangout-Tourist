const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/hotels — all active hotels with price range
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const hotels = await db
      .collection("hotels")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const enriched = await Promise.all(
      hotels.map(async (hotel) => {
        const rooms = await db
          .collection("rooms")
          .find({ hotelId: hotel._id.toString(), isActive: { $ne: false } })
          .project({ price: 1 })
          .toArray();
        const prices = rooms.map((r) => r.price).filter(Boolean);
        return {
          ...hotel,
          minPrice: prices.length ? Math.min(...prices) : 0,
          maxPrice: prices.length ? Math.max(...prices) : 0,
          roomCount: rooms.length,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/hotels/:id — single hotel with rooms
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const hotel = await db
      .collection("hotels")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });

    const rooms = await db
      .collection("rooms")
      .find({ hotelId: req.params.id, isActive: { $ne: false } })
      .toArray();

    res.json({ ...hotel, rooms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/hotels/:id/rooms?checkIn=&checkOut= — rooms with availability status
router.get("/:id/rooms", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const { checkIn, checkOut } = req.query;
    const db = await getDb();

    const rooms = await db
      .collection("rooms")
      .find({ hotelId: req.params.id, isActive: { $ne: false } })
      .toArray();

    if (!checkIn || !checkOut) return res.json(rooms);

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const roomsWithStatus = await Promise.all(
      rooms.map(async (room) => {
        const conflict = await db.collection("bookings").findOne({
          roomId: room._id.toString(),
          status: { $in: ["confirmed", "pending"] },
          checkIn: { $lt: checkOutDate },
          checkOut: { $gt: checkInDate },
        });

        // Check admin-blocked date ranges
        const adminBlock = (room.blockedDates || []).find(
          (b) =>
            new Date(b.checkIn) < checkOutDate &&
            new Date(b.checkOut) > checkInDate,
        );

        return {
          ...room,
          isBooked: !!conflict || !!adminBlock,
          isAdminBlocked: !!adminBlock,
          nextAvailable: conflict
            ? conflict.checkOut
            : adminBlock
              ? adminBlock.checkOut
              : null,
        };
      }),
    );

    res.json(roomsWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
