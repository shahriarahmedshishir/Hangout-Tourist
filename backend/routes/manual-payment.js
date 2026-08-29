const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");
const fs = require("fs");
const path = require("path");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Validate & store base64 image data URIs (returns path under /uploads)
async function saveScreenshot(dataUri, userId) {
  if (!dataUri || typeof dataUri !== "string") return null;
  // Accept data:image/png;base64,... or data:image/jpeg;base64,... or webp
  const match = dataUri.match(
    /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i,
  );
  if (!match) return null;
  const mime = match[1];
  const b64 = match[3];
  // Limit size to 2.5MB
  const byteLength = Buffer.byteLength(b64, "base64");
  if (byteLength > 2.5 * 1024 * 1024) return null;
  const ext = mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1];
  const filename = `manual_${userId}_${Date.now()}.${ext}`;
  const filepath = path.join(__dirname, "..", "uploads", filename);
  try {
    fs.writeFileSync(filepath, Buffer.from(b64, "base64"));
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Failed to save screenshot:", err.message);
    return null;
  }
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

      const effectiveRoomPrice = Number(room.effectivePrice ?? room.price ?? 0);
      totalAmount += effectiveRoomPrice * days;
      bookingRooms.push({
        roomId: room._id.toString(),
        roomNumber: room.roomNumber,
        pricePerNight: effectiveRoomPrice,
        roomTotal: effectiveRoomPrice * days,
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
      nidNumber: guestDetails?.nidNumber || "",
      guestDetails: guestDetails || {},
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

// POST /api/manual-payment/initiate/package — Initiate holiday package booking with pending status
router.post("/initiate/package", auth, async (req, res) => {
  try {
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book packages" });
    }

    const { packageId, travelDate, peopleCount, guestDetails, contactNumber } =
      req.body;

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
      contactNumber: contactNumber || "",
      nidNumber: finalGuestDetails?.nidNumber || "",
      totalAmount,
      status: "pending",
      paymentMethod: "manual",
      guestDetails: finalGuestDetails,
      createdAt: new Date(),
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

// POST /api/manual-payment/initiate/car — Initiate car booking with pending status
router.post("/initiate/car", auth, async (req, res) => {
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

    const carQuantity = car.quantity || car.totalSeats || 0;
    const now = new Date();
    const activeBookings = await db
      .collection("carrentBookings")
      .countDocuments({
        carId,
        type: "car",
        status: "confirmed",
        returnDate: { $gte: now },
      });

    if (carQuantity > 0 && activeBookings >= carQuantity) {
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
      nidNumber: nidNumber || "",
      days,
      pricePerDay: car.price,
      totalAmount,
      status: "pending", // Pending manual payment verification
      paymentMethod: "manual",
      createdAt: now,
    };

    const result = await db.collection("carrentBookings").insertOne(booking);

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

    // Validate and save screenshot (if data URI)
    const savedScreenshot = await saveScreenshot(screenshot, req.user.id);
    if (!savedScreenshot) {
      return res
        .status(400)
        .json({ message: "Invalid screenshot data or file too large" });
    }

    const db = await getDb();

    // Verify booking exists and belongs to user
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

    if (!booking || !bookingCollection) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      booking.status !== "pending" &&
      booking.status !== "payment_failed" &&
      booking.status !== "pending_payment"
    ) {
      return res.status(409).json({
        message: "Booking is not in valid state for manual payment",
      });
    }

    // Create manual payment submission
    const manualPayment = {
      bookingId: booking._id.toString(),
      userId: req.user.id,
      bookingType: booking.type,
      hotelId: booking.hotelId || null,
      carId: booking.carId || null,
      busId: booking.busId || null,
      packageId: booking.packageId || null,
      totalAmount: booking.totalAmount,
      paymentMethod,
      transactionId,
      screenshot: savedScreenshot,
      status: "pending",
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

    // Validate and save screenshot for resubmission
    const savedScreenshotRes = await saveScreenshot(screenshot, req.user.id);
    if (!savedScreenshotRes) {
      return res
        .status(400)
        .json({ message: "Invalid screenshot data or file too large" });
    }

    // Create new submission (use old booking)
    const newSubmission = {
      bookingId: oldSubmission.bookingId,
      userId: req.user.id,
      bookingType: oldSubmission.bookingType,
      hotelId: oldSubmission.hotelId,
      carId: oldSubmission.carId,
      busId: oldSubmission.busId,
      totalAmount: oldSubmission.totalAmount,
      paymentMethod,
      transactionId,
      screenshot: savedScreenshotRes,
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

// ─────────────────────────────────────────────────────────────────────────
// BUS MANUAL PAYMENT
// ─────────────────────────────────────────────────────────────────────────

// POST /api/manual-payment/initiate/bus — Initiate bus booking with pending status
router.post("/initiate/bus", auth, async (req, res) => {
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

    // Create pending booking for manual payment
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
      status: "pending", // Pending manual payment verification
      paymentMethod: "manual",
      createdAt: now,
    };

    const result = await db.collection("busBookings").insertOne(booking);

    res.json({
      message: "Bus booking initiated for manual payment",
      bookingId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/manual-payment/initiate/carrent — Cox's Bazar service manual payment
router.post("/initiate/carrent", auth, async (req, res) => {
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
      nidNumber,
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

    // Create pending booking for manual payment
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
      nidNumber: nidNumber || "",
      pricePerSeat: servicePrice,
      totalAmount,
      status: "pending", // Pending manual payment verification
      paymentMethod: "manual",
      createdAt: now,
    };

    const result = await db.collection("carrentBookings").insertOne(booking);

    res.json({
      message: "Service booking initiated for manual payment",
      bookingId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/manual-payment/request/bus — Submit bus ticket application for admin verification
router.post("/request/bus", auth, async (req, res) => {
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res.status(403).json({
        message: "Staff and admin accounts cannot apply for bus tickets",
      });
    }

    const {
      busId,
      travelDate,
      seats,
      pickupLocation,
      contactNumber,
      totalAmount,
    } = req.body;

    // Validation
    if (!busId || !travelDate || !seats || !pickupLocation || !contactNumber) {
      return res.status(400).json({
        message:
          "All fields are required (busId, travelDate, seats, pickupLocation, contactNumber)",
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

    // Create bus ticket request (pending admin verification)
    const ticketRequest = {
      userId: new ObjectId(req.user.id),
      userName: req.user.name || "Unknown",
      userEmail: req.user.email || "",
      busId: busId,
      busName: bus.name || "Unknown Bus",
      travelDate: travelDateObj,
      seats: seatsCount,
      pickupLocation,
      contactNumber,
      totalAmount: totalAmount || 0,
      status: "pending", // pending, approved, rejected
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("busTicketRequests")
      .insertOne(ticketRequest);

    res.json({
      ticketRequestId: result.insertedId,
      message: "Ticket application submitted for admin verification",
      status: "pending",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
