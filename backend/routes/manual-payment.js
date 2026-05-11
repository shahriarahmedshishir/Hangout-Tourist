const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// POST /api/manual-payment/initiate/hotel — Initiate hotel booking with pending status
router.post("/initiate/hotel", auth, async (req, res) => {
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book hotels" });
    }

    const {
      rooms: roomIds,
      hotelId,
      checkIn,
      checkOut,
      contactNumber,
    } = req.body;

    const idsToBook = Array.isArray(roomIds) && roomIds.length ? roomIds : [];

    if (!idsToBook.length || !hotelId || !checkIn || !checkOut) {
      return res.status(400).json({
        message: "rooms, hotelId, checkIn, checkOut are required",
      });
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
      return res.status(400).json({ message: "Invalid dates" });
    }

    const db = await getDb();
    const hotel = await db
      .collection("hotels")
      .findOne({ _id: new ObjectId(hotelId) });

    const days = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );

    let totalAmount = 0;
    const bookingRooms = [];

    for (const rId of idsToBook) {
      const room = await db
        .collection("rooms")
        .findOne({ _id: new ObjectId(rId) });
      if (!room) return res.status(404).json({ message: "Room not found" });

      const conflict = await db.collection("bookings").findOne({
        roomId: rId,
        status: "confirmed",
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      });
      if (conflict) {
        return res.status(409).json({
          message: `Room ${room.roomNumber} is already booked`,
        });
      }

      totalAmount += room.price * days;
      bookingRooms.push({
        roomId: room._id.toString(),
        roomNumber: room.roomNumber,
        pricePerNight: room.price,
        roomTotal: room.price * days,
      });
    }

    // Create pending booking for manual payment
    const bookings = bookingRooms.map((r) => ({
      userId: req.user.id,
      type: "hotel",
      hotelId: hotel._id.toString(),
      hotelName: hotel?.name || "",
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      days,
      pricePerNight: r.pricePerNight,
      totalAmount: r.roomTotal,
      contactNumber: contactNumber || "",
      status: "pending", // Pending manual payment verification
      paymentMethod: "manual",
      createdAt: new Date(),
    }));

    const result = await db.collection("bookings").insertMany(bookings);

    res.json({
      message: "Booking initiated for manual payment",
      bookingId: result.insertedIds[0], // Return first booking ID
      bookingIds: Object.values(result.insertedIds),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/manual-payment/initiate/car — Initiate car booking with pending status
router.post("/initiate/car", auth, async (req, res) => {
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
      return res.status(400).json({
        message: "carId, pickupDate, returnDate are required",
      });
    }

    if (!isValidObjectId(carId)) {
      return res.status(400).json({ message: "Invalid car id" });
    }

    const pickupDateObj = new Date(pickupDate);
    const returnDateObj = new Date(returnDate);
    if (
      isNaN(pickupDateObj) ||
      isNaN(returnDateObj) ||
      returnDateObj <= pickupDateObj
    ) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    const db = await getDb();
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const now = new Date();
    const activeBookings = await db
      .collection("carrentBookings")
      .countDocuments({
        carId,
        type: "car",
        status: "confirmed",
        returnDate: { $gte: now },
      });

    if (car.quantity > 0 && activeBookings >= car.quantity) {
      return res
        .status(409)
        .json({ message: "No cars of this model are currently available" });
    }

    const days = Math.ceil(
      (returnDateObj - pickupDateObj) / (1000 * 60 * 60 * 24),
    );
    const totalAmount = car.price * days;

    // Create pending booking for manual payment
    const booking = {
      userId: req.user.id,
      type: "car",
      carId: car._id.toString(),
      carName: car.name,
      pickupDate: pickupDateObj,
      returnDate: returnDateObj,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      days,
      pricePerDay: car.price,
      totalAmount,
      status: "pending", // Pending manual payment verification
      paymentMethod: "manual",
      createdAt: now,
    };

    const result = await db.collection("bookings").insertOne(booking);

    res.json({
      message: "Booking initiated for manual payment",
      bookingId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/manual-payment/submit — User submits manual payment proof
router.post("/submit", auth, async (req, res) => {
  try {
    const { bookingId, paymentMethod, transactionId, screenshot } = req.body;

    if (!bookingId || !paymentMethod || !transactionId || !screenshot) {
      return res.status(400).json({
        message:
          "bookingId, paymentMethod, transactionId, and screenshot are required",
      });
    }

    if (!["bkash", "nagad"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "paymentMethod must be 'bkash' or 'nagad'",
      });
    }

    const db = await getDb();

    // Verify booking exists and belongs to user
    const bookingCollection = db.collection("carrentBookings");
    const booking = await bookingCollection.findOne({
      _id: new ObjectId(bookingId),
      userId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending" && booking.status !== "payment_failed") {
      return res.status(409).json({
        message: "Booking is not in valid state for manual payment",
      });
    }

    // Create manual payment submission
    const manualPayment = {
      bookingId: booking._id.toString(),
      userId: req.user.id,
      bookingType: booking.type, // hotel or car
      hotelId: booking.hotelId || null,
      carId: booking.carId || null,
      totalAmount: booking.totalAmount,
      paymentMethod,
      transactionId,
      screenshot, // base64 or image URL
      status: "pending", // pending, approved, rejected
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    await db.collection("manual_payments").insertOne(manualPayment);

    // Update booking status to show pending manual payment
    await bookingCollection.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "pending_payment",
          paymentMethod: "manual",
          manualPaymentSubmittedAt: new Date(),
        },
      },
    );

    res.json({
      message: "Manual payment submitted successfully",
      manualPaymentId: manualPayment._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/manual-payment/my-submissions — Get user's manual payment submissions
router.get("/my-submissions", auth, async (req, res) => {
  try {
    const db = await getDb();
    const submissions = await db
      .collection("manual_payments")
      .find({ userId: req.user.id })
      .sort({ submittedAt: -1 })
      .toArray();

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/manual-payment/:id/resubmit — User resubmits after rejection
router.post("/:id/resubmit", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId, screenshot } = req.body;

    if (!paymentMethod || !transactionId || !screenshot) {
      return res.status(400).json({
        message: "paymentMethod, transactionId, and screenshot are required",
      });
    }

    const db = await getDb();
    const oldSubmission = await db.collection("manual_payments").findOne({
      _id: new ObjectId(id),
      userId: req.user.id,
      status: "rejected",
    });

    if (!oldSubmission) {
      return res.status(404).json({
        message: "Rejected payment submission not found",
      });
    }

    // Create new submission (use old booking)
    const newSubmission = {
      bookingId: oldSubmission.bookingId,
      userId: req.user.id,
      bookingType: oldSubmission.bookingType,
      hotelId: oldSubmission.hotelId,
      carId: oldSubmission.carId,
      totalAmount: oldSubmission.totalAmount,
      paymentMethod,
      transactionId,
      screenshot,
      status: "pending",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    const result = await db
      .collection("manual_payments")
      .insertOne(newSubmission);

    res.json({
      message: "Resubmission successful",
      manualPaymentId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
