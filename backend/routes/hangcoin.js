const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/hangcoin/balance — Get user's coin balance
router.get("/balance", auth, async (req, res) => {
  try {
    const db = await getDb();
    const balance = await db.collection("coin_ledger").findOne({
      userId: req.user.id,
    });

    res.json({
      balance: balance?.coins || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/hangcoin/topup/submit — User submits coin top-up request
router.post("/topup/submit", auth, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, screenshot, provider } =
      req.body;

    if (!amount || !paymentMethod || !transactionId || !screenshot) {
      return res.status(400).json({
        message:
          "amount, paymentMethod, transactionId, and screenshot are required",
      });
    }

    if (!["ssl_commerz", "manual"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "paymentMethod must be 'ssl_commerz' or 'manual'",
      });
    }

    if (paymentMethod === "manual" && !["bkash", "nagad"].includes(provider)) {
      return res.status(400).json({
        message: "provider must be 'bkash' or 'nagad' for manual payments",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const db = await getDb();

    // Create top-up request
    const topupRequest = {
      userId: req.user.id,
      amount, // coins to add (1 coin = 1 BDT)
      paymentMethod,
      status: "pending", // pending, approved, rejected
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    // For manual payment, include transaction details
    if (paymentMethod === "manual") {
      topupRequest.transactionId = transactionId;
      topupRequest.screenshot = screenshot;
      topupRequest.provider = provider; // "bkash" or "nagad"
    } else if (paymentMethod === "ssl_commerz") {
      // For SSL Commerz, we'll initiate payment separately
      topupRequest.transactionId = transactionId;
    }

    const result = await db
      .collection("coin_topup_requests")
      .insertOne(topupRequest);

    res.json({
      message: "Top-up request submitted successfully",
      requestId: result.insertedId,
    });
  } catch (err) {
    console.error("Topup submit error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/hangcoin/topup/my-requests — Get user's top-up requests
router.get("/topup/my-requests", auth, async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db
      .collection("coin_topup_requests")
      .find({ userId: req.user.id })
      .sort({ submittedAt: -1 })
      .toArray();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/hangcoin/initiate-booking/hotel — Initiate hotel booking with hangcoin pending status
router.post("/initiate-booking/hotel", auth, async (req, res) => {
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

    // Create pending booking for hangcoin payment
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
      status: "pending", // Pending hangcoin payment
      paymentMethod: "hangcoin",
      createdAt: new Date(),
    }));

    const result = await db.collection("bookings").insertMany(bookings);

    res.json({
      message: "Booking initiated for hangcoin payment",
      bookingId: result.insertedIds[0], // Return first booking ID
      bookingIds: Object.values(result.insertedIds),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/hangcoin/initiate-booking/car — Initiate car booking with hangcoin pending status
router.post("/initiate-booking/car", auth, async (req, res) => {
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

    // Create pending booking for hangcoin payment
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
      status: "pending", // Pending hangcoin payment
      paymentMethod: "hangcoin",
      createdAt: now,
    };

    const result = await db.collection("bookings").insertOne(booking);

    res.json({
      message: "Booking initiated for hangcoin payment",
      bookingId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/hangcoin/pay-booking/:bookingId — Pay booking with coins
router.post("/pay-booking/:bookingId", auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = await getDb();

    // Get booking
    const bookingCollections = ["bookings", "carrentBookings"];
    let booking = null;
    let bookingCollection = null;

    for (const collectionName of bookingCollections) {
      const candidate = await db.collection(collectionName).findOne({
        _id: new ObjectId(bookingId),
        userId: req.user.id,
      });
      if (candidate) {
        booking = candidate;
        bookingCollection = db.collection(collectionName);
        break;
      }
    }

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["pending", "payment_failed"].includes(booking.status)) {
      return res.status(409).json({
        message: "Booking is not in valid state for payment",
      });
    }

    // Get user's coin balance
    const ledger = await db
      .collection("coin_ledger")
      .findOne({ userId: req.user.id });
    const coinBalance = ledger?.coins || 0;

    // Check if user has enough coins (1 coin = 1 BDT)
    const coinsRequired = booking.totalAmount;
    if (coinBalance < coinsRequired) {
      return res.status(402).json({
        message: "Not enough coins. Please top up.",
        coinsRequired,
        coinBalance,
        coinsNeeded: coinsRequired - coinBalance,
      });
    }

    // Deduct coins from user's balance
    await db.collection("coin_ledger").updateOne(
      { userId: req.user.id },
      {
        $inc: { coins: -coinsRequired },
        $push: {
          transactions: {
            type: "payment",
            bookingId: booking._id.toString(),
            amount: -coinsRequired,
            timestamp: new Date(),
            description: `Payment for ${
              booking.type === "hotel" ? booking.hotelName : booking.carName
            } booking`,
          },
        },
      },
    );

    // Update booking to confirmed
    const now = new Date();
    await bookingCollection.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "confirmed",
          paymentMethod: "hangcoin",
          paidAt: now,
          transactionId: `HC-${Date.now()}`,
        },
      },
    );

    res.json({
      message: "Booking confirmed with hangcoins",
      booking: {
        _id: booking._id,
        status: "confirmed",
        coinsUsed: coinsRequired,
        remainingCoins: coinBalance - coinsRequired,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
