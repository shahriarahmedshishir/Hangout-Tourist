const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth, role } = require("../middleware/auth");

// GET /api/staff/rooms — hotel staff sees their hotel's booked rooms (no price)
router.get("/rooms", auth, role("hotel_staff"), async (req, res) => {
  try {
    if (!req.user.hotelId && !req.body.hotelId) {
      // Fetch from user record
      const db = await getDb();
      const staffUser = await db
        .collection("users")
        .findOne(
          { _id: new ObjectId(req.user.id) },
          { projection: { hotelId: 1 } },
        );
      req.user.hotelId = staffUser?.hotelId;
    }

    const hotelId = req.user.hotelId;
    if (!hotelId)
      return res
        .status(400)
        .json({ message: "No hotel associated with this account" });

    const db = await getDb();

    const rooms = await db
      .collection("rooms")
      .find({ hotelId, isActive: { $ne: false } })
      .project({ price: 0, hotelId: 0 }) // Staff cannot see price
      .sort({ roomNumber: 1 })
      .toArray();

    const bookings = await db
      .collection("bookings")
      .find({
        hotelId,
        status: { $in: ["confirmed", "pending"] },
        checkOut: { $gt: new Date() }, // Only return bookings where checkout date is in the future
      })
      .project({
        userId: 1,
        roomId: 1,
        roomNumber: 1,
        checkIn: 1,
        checkOut: 1,
        checkout: 1,
        checkoutDate: 1,
        days: 1,
        status: 1,
        guestDetails: 1,
      })
      .sort({ checkIn: -1 })
      .toArray();

    res.json({ rooms, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/staff/hotel — get own hotel info
router.get("/hotel", auth, role("hotel_staff"), async (req, res) => {
  try {
    const db = await getDb();
    const staffUser = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { hotelId: 1, hotelName: 1 } },
      );
    if (!staffUser?.hotelId)
      return res.status(404).json({ message: "No hotel found" });

    const hotel = await db
      .collection("hotels")
      .findOne(
        { _id: new ObjectId(staffUser.hotelId) },
        { projection: { name: 1, area: 1, image: 1 } },
      );

    res.json(hotel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
