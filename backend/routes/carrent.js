const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/carrent — all active cars with available count
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const { date } = req.query; // Optional: ?date=YYYY-MM-DD for specific date availability

    const cars = await db
      .collection("carrent")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const checkDate = date ? new Date(date) : null;

    const enriched = await Promise.all(
      cars.map(async (car) => {
        let availableCars;
        const quantity = car.quantity || 1; // Default to 1

        if (checkDate) {
          // Date-specific availability: count bookings that overlap this date
          checkDate.setHours(0, 0, 0, 0);
          const nextDay = new Date(checkDate);
          nextDay.setDate(nextDay.getDate() + 1);

          const activeBookings = await db
            .collection("carrentBookings")
            .countDocuments({
              serviceId: car._id.toString(),
              status: { $in: ["confirmed", "pending"] },
              pickupDate: { $lt: nextDay },
              returnDate: { $gt: checkDate },
            });
          availableCars = Math.max(0, quantity - activeBookings);
        } else {
          // Overall availability: count any future bookings
          const now = new Date();
          const activeBookings = await db
            .collection("carrentBookings")
            .countDocuments({
              serviceId: car._id.toString(),
              status: { $in: ["confirmed", "pending"] },
              returnDate: { $gte: now },
            });
          availableCars = Math.max(0, quantity - activeBookings);
        }

        return {
          ...car,
          quantity,
          availableCars,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/carrent/booking/:id — get car rental booking details
router.get("/booking/:id", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const db = await getDb();
    const booking = await db
      .collection("carrentBookings")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user owns this booking or is admin
    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get user details
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(booking.userId) });

    // Get car details
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(booking.carId) });

    const manualPayment = await db
      .collection("manual_payments")
      .findOne(
        { bookingId: booking._id.toString() },
        { sort: { submittedAt: -1 } },
      );

    res.json({
      ...booking,
      user,
      car,
      manualPayment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/carrent/booking/:id/invoice — get invoice data for car rental
router.get("/booking/:id/invoice", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const db = await getDb();
    const booking = await db
      .collection("carrentBookings")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check authorization
    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get user details
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(booking.userId) });

    // Get car details
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(booking.carId) });

    // Create invoice object
    const invoice = {
      bookingId: booking._id,
      bookingNumber: `BK${booking._id.toString().slice(-8).toUpperCase()}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      bookingDate: booking.createdAt,
      bookingType: "Car Rental",

      // Customer info
      customer: {
        name: user?.name || "N/A",
        email: user?.email || "N/A",
        phone: booking.contactNumber || "N/A",
      },

      // Property info
      property: {
        name: booking.carName || car?.name || "Car Rental",
        type: "Car",
        details:
          booking.pickupLocation || car?.location || car?.name || "Car Rental",
        address: booking.pickupLocation || car?.location || "",
      },

      // Booking dates
      dates: {
        checkIn: booking.pickupDate,
        checkOut: booking.returnDate,
      },

      // Stay info
      stay: {
        days: booking.days,
      },

      // Pricing
      pricing: {
        basePrice: booking.totalAmount,
        taxes: 0,
        discount: 0,
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

// GET /api/carrent/:id — single car with availability
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const { date } = req.query; // Optional: ?date=YYYY-MM-DD for specific date availability

    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const quantity = car.quantity || 1; // Default to 1
    let availableCars;

    if (date) {
      // Date-specific availability
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const activeBookings = await db
        .collection("carrentBookings")
        .countDocuments({
          serviceId: req.params.id,
          status: { $in: ["confirmed", "pending"] },
          pickupDate: { $lt: nextDay },
          returnDate: { $gt: checkDate },
        });
      availableCars = Math.max(0, quantity - activeBookings);
    } else {
      // Overall availability
      const now = new Date();
      const activeBookings = await db
        .collection("carrentBookings")
        .countDocuments({
          serviceId: req.params.id,
          status: { $in: ["confirmed", "pending"] },
          returnDate: { $gte: now },
        });
      availableCars = Math.max(0, quantity - activeBookings);
    }

    res.json({
      ...car,
      quantity,
      availableCars,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/carrent/:id/book — book a car (user)
router.post("/:id/book", auth, async (req, res) => {
  try {
    const { pickupDate, returnDate, pickupLocation } = req.body;

    if (!pickupDate || !returnDate || !pickupLocation) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await getDb();
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!car) return res.status(404).json({ message: "Car not found" });

    // Calculate days
    const pickup = new Date(pickupDate);
    const returned = new Date(returnDate);
    const days = Math.ceil((returned - pickup) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    // Check availability
    const activeBookings = await db
      .collection("carrentBookings")
      .countDocuments({
        serviceId: req.params.id,
        status: { $in: ["confirmed", "pending"] },
        $or: [{ pickupDate: { $lt: returned }, returnDate: { $gt: pickup } }],
      });

    if (activeBookings >= (car.quantity || 0)) {
      return res
        .status(400)
        .json({ message: "Car not available for selected dates" });
    }

    const totalAmount = (car.price || 0) * days;

    const booking = {
      serviceId: req.params.id,
      carName: car.name,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      pickupDate: pickup,
      returnDate: returned,
      pickupLocation,
      days,
      totalAmount,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("carrentBookings").insertOne(booking);

    res.json({
      _id: result.insertedId,
      ...booking,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
