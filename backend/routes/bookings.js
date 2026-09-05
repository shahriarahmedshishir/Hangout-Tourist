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

async function findBookingRecord(db, bookingId) {
  const objectId = new ObjectId(bookingId);

  const primaryBooking = await db
    .collection("bookings")
    .findOne({ _id: objectId });
  if (primaryBooking) {
    return { booking: primaryBooking, collection: db.collection("bookings") };
  }

  const carRentBooking = await db
    .collection("carrentBookings")
    .findOne({ _id: objectId });
  if (carRentBooking) {
    return {
      booking: carRentBooking,
      collection: db.collection("carrentBookings"),
    };
  }

  const busBooking = await db
    .collection("busBookings")
    .findOne({ _id: objectId });
  if (busBooking) {
    return {
      booking: busBooking,
      collection: db.collection("busBookings"),
    };
  }

  return { booking: null, collection: null };
}

async function getStaffHotelId(req) {
  if (req.user.role !== "hotel_staff") return null;
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

      const datePricing = getPriceForDates(room, checkIn, checkOut);
      const pricePerNight = datePricing.price || room.price || 0;
      const totalAmount = datePricing.totalPrice;
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
        pricePerNight,
        nightlyPrices: datePricing.nightlyPrices,
        discountPercentage: datePricing.discountPercentage,
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

    await Promise.all(
      createdBookings.map((booking) => notifyBookingConfirmed(db, booking)),
    );

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
      .collection("carrent")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.isActive === false || car.isAvailable === false) {
      return res.status(400).json({ message: "Car is not available" });
    }

    // Count active bookings (not yet returned)
    const now = new Date();
    const activeBookings = await db
      .collection("carrentBookings")
      .countDocuments({
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

    const result = await db.collection("carrentBookings").insertOne(booking);

    const io = req.app.get("io");
    const remaining = Math.max(0, (car.quantity || 0) - activeBookings - 1);
    io.to("cars-room").emit("car-booked", { carId, available: remaining });
    io.to(`user-${req.user.id}`).emit("booking-confirmed", {
      bookingId: result.insertedId,
    });

    await notifyBookingConfirmed(db, { ...booking, _id: result.insertedId });

    res.status(201).json({ ...booking, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/my — user's own bookings
router.get("/my", auth, async (req, res) => {
  try {
    const db = await getDb();
    const [bookings, carRentBookings, busBookings] = await Promise.all([
      db
        .collection("bookings")
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray(),
      db
        .collection("carrentBookings")
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray(),
      db
        .collection("busBookings")
        .find({ userId: new ObjectId(req.user.id) })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    const packageBookings = bookings.filter(
      (b) => (b.type === "package" || b.type === "holiday") && b.packageId,
    );
    const uniquePackageIds = [
      ...new Set(
        packageBookings
          .filter((b) => isValidObjectId(b.packageId))
          .map((b) => b.packageId),
      ),
    ];

    let packageMap = new Map();
    if (uniquePackageIds.length) {
      const packages = await db
        .collection("packages")
        .find({
          _id: { $in: uniquePackageIds.map((id) => new ObjectId(id)) },
        })
        .toArray();
      packageMap = new Map(packages.map((pkg) => [pkg._id.toString(), pkg]));
    }

    const allBookingIds = [
      ...bookings.map((b) => b._id.toString()),
      ...carRentBookings.map((b) => b._id.toString()),
      ...busBookings.map((b) => b._id.toString()),
    ];

    const manualPayments = allBookingIds.length
      ? await db
          .collection("manual_payments")
          .find({ bookingId: { $in: allBookingIds } })
          .sort({ submittedAt: -1 })
          .toArray()
      : [];

    const manualPaymentLatest = new Map();
    manualPayments.forEach((payment) => {
      if (!manualPaymentLatest.has(payment.bookingId)) {
        manualPaymentLatest.set(payment.bookingId, payment);
      }
    });

    const enrichBooking = (booking) => {
      const payment = manualPaymentLatest.get(booking._id.toString());
      return {
        ...booking,
        manualPayment: payment
          ? {
              _id: payment._id,
              status: payment.status,
              transactionId: payment.transactionId,
              screenshot: payment.screenshot,
              message: payment.message,
              submittedAt: payment.submittedAt,
            }
          : undefined,
      };
    };

    const enrichedBookings = bookings.map((booking) => {
      const base = enrichBooking(booking);

      if (
        (booking.type === "package" || booking.type === "holiday") &&
        booking.packageId &&
        packageMap.has(booking.packageId)
      ) {
        return {
          ...base,
          packageDetails: packageMap.get(booking.packageId),
        };
      }

      return base;
    });

    const enrichedCarRentBookings = carRentBookings.map(enrichBooking);
    const enrichedBusBookings = busBookings.map(enrichBooking);

    res.json(
      [
        ...enrichedBookings,
        ...enrichedCarRentBookings,
        ...enrichedBusBookings,
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user/bus-bookings — user's bus bookings
router.get("/user/bus-bookings", auth, async (req, res) => {
  try {
    const db = await getDb();
    const busBookings = await db
      .collection("busBookings")
      .find({ userId: new ObjectId(req.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(busBookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user/bus-tickets/pending — user's pending bus ticket requests
router.get("/user/bus-tickets/pending", auth, async (req, res) => {
  try {
    const db = await getDb();
    const pendingTickets = await db
      .collection("busTicketRequests")
      .find({
        userId: new ObjectId(req.user.id),
        status: "pending",
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(pendingTickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings/:id/cancel-request — user requests to cancel booking
router.post("/:id/cancel-request", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const db = await getDb();
    const { booking } = await findBookingRecord(db, req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only booking owner can request cancellation
    if (booking.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Only confirmed bookings can be cancelled
    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Only confirmed bookings can be cancelled" });
    }

    // Calculate time until check-in/pickup
    const checkInTime = new Date(booking.checkIn || booking.pickupDate);
    const now = new Date();
    const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);

    // Must be at least 23 hours before check-in
    if (hoursUntilCheckIn < 23) {
      return res.status(400).json({
        message:
          "Cancellations must be requested at least 23 hours before check-in",
        hoursUntilCheckIn: Math.max(0, hoursUntilCheckIn),
      });
    }

    // Check if cancel request already exists
    const existingRequest = await db.collection("cancel_requests").findOne({
      bookingId: new ObjectId(req.params.id),
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Cancel request already pending for this booking" });
    }

    // Create cancel request
    const cancelRequest = {
      bookingId: new ObjectId(req.params.id),
      userId: new ObjectId(req.user.id),
      status: "pending", // pending, approved, rejected
      reason: req.body.reason || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("cancel_requests")
      .insertOne(cancelRequest);

    // Emit socket event to admin - emit to admin room if available
    try {
      const serverModule = require("../server");
      if (serverModule && serverModule.io) {
        serverModule.io.to("admin").emit("new-cancel-request", {
          _id: result.insertedId,
          ...cancelRequest,
        });
        // Also emit to the current user so they see the cancel request on their booking card
        serverModule.io.to(`user-${req.user.id}`).emit("new-cancel-request", {
          bookingId: req.params.id,
          cancelRequest: {
            _id: result.insertedId,
            status: "pending",
          },
        });
      }
    } catch (err) {
      // Socket not available, continue anyway
      console.log("Socket emit failed (non-critical):", err.message);
    }

    res.json({
      _id: result.insertedId,
      ...cancelRequest,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id — get booking details with invoice data
router.get("/:id", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const db = await getDb();
    const { booking } = await findBookingRecord(db, req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user owns this booking or is admin
    // Note: bus bookings have userId as ObjectId, others as string
    const userIdToCompare =
      booking.userId instanceof ObjectId
        ? booking.userId.toString()
        : booking.userId;
    const staffHotelId = await getStaffHotelId(req);
    const isHotelStaffAuthorized =
      req.user.role === "hotel_staff" &&
      booking.type === "hotel" &&
      booking.hotelId &&
      staffHotelId &&
      booking.hotelId.toString() === staffHotelId.toString();

    if (
      userIdToCompare !== req.user.id &&
      req.user.role !== "admin" &&
      !isHotelStaffAuthorized
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get user details for invoice
    const userId =
      booking.userId instanceof ObjectId
        ? booking.userId
        : new ObjectId(booking.userId);
    const user = await db.collection("users").findOne({ _id: userId });

    // Get hotel/car/bus details for invoice
    let property;
    let packageDetails = null;
    if (booking.type === "hotel") {
      property = await db
        .collection("hotels")
        .findOne({ _id: new ObjectId(booking.hotelId || booking.hotel) });
    } else if (booking.type === "car") {
      property = await db
        .collection("carrent")
        .findOne({ _id: new ObjectId(booking.carId || booking.car) });
    } else if (booking.type === "bus") {
      property = await db
        .collection("buses")
        .findOne({ _id: new ObjectId(booking.busId) });
    } else if (
      (booking.type === "package" || booking.type === "holiday") &&
      booking.packageId &&
      isValidObjectId(booking.packageId)
    ) {
      packageDetails = await db
        .collection("packages")
        .findOne({ _id: new ObjectId(booking.packageId) });
    }

    // Get cancel request if exists
    const cancelRequest = await db
      .collection("cancel_requests")
      .findOne({ bookingId: req.params.id });

    // Get latest manual payment submission for this booking if any
    const manualPayment = await db
      .collection("manual_payments")
      .findOne({ bookingId: req.params.id }, { sort: { submittedAt: -1 } });

    res.json({
      ...booking,
      user,
      property,
      packageDetails,
      cancelRequest,
      manualPayment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id/invoice — get invoice data
router.get("/:id/invoice", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const db = await getDb();
    const { booking } = await findBookingRecord(db, req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user owns this booking or is admin
    // Note: bus bookings have userId as ObjectId, others as string
    const userIdToCompare =
      booking.userId instanceof ObjectId
        ? booking.userId.toString()
        : booking.userId;
    const staffHotelId = await getStaffHotelId(req);
    const isHotelStaffAuthorized =
      req.user.role === "hotel_staff" &&
      booking.type === "hotel" &&
      booking.hotelId &&
      staffHotelId &&
      booking.hotelId.toString() === staffHotelId.toString();

    if (
      userIdToCompare !== req.user.id &&
      req.user.role !== "admin" &&
      !isHotelStaffAuthorized
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get user details
    const userId =
      booking.userId instanceof ObjectId
        ? booking.userId
        : new ObjectId(booking.userId);
    const user = await db.collection("users").findOne({ _id: userId });

    // Get property details
    let property;
    let roomMealPlan = null;
    let roomMaxGuests = null;
    if (booking.type === "hotel") {
      property = await db
        .collection("hotels")
        .findOne({ _id: new ObjectId(booking.hotelId || booking.hotel) });
      // Fetch the room to get mealPlan and maxGuests
      const room = await db
        .collection("rooms")
        .findOne({ _id: new ObjectId(booking.roomId) });
      roomMealPlan = room?.mealPlan || "Breakfast Included";
      roomMaxGuests = room?.maxGuests || null;
    } else if (booking.type === "car") {
      property = await db
        .collection("carrent")
        .findOne({ _id: new ObjectId(booking.carId || booking.car) });
    } else if (booking.type === "bus") {
      property = await db
        .collection("buses")
        .findOne({ _id: new ObjectId(booking.busId) });
    } else if (booking.type === "package" || booking.type === "holiday") {
      property = await db
        .collection("packages")
        .findOne({ _id: new ObjectId(booking.packageId) });
    }

    // Create invoice object
    let bookingTypeLabel = "Booking";
    if (booking.type === "hotel") bookingTypeLabel = "Hotel Booking";
    else if (booking.type === "car") bookingTypeLabel = "Car Rental";
    else if (booking.type === "bus") bookingTypeLabel = "Bus Ticket";
    else if (booking.type === "package" || booking.type === "holiday")
      bookingTypeLabel = "Holiday Package";

    const invoice = {
      bookingId: booking._id,
      bookingNumber: `BK${booking._id.toString().slice(-8).toUpperCase()}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      bookingDate: booking.createdAt,
      bookingType: bookingTypeLabel,

      // Customer info
      customer: {
        name: user?.name || "N/A",
        email: user?.email || "N/A",
        phone: booking.contactNumber || "N/A",
      },

      // Property info
      property: {
        name:
          booking.type === "hotel"
            ? booking.hotelName
            : booking.type === "car"
              ? booking.carName || property?.name || "Car Rental"
              : booking.type === "bus"
                ? booking.busName
                : booking.packageName || "Holiday Package",
        type:
          booking.type === "hotel"
            ? "Hotel"
            : booking.type === "car"
              ? "Car"
              : booking.type === "bus"
                ? "Bus"
                : "Holiday Package",
        details:
          booking.type === "hotel"
            ? `Room ${booking.roomNumber}, ${property?.location || ""}`
            : booking.type === "car"
              ? booking.pickupLocation ||
                property?.location ||
                booking.carName ||
                booking.carType ||
                "Car Rental"
              : booking.type === "bus"
                ? `${booking.busName}, Route: ${booking.pickupLocation}`
                : property?.location ||
                  property?.description ||
                  "Package booking",
        address: property?.location || booking.pickupLocation || "",
      },

      // Booking dates
      dates: {
        checkIn: booking.checkIn || booking.pickupDate || booking.travelDate,
        checkOut: booking.checkOut || booking.returnDate,
        days: booking.days || 1,
      },

      // Additional info for buses
      ...(booking.type === "bus" && {
        departureTime: booking.departureTime,
      }),
      // Additional info for hotels
      ...(booking.type === "hotel"
        ? {
            guestDetails: {
              fullName: booking.guestDetails?.fullName || user?.name || "N/A",
              email: booking.guestDetails?.email || user?.email || "N/A",
              contactNumber:
                (booking.guestDetails?.contactNumber &&
                  booking.guestDetails.contactNumber.toString().trim()) ||
                (booking.contactNumber &&
                  booking.contactNumber.toString().trim()) ||
                "N/A",
              nidNumber: booking.guestDetails?.nidNumber || "N/A",
              address: booking.guestDetails?.address || "N/A",
            },
            occupancy: booking.occupancy || {},
            maxGuests: roomMaxGuests,
            mealPlan: roomMealPlan,
          }
        : {}),
      // Additional info for holiday packages
      ...(booking.type === "package" || booking.type === "holiday"
        ? {
            peopleCount: booking.peopleCount,
            guestDetails: booking.guestDetails || {},
          }
        : {}),

      // Pricing
      pricing: {
        basePrice: booking.basePrice || booking.totalAmount,
        taxes: booking.taxes || 0,
        discount: booking.discount || 0,
        totalAmount: booking.totalAmount,
        currency: "BDT",
      },

      // Payment info
      payment: {
        method: booking.paymentMethod,
        status: booking.status,
        transactionId: booking.transactionId,
        paidAt: booking.paidAt,
      },
    };

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
