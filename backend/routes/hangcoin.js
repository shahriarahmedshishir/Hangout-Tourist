const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");
const { getPriceForDates } = require("../utils/pricing");
const { notifyBookingConfirmed } = require("../utils/emailService");

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
      guestDetails,
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

      const datePricing = getPriceForDates(room, checkIn, checkOut);
      const effectiveRoomPrice = datePricing.price;
      totalAmount += datePricing.totalPrice;
      bookingRooms.push({
        roomId: room._id.toString(),
        roomNumber: room.roomNumber,
        pricePerNight: effectiveRoomPrice,
        nightlyPrices: datePricing.nightlyPrices,
        roomTotal: datePricing.totalPrice,
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
      nightlyPrices: r.nightlyPrices,
      totalAmount: r.roomTotal,
      contactNumber: contactNumber || "",
      guestDetails: guestDetails || {},
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

    const {
      carId,
      pickupDate,
      returnDate,
      pickupLocation,
      contactNumber,
      nidNumber,
    } = req.body;

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
    const effectiveCarPrice = Number(car.effectivePrice ?? car.price ?? 0);
    const totalAmount = effectiveCarPrice * days;

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
      nidNumber: nidNumber || "",
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

// POST /api/hangcoin/initiate-booking/package — Initiate holiday package booking with pending hangcoin payment
router.post("/initiate-booking/package", auth, async (req, res) => {
  try {
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book packages" });
    }

    const { packageId, travelDate, peopleCount, guestDetails } = req.body;

    if (!packageId || !travelDate || !peopleCount) {
      return res.status(400).json({
        message: "packageId, travelDate, and peopleCount are required",
      });
    }

    if (!isValidObjectId(packageId)) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const travelDateObj = new Date(travelDate);
    if (isNaN(travelDateObj)) {
      return res.status(400).json({ message: "Invalid travel date" });
    }

    const db = await getDb();
    const pkg = await db
      .collection("packages")
      .findOne({ _id: new ObjectId(packageId) });
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    const count = Number(peopleCount);
    const minPerson = Number(pkg.minimumPerson || 1);
    if (count < minPerson) {
      return res.status(400).json({
        message: `At least ${minPerson} people are required for this package`,
      });
    }

    const userDoc = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });

    const guestEmail =
      userDoc?.email || req.user.email || guestDetails?.email || "";
    const finalGuestDetails = { ...(guestDetails || {}), email: guestEmail };
    const effectivePricePerPerson = Number(
      pkg.effectivePrice ?? pkg.pricePerPerson ?? 0,
    );
    const totalAmount = effectivePricePerPerson * count;

    const booking = {
      userId: req.user.id,
      type: "holiday",
      packageId: pkg._id.toString(),
      packageName: pkg.name,
      travelDate: travelDateObj,
      peopleCount: count,
      pricePerPerson: effectivePricePerPerson,
      guestDetails: finalGuestDetails,
      nidNumber: finalGuestDetails?.nidNumber || "",
      totalAmount,
      status: "pending",
      paymentMethod: "hangcoin",
      createdAt: new Date(),
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
    const bookingCollections = ["bookings", "carrentBookings", "busBookings"];
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
              booking.type === "hotel"
                ? booking.hotelName
                : booking.type === "car"
                  ? booking.carName
                  : booking.type === "bus"
                    ? booking.busName
                    : booking.packageName || "package"
            } booking`,
          },
        },
      },
    );

    // Update booking to confirmed
    const now = new Date();
    const transactionId = `HC-${Date.now()}`;
    await bookingCollection.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "confirmed",
          paymentMethod: "hangcoin",
          paidAt: now,
          transactionId,
        },
      },
    );

    await notifyBookingConfirmed(db, {
      ...booking,
      status: "confirmed",
      paymentMethod: "hangcoin",
      paidAt: now,
      transactionId,
    });

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

// ─────────────────────────────────────────────────────────────────────────
// BUS HANGCOIN BOOKING
// ─────────────────────────────────────────────────────────────────────────

// POST /api/hangcoin/initiate-booking/bus — Create pending bus booking for hangcoin payment
router.post("/initiate-booking/bus", auth, async (req, res) => {
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book buses" });
    }

    const { busId, travelDate, seats, pickupLocation, contactNumber } =
      req.body;

    if (!busId || !travelDate || !seats) {
      return res.status(400).json({
        message: "busId, travelDate, and seats are required",
      });
    }

    if (!isValidObjectId(busId)) {
      return res.status(400).json({ message: "Invalid bus id" });
    }

    const travelDateObj = new Date(travelDate);
    if (isNaN(travelDateObj)) {
      return res.status(400).json({ message: "Invalid travel date" });
    }

    const seatsCount = parseInt(seats, 10);
    if (seatsCount <= 0) {
      return res.status(400).json({ message: "Seats must be at least 1" });
    }

    const db = await getDb();
    const bus = await db
      .collection("buses")
      .findOne({ _id: new ObjectId(busId) });
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    const now = new Date();
    const activeBookings = await db.collection("busBookings").countDocuments({
      busId,
      status: "confirmed",
      travelDate: {
        $gte: new Date(travelDateObj.getTime() - 24 * 60 * 60 * 1000),
        $lt: new Date(travelDateObj.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const availableSeats = bus.quantity - activeBookings;
    if (availableSeats < seatsCount) {
      return res.status(409).json({
        message: `Only ${availableSeats} seat(s) available for this bus on this date`,
      });
    }

    const totalAmount = bus.price * seatsCount;

    // Create pending booking for hangcoin payment
    const booking = {
      userId: req.user.id,
      type: "bus",
      busId: bus._id.toString(),
      busName: bus.name,
      travelDate: travelDateObj,
      seats: seatsCount,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      pricePerSeat: bus.price,
      totalAmount,
      status: "pending", // Pending hangcoin payment
      paymentMethod: "hangcoin",
      createdAt: now,
    };

    const result = await db.collection("busBookings").insertOne(booking);

    res.json({
      message: "Bus booking initiated for hangcoin payment",
      bookingId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/hangcoin/initiate-booking/carrent — Cox's Bazar booking with hangcoin
router.post("/initiate-booking/carrent", auth, async (req, res) => {
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book services" });
    }

    const {
      serviceId,
      pickupDate,
      returnDate,
      seatsBooked,
      pickupLocation,
      contactNumber,
    } = req.body;

    if (!serviceId || !pickupDate || !returnDate || !seatsBooked) {
      return res.status(400).json({
        message:
          "serviceId, pickupDate, returnDate, and seatsBooked are required",
      });
    }

    if (!isValidObjectId(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
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

    const seatsCount = parseInt(seatsBooked, 10);
    if (seatsCount <= 0) {
      return res.status(400).json({ message: "Seats must be at least 1" });
    }

    const db = await getDb();
    const service = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(serviceId) });
    if (!service) return res.status(404).json({ message: "Service not found" });

    const now = new Date();
    const bookedSeatsData = await db
      .collection("carrentBookings")
      .aggregate([
        {
          $match: {
            serviceId: serviceId.toString(),
            status: "confirmed",
            returnDate: { $gte: now },
            $or: [
              {
                pickupDate: { $lt: returnDateObj },
                returnDate: { $gt: pickupDateObj },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $toInt: "$seatsBooked" } },
          },
        },
      ])
      .toArray();

    const bookedSeats = bookedSeatsData[0]?.total || 0;
    const availableSeats =
      (service.quantity || service.totalSeats || 0) - bookedSeats;
    if (availableSeats < seatsCount) {
      return res.status(409).json({
        message: `Only ${availableSeats} car(s) available for this service during selected dates`,
      });
    }

    const servicePrice =
      Number(service.effectivePrice ?? service.price ?? 0) || 0;
    const totalAmount = servicePrice * seatsCount;

    // Create pending booking for hangcoin payment
    const booking = {
      userId: req.user.id,
      type: "carrent",
      serviceId: service._id.toString(),
      serviceName: service.name,
      carName: service.name, // For frontend display
      carType: service.type || "Standard", // For frontend display
      pickupDate: pickupDateObj,
      returnDate: returnDateObj,
      days: Math.ceil((returnDateObj - pickupDateObj) / (1000 * 60 * 60 * 24)), // Calculate days
      seatsBooked: seatsCount,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      pricePerSeat: servicePrice,
      totalAmount,
      status: "pending", // Pending hangcoin payment
      paymentMethod: "hangcoin",
      createdAt: now,
    };

    const result = await db.collection("carrentBookings").insertOne(booking);

    res.json({
      message: "Service booking initiated for hangcoin payment",
      bookingId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
