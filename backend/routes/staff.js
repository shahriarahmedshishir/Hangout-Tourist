const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth, role } = require("../middleware/auth");
const { notifyBookingConfirmed } = require("../utils/emailService");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function getStaffHotelId(req) {
  if (req.user.hotelId) return req.user.hotelId;
  const db = await getDb();
  const staffUser = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { hotelId: 1 } },
    );
  return staffUser?.hotelId || null;
}

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

// POST /api/staff/bookings/hotel — hotel staff books a room for their own hotel
router.post("/bookings/hotel", auth, role("hotel_staff"), async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, contactNumber, guestDetails } = req.body;

    if (!roomId || !checkIn || !checkOut) {
      return res
        .status(400)
        .json({ message: "roomId, checkIn, and checkOut are required" });
    }
    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ message: "Invalid roomId" });
    }

    const hotelId = await getStaffHotelId(req);
    if (!hotelId) {
      return res
        .status(400)
        .json({ message: "No hotel associated with this staff account" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (
      isNaN(checkInDate) ||
      isNaN(checkOutDate) ||
      checkOutDate <= checkInDate
    ) {
      return res.status(400).json({
        message: "Invalid dates. Check-out must be after check-in.",
      });
    }

    const db = await getDb();
    const room = await db.collection("rooms").findOne({
      _id: new ObjectId(roomId),
      hotelId,
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (room.isActive === false || room.isAvailable === false) {
      return res
        .status(400)
        .json({ message: `Room ${room.roomNumber} is not available` });
    }

    const adminBlock = (room.blockedDates || []).find(
      (b) =>
        new Date(b.checkIn) < checkOutDate &&
        new Date(b.checkOut) > checkInDate,
    );
    if (adminBlock) {
      return res.status(409).json({
        message: `Room ${room.roomNumber} is reserved for those dates`,
      });
    }

    const conflict = await db.collection("bookings").findOne({
      roomId,
      status: { $in: ["confirmed", "pending"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });
    if (conflict) {
      return res.status(409).json({
        message: `Room ${room.roomNumber} is already booked for the selected dates`,
      });
    }

    const days = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );
    const hotel = await db
      .collection("hotels")
      .findOne({ _id: new ObjectId(hotelId) });

    const booking = {
      userId: req.user.id,
      type: "hotel",
      hotelId,
      hotelName: hotel?.name || "",
      roomId,
      roomNumber: room.roomNumber,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      days,
      pricePerNight: room.price,
      totalAmount: room.price * days,
      contactNumber: contactNumber || "",
      guestDetails: guestDetails || {},
      status: "confirmed",
      refundStatus: null,
      paymentMethod: "offline",
      source: "staff",
      staffId: req.user.id,
      staffName: req.user.name || "",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    await notifyBookingConfirmed(db, { ...booking, _id: result.insertedId });

    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`hotel-${hotelId}`).emit("room-booked", {
          roomId: booking.roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
        });
        io.to(`user-${req.user.id}`).emit("booking-confirmed", {
          count: 1,
        });
      }
    } catch (emitError) {
      console.error(
        "Socket emit failed after booking insertion:",
        emitError.message,
      );
    }

    res.status(201).json({ booking: { ...booking, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
