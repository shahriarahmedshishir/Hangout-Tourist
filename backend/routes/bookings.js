const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// POST /api/bookings/hotel — book one or more rooms
router.post("/hotel", auth, async (req, res) => {
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book hotels" });
    }

    const {
      rooms: roomIds,
      roomId,
      hotelId,
      checkIn,
      checkOut,
      contactNumber,
    } = req.body;

    // Support legacy single roomId as well as new rooms array
    const idsToBook =
      Array.isArray(roomIds) && roomIds.length
        ? roomIds
        : roomId
          ? [roomId]
          : [];

    if (!idsToBook.length || !hotelId || !checkIn || !checkOut) {
      return res
        .status(400)
        .json({ message: "rooms, hotelId, checkIn, checkOut are required" });
    }
    if (
      !isValidObjectId(hotelId) ||
      idsToBook.some((id) => !isValidObjectId(id))
    ) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (
      isNaN(checkInDate) ||
      isNaN(checkOutDate) ||
      checkOutDate <= checkInDate
    ) {
      return res
        .status(400)
        .json({ message: "Invalid dates. Check-out must be after check-in." });
    }

    const db = await getDb();
    const hotel = await db
      .collection("hotels")
      .findOne({ _id: new ObjectId(hotelId) });

    const days = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );

    const createdBookings = [];

    for (const rId of idsToBook) {
      const room = await db
        .collection("rooms")
        .findOne({ _id: new ObjectId(rId) });
      if (!room) return res.status(404).json({ message: `Room not found` });
      if (room.isActive === false || room.isAvailable === false) {
        return res
          .status(400)
          .json({ message: `Room ${room.roomNumber} is not available` });
      }

      // Check admin-blocked dates
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

      // Check existing booking conflict
      const conflict = await db.collection("bookings").findOne({
        roomId: rId,
        status: { $in: ["confirmed", "pending"] },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      });
      if (conflict) {
        return res.status(409).json({
          message: `Room ${room.roomNumber} is already booked for the selected dates`,
        });
      }

      const totalAmount = room.price * days;
      const booking = {
        userId: req.user.id,
        type: "hotel",
        hotelId,
        hotelName: hotel?.name || "",
        roomId: rId,
        roomNumber: room.roomNumber,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        days,
        pricePerNight: room.price,
        totalAmount,
        contactNumber: contactNumber || "",
        status: "confirmed",
        refundStatus: null,
        transactionId: null,
        paymentMethod: null,
        createdAt: new Date(),
      };

      const result = await db.collection("bookings").insertOne(booking);
      createdBookings.push({ ...booking, _id: result.insertedId });
    }

    const io = req.app.get("io");
    for (const b of createdBookings) {
      io.to(`hotel-${hotelId}`).emit("room-booked", {
        roomId: b.roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
      });
    }
    io.to(`user-${req.user.id}`).emit("booking-confirmed", {
      count: createdBookings.length,
    });

    res.status(201).json({ bookings: createdBookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings/car — book a car
router.post("/car", auth, async (req, res) => {
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book cars" });
    }

    const { carId, pickupDate, returnDate, pickupLocation, contactNumber } =
      req.body;
    if (!carId || !pickupDate || !returnDate) {
      return res
        .status(400)
        .json({ message: "carId, pickupDate, returnDate are required" });
    }
    if (!isValidObjectId(carId))
      return res.status(400).json({ message: "Invalid car id" });

    const pickupDateObj = new Date(pickupDate);
    const returnDateObj = new Date(returnDate);
    if (
      isNaN(pickupDateObj) ||
      isNaN(returnDateObj) ||
      returnDateObj <= pickupDateObj
    ) {
      return res
        .status(400)
        .json({ message: "Invalid dates. Return must be after pickup." });
    }

    const db = await getDb();
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.isActive === false || car.isAvailable === false) {
      return res.status(400).json({ message: "Car is not available" });
    }

    // Count active bookings (not yet returned)
    const now = new Date();
    const activeBookings = await db.collection("bookings").countDocuments({
      carId,
      type: "car",
      status: { $in: ["confirmed", "pending"] },
      returnDate: { $gte: now },
    });

    if (activeBookings >= (car.quantity || 0)) {
      return res
        .status(409)
        .json({ message: "No cars of this model are currently available" });
    }

    const days = Math.ceil(
      (returnDateObj - pickupDateObj) / (1000 * 60 * 60 * 24),
    );
    const totalAmount = car.price * days;

    const booking = {
      userId: req.user.id,
      type: "car",
      carId,
      carName: car.name,
      pickupDate: pickupDateObj,
      returnDate: returnDateObj,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      days,
      pricePerDay: car.price,
      totalAmount,
      status: "confirmed",
      refundStatus: null,
      transactionId: null,
      paymentMethod: null,
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    const io = req.app.get("io");
    const remaining = Math.max(0, (car.quantity || 0) - activeBookings - 1);
    io.to("cars-room").emit("car-booked", { carId, available: remaining });
    io.to(`user-${req.user.id}`).emit("booking-confirmed", {
      bookingId: result.insertedId,
    });

    res.status(201).json({ ...booking, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/my — user's own bookings
router.get("/my", auth, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db
      .collection("bookings")
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
