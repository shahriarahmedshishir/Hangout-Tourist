const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth, role } = require("../middleware/auth");
const upload = require("../middleware/upload");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// ─── STAFF MANAGEMENT ──────────────────────────────────────────────────────────

// POST /api/admin/staff — create hotel staff account
router.post("/staff", auth, role("admin"), async (req, res) => {
  try {
    const { staffName, email, password, hotelId } = req.body;
    if (!staffName || !email || !password || !hotelId) {
      return res.status(400).json({ message: "All fields required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    if (!isValidObjectId(hotelId)) {
      return res.status(400).json({ message: "Invalid hotel selected" });
    }

    const db = await getDb();
    const existing = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const hotel = await db
      .collection("hotels")
      .findOne({ _id: new ObjectId(hotelId) });
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });

    const hashed = await bcrypt.hash(password, 10);
    const staffResult = await db.collection("users").insertOne({
      name: staffName,
      email: email.toLowerCase(),
      password: hashed,
      role: "hotel_staff",
      hotelId: hotel._id.toString(),
      hotelName: hotel.name,
      createdAt: new Date(),
    });

    res
      .status(201)
      .json({ message: "Staff account created", id: staffResult.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── HOTEL MANAGEMENT ──────────────────────────────────────────────────────────

// GET /api/admin/hotels
router.get("/hotels", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const hotels = await db
      .collection("hotels")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const enriched = await Promise.all(
      hotels.map(async (h) => {
        const roomCount = await db
          .collection("rooms")
          .countDocuments({ hotelId: h._id.toString() });
        return { ...h, roomCount };
      }),
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/hotels — create hotel
router.post(
  "/hotels",
  auth,
  role("admin"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, area, description, totalRooms } = req.body;
      let services = [];
      try {
        services = JSON.parse(req.body.services || "[]");
      } catch {}
      if (!name)
        return res.status(400).json({ message: "Hotel name is required" });

      const db = await getDb();
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const result = await db.collection("hotels").insertOne({
        name,
        image: imageUrl,
        area: area || "",
        description: description || "",
        services,
        totalRooms: parseInt(totalRooms) || 0,
        isActive: true,
        createdAt: new Date(),
      });

      res.status(201).json({ message: "Hotel created", id: result.insertedId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT /api/admin/hotels/:id — update hotel
router.put(
  "/hotels/:id",
  auth,
  role("admin"),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });
      const { name, area, description, totalRooms } = req.body;
      let services = [];
      try {
        services = JSON.parse(req.body.services || "[]");
      } catch {}

      const db = await getDb();
      const update = {
        name,
        area,
        description,
        services,
        totalRooms: parseInt(totalRooms) || 0,
      };
      if (req.file) update.image = `/uploads/${req.file.filename}`;

      await db
        .collection("hotels")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
      res.json({ message: "Hotel updated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /api/admin/hotels/:id — delete hotel + rooms + cancel active bookings
router.delete("/hotels/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();

    const rooms = await db
      .collection("rooms")
      .find({ hotelId: req.params.id })
      .toArray();
    const roomIds = rooms.map((r) => r._id.toString());

    if (roomIds.length > 0) {
      await db.collection("bookings").updateMany(
        {
          roomId: { $in: roomIds },
          status: { $in: ["confirmed", "pending"] },
        },
        { $set: { status: "cancelled", refundStatus: "in_progress" } },
      );
      await db.collection("rooms").deleteMany({ hotelId: req.params.id });
    }

    await db
      .collection("hotels")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Hotel deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ROOM MANAGEMENT ──────────────────────────────────────────────────────────

// GET /api/admin/hotels/:id/rooms
router.get("/hotels/:id/rooms", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const rooms = await db
      .collection("rooms")
      .find({ hotelId: req.params.id })
      .sort({ roomNumber: 1 })
      .toArray();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/hotels/:id/rooms — add room
router.post(
  "/hotels/:id/rooms",
  auth,
  role("admin"),
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });
      const { roomNumber, price } = req.body;
      let services = [];
      try {
        services = JSON.parse(req.body.services || "[]");
      } catch {}
      if (!roomNumber || !price)
        return res
          .status(400)
          .json({ message: "roomNumber and price are required" });

      // Check totalRooms limit
      const db = await getDb();
      const hotel = await db
        .collection("hotels")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!hotel) return res.status(404).json({ message: "Hotel not found" });
      const existing = await db
        .collection("rooms")
        .countDocuments({ hotelId: req.params.id });
      if (hotel.totalRooms > 0 && existing >= hotel.totalRooms) {
        return res
          .status(400)
          .json({ message: `Room limit reached (${hotel.totalRooms})` });
      }

      const images = req.files
        ? req.files.map((f) => `/uploads/${f.filename}`)
        : [];

      const result = await db.collection("rooms").insertOne({
        hotelId: req.params.id,
        roomNumber,
        price: parseFloat(price),
        services,
        images,
        isAvailable: true,
        isActive: true,
        createdAt: new Date(),
      });

      res.status(201).json({ message: "Room added", id: result.insertedId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT /api/admin/rooms/:id — update room
router.put(
  "/rooms/:id",
  auth,
  role("admin"),
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });
      const { roomNumber, price } = req.body;
      let services = [];
      try {
        services = JSON.parse(req.body.services || "[]");
      } catch {}

      const db = await getDb();
      const update = { roomNumber, price: parseFloat(price), services };
      if (req.files && req.files.length > 0) {
        update.images = req.files.map((f) => `/uploads/${f.filename}`);
      }

      await db
        .collection("rooms")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
      res.json({ message: "Room updated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /api/admin/rooms/:id — delete room
router.delete("/rooms/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();

    await db
      .collection("bookings")
      .updateMany(
        { roomId: req.params.id, status: { $in: ["confirmed", "pending"] } },
        { $set: { status: "cancelled", refundStatus: "in_progress" } },
      );
    await db
      .collection("rooms")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/rooms/:id/toggle — toggle room availability
router.patch("/rooms/:id/toggle", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const room = await db
      .collection("rooms")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!room) return res.status(404).json({ message: "Room not found" });

    await db
      .collection("rooms")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isAvailable: !room.isAvailable } },
      );
    res.json({
      message: "Room availability updated",
      isAvailable: !room.isAvailable,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/rooms/:id/price — update room price
router.patch("/rooms/:id/price", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const { price } = req.body;
    if (!price || isNaN(price))
      return res.status(400).json({ message: "Valid price required" });
    const db = await getDb();
    await db
      .collection("rooms")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { price: parseFloat(price) } },
      );
    res.json({ message: "Price updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/rooms/:id/blocks — add a manual booked/blocked date range
router.post("/rooms/:id/blocks", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const { checkIn, checkOut } = req.body;
    if (!checkIn || !checkOut)
      return res
        .status(400)
        .json({ message: "checkIn and checkOut are required" });
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate) || isNaN(checkOutDate))
      return res.status(400).json({ message: "Invalid dates" });
    if (checkOutDate <= checkInDate)
      return res
        .status(400)
        .json({ message: "checkOut must be after checkIn" });

    const db = await getDb();

    // Check if dates conflict with existing bookings
    const existingBookings = await db
      .collection("bookings")
      .find({
        roomId: req.params.id,
        status: { $in: ["confirmed", "pending"] },
        checkOut: { $gt: checkInDate },
        checkIn: { $lt: checkOutDate },
      })
      .toArray();

    if (existingBookings.length > 0) {
      return res.status(409).json({
        message: "Cannot block these dates - there are existing bookings",
        conflictingBookings: existingBookings.length,
      });
    }

    const blockId = new ObjectId();
    await db.collection("rooms").updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $push: {
          blockedDates: {
            _id: blockId.toString(),
            checkIn: checkInDate,
            checkOut: checkOutDate,
          },
        },
      },
    );
    res
      .status(201)
      .json({ message: "Block added", blockId: blockId.toString() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/rooms/:id/blocks/:blockId — remove a specific blocked date range
router.delete(
  "/rooms/:id/blocks/:blockId",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });
      const db = await getDb();
      await db
        .collection("rooms")
        .updateOne(
          { _id: new ObjectId(req.params.id) },
          { $pull: { blockedDates: { _id: req.params.blockId } } },
        );
      res.json({ message: "Block removed" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ─── CAR MANAGEMENT ──────────────────────────────────────────────────────────

// GET /api/admin/cars
router.get("/cars", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const cars = await db
      .collection("cars")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const now = new Date();
    const enriched = await Promise.all(
      cars.map(async (car) => {
        const active = await db.collection("bookings").countDocuments({
          carId: car._id.toString(),
          type: "car",
          status: { $in: ["confirmed", "pending"] },
          returnDate: { $gte: now },
        });
        return {
          ...car,
          activeBookings: active,
          available: Math.max(0, (car.quantity || 0) - active),
        };
      }),
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/cars — add car
router.post(
  "/cars",
  auth,
  role("admin"),
  upload.array("images", 10),
  async (req, res) => {
    try {
      const { name, type, seats, transmission, fuel, price, quantity, places } =
        req.body;
      if (!name || !price || !quantity) {
        return res
          .status(400)
          .json({ message: "name, price, quantity are required" });
      }
      const images = req.files
        ? req.files.map((f) => `/uploads/${f.filename}`)
        : [];
      const placesArr = places
        ? places
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : [];
      const db = await getDb();
      const result = await db.collection("cars").insertOne({
        name,
        type: type || "Sedan",
        seats: parseInt(seats) || 5,
        transmission: transmission || "Automatic",
        fuel: fuel || "Petrol",
        price: parseFloat(price),
        quantity: parseInt(quantity),
        places: placesArr,
        images,
        isAvailable: true,
        isActive: true,
        createdAt: new Date(),
      });
      res.status(201).json({ message: "Car added", id: result.insertedId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT /api/admin/cars/:id — update car
router.put(
  "/cars/:id",
  auth,
  role("admin"),
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });
      const { name, type, seats, transmission, fuel, price, quantity, places } =
        req.body;
      const db = await getDb();
      const update = {
        name,
        type,
        seats: parseInt(seats),
        transmission,
        fuel,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        places: places
          ? places
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      };
      if (req.files && req.files.length > 0) {
        update.images = req.files.map((f) => `/uploads/${f.filename}`);
      }
      await db
        .collection("cars")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
      res.json({ message: "Car updated" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /api/admin/cars/:id — delete car
router.delete("/cars/:id", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    await db
      .collection("bookings")
      .updateMany(
        { carId: req.params.id, status: { $in: ["confirmed", "pending"] } },
        { $set: { status: "cancelled", refundStatus: "in_progress" } },
      );
    await db.collection("cars").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Car deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/cars/:id/toggle — toggle availability
router.patch("/cars/:id/toggle", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    await db
      .collection("cars")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isAvailable: !car.isAvailable } },
      );
    res.json({
      message: "Car availability updated",
      isAvailable: !car.isAvailable,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/cars/:id/price — update car price
router.patch("/cars/:id/price", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const { price } = req.body;
    if (!price || isNaN(price))
      return res.status(400).json({ message: "Valid price required" });
    const db = await getDb();
    await db
      .collection("cars")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { price: parseFloat(price) } },
      );
    res.json({ message: "Price updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/cars/:id/bookings — list all bookings for a specific car
router.get("/cars/:id/bookings", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const pipeline = [
      { $match: { carId: req.params.id, type: "car" } },
      { $addFields: { userObjectId: { $toObjectId: "$userId" } } },
      {
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $addFields: {
          userName: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.name", 0] }, "Unknown"],
          },
          userEmail: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.email", 0] }, ""],
          },
        },
      },
      { $project: { userInfo: 0, userObjectId: 0 } },
      { $sort: { pickupDate: 1 } },
    ];
    const bookings = await db
      .collection("bookings")
      .aggregate(pipeline)
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── BOOKING MANAGEMENT ──────────────────────────────────────────────────────

// GET /api/admin/bookings
router.get("/bookings", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const {
      type,
      status,
      page = 1,
      limit = 50,
      search,
      dateFrom,
      dateTo,
      viewMode = "upcoming", // "upcoming" = today+future (default), "past" = before today, "all" = no filter
    } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get bookings
    const bookingsPipeline = [];

    // Add computed startDate field (pickupDate for cars, checkIn for hotels)
    bookingsPipeline.push({
      $addFields: {
        startDate: { $ifNull: ["$pickupDate", "$checkIn"] },
      },
    });

    // Build initial match
    const bookingsMatch = {};
    if (type && type !== "coin_topup") bookingsMatch.type = type;
    if (status) bookingsMatch.status = status;

    // Date filtering based on viewMode
    if (viewMode === "upcoming") {
      // Default: show today and future bookings
      bookingsMatch.startDate = { $gte: today };
    } else if (viewMode === "past") {
      // Show past bookings (before today)
      bookingsMatch.startDate = { $lt: today };
    }
    // If viewMode === "all", no date filter applied

    // Date range filter (custom range overrides viewMode)
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      bookingsMatch.startDate = dateFilter;
    }

    bookingsPipeline.push({ $match: bookingsMatch });

    // Lookup user info for bookings
    bookingsPipeline.push({
      $addFields: { userObjectId: { $toObjectId: "$userId" } },
    });
    bookingsPipeline.push({
      $lookup: {
        from: "users",
        localField: "userObjectId",
        foreignField: "_id",
        as: "userInfo",
      },
    });
    bookingsPipeline.push({
      $addFields: {
        userName: {
          $ifNull: [{ $arrayElemAt: ["$userInfo.name", 0] }, "Unknown"],
        },
        userEmail: {
          $ifNull: [{ $arrayElemAt: ["$userInfo.email", 0] }, ""],
        },
      },
    });

    // Search by user name or item name for bookings
    const searchFilters = [];
    if (search) {
      searchFilters.push({ userName: { $regex: search, $options: "i" } });
      searchFilters.push({ carName: { $regex: search, $options: "i" } });
      searchFilters.push({ hotelName: { $regex: search, $options: "i" } });
    }

    // Remove internals from bookings
    bookingsPipeline.push({ $project: { userInfo: 0, userObjectId: 0 } });

    const bookings = await db
      .collection("bookings")
      .aggregate(bookingsPipeline)
      .toArray();

    // Get coin topups if type filter is not set or is coin_topup
    let coinTopups = [];
    if (!type || type === "coin_topup") {
      const coinMatch = {};
      if (status) coinMatch.status = status;

      if (dateFrom || dateTo) {
        const dateFilter = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        coinMatch.submittedAt = dateFilter;
      }

      const coinRequests = await db
        .collection("coin_topup_requests")
        .find(coinMatch)
        .toArray();

      // Enrich coin topups with user info and format to match bookings schema
      coinTopups = await Promise.all(
        coinRequests.map(async (cr) => {
          const user = await db
            .collection("users")
            .findOne({ _id: new ObjectId(cr.userId) });
          return {
            _id: cr._id,
            type: "coin_topup",
            userId: cr.userId,
            userName: user?.name || "Unknown",
            userEmail: user?.email || "",
            amount: cr.amount,
            totalAmount: cr.amount,
            status: cr.status,
            transactionId: cr.transactionId,
            paymentMethod: cr.paymentMethod,
            createdAt: cr.submittedAt,
          };
        }),
      );

      // Apply search filter to coin topups
      if (search) {
        const q = search.toLowerCase();
        coinTopups = coinTopups.filter(
          (ct) =>
            ct.userName?.toLowerCase().includes(q) ||
            ct.userEmail?.toLowerCase().includes(q) ||
            "coin topup".includes(q),
        );
      }
    }

    // Merge and sort
    let allItems = [...bookings, ...coinTopups];

    // Filter by search if provided
    if (search) {
      const q = search.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.userName?.toLowerCase().includes(q) ||
          item.carName?.toLowerCase().includes(q) ||
          item.hotelName?.toLowerCase().includes(q) ||
          (item.type === "coin_topup" && "coin topup".includes(q)) ||
          new Date(item.createdAt).toLocaleDateString().includes(q),
      );
    }

    // Sort by createdAt (or startDate for bookings)
    allItems.sort((a, b) => {
      const dateA = a.startDate || a.createdAt;
      const dateB = b.startDate || b.createdAt;
      return new Date(dateA) - new Date(dateB);
    });

    // Paginate
    const total = allItems.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginatedItems = allItems.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum,
    );

    res.json({
      bookings: paginatedItems,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bookings/:id/cancel
router.post("/bookings/:id/cancel", auth, role("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });
    const db = await getDb();
    const booking = await db
      .collection("bookings")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "cancelled")
      return res.status(400).json({ message: "Already cancelled" });

    await db.collection("bookings").updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          status: "cancelled",
          refundStatus: "in_progress",
          cancelledAt: new Date(),
        },
      },
    );

    // Notify user via socket
    const io = req.app.get("io");
    io.to(`user-${booking.userId}`).emit("booking-cancelled", {
      bookingId: req.params.id,
    });

    // Notify car/hotel watchers
    if (booking.type === "car") {
      io.to("cars-room").emit("car-available", { carId: booking.carId });
    } else {
      io.to(`hotel-${booking.hotelId}`).emit("room-available", {
        roomId: booking.roomId,
      });
    }

    res.json({ message: "Booking cancelled, refund in progress" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bookings/:id/refund — confirm refund with screenshot/transaction
router.post(
  "/bookings/:id/refund",
  auth,
  role("admin"),
  upload.single("screenshot"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });
      const { transactionId, paymentMethod } = req.body;
      if (!transactionId || !paymentMethod) {
        return res
          .status(400)
          .json({ message: "transactionId and paymentMethod are required" });
      }

      const db = await getDb();
      const booking = await db
        .collection("bookings")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });
      if (booking.refundStatus !== "in_progress") {
        return res
          .status(400)
          .json({ message: "Booking is not in refund-pending state" });
      }

      const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : null;

      await db.collection("bookings").updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            refundStatus: "completed",
            transactionId,
            paymentMethod,
            refundScreenshot: screenshotUrl,
            refundedAt: new Date(),
          },
        },
      );

      const io = req.app.get("io");
      io.to(`user-${booking.userId}`).emit("booking-refunded", {
        bookingId: req.params.id,
        transactionId,
        paymentMethod,
      });

      res.json({ message: "Refund confirmed" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

// GET /api/admin/users
router.get("/users", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/stats
router.get("/stats", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalBookings,
      totalHotels,
      totalCars,
      totalUsers,
      revenueResult,
      refundedResult,
      todayRevenueResult,
      todayCanceledResult,
      coinTopupRevenueResult,
      todayCoinTopupRevenueResult,
    ] = await Promise.all([
      db.collection("bookings").countDocuments(),
      db.collection("hotels").countDocuments({ isActive: { $ne: false } }),
      db.collection("cars").countDocuments({ isActive: { $ne: false } }),
      db.collection("users").countDocuments({ role: "user" }),
      // Total revenue from confirmed bookings (EXCLUDE coin-paid bookings to avoid double counting)
      db
        .collection("bookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              paidWithCoins: { $ne: true }, // Exclude bookings paid with coins
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Total refunded amount (EXCLUDE coin-paid bookings)
      db
        .collection("bookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              refundStatus: "completed",
              paidWithCoins: { $ne: true }, // Exclude coin-paid bookings
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Today's revenue (EXCLUDE coin-paid bookings)
      db
        .collection("bookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              paidAt: { $gte: today, $lt: tomorrow },
              paidWithCoins: { $ne: true }, // Exclude coin-paid bookings
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Today's canceled bookings
      db.collection("bookings").countDocuments({
        status: "cancelled",
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      // Total revenue from coin top-ups
      db
        .collection("revenue")
        .aggregate([
          { $match: { type: "coin_topup" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      // Today's coin top-up revenue
      db
        .collection("revenue")
        .aggregate([
          {
            $match: {
              type: "coin_topup",
              approvedAt: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
    ]);

    const bookingRevenue = revenueResult[0]?.total || 0;
    const refundedTotal = refundedResult[0]?.total || 0;
    const coinTopupRevenue = coinTopupRevenueResult[0]?.total || 0;
    const totalRevenue = bookingRevenue + coinTopupRevenue;
    const netRevenue = totalRevenue - refundedTotal;
    const todayBookingRevenue = todayRevenueResult[0]?.total || 0;
    const todayCoinTopupRevenue = todayCoinTopupRevenueResult[0]?.total || 0;
    const todayRevenue = todayBookingRevenue + todayCoinTopupRevenue;

    res.json({
      totalBookings,
      totalHotels,
      totalCars,
      totalUsers,
      totalRevenue: netRevenue,
      refundedTotal,
      todayRevenue,
      todayCanceled: todayCanceledResult,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── MANUAL PAYMENTS ──────────────────────────────────────────────────────────

// GET /api/admin/manual-payments — List all pending manual payments
router.get("/manual-payments", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { status = "pending" } = req.query;

    const query = status ? { status } : {};
    const payments = await db
      .collection("manual_payments")
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    // Enrich with user and booking details
    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(payment.userId) });
        const booking = await db
          .collection("bookings")
          .findOne({ _id: new ObjectId(payment.bookingId) });

        return {
          ...payment,
          userName: user?.name,
          userEmail: user?.email,
          bookingDetails: booking,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/manual-payments/:id/confirm — Confirm manual payment
router.post(
  "/manual-payments/:id/confirm",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = await getDb();

      const payment = await db.collection("manual_payments").findOne({
        _id: new ObjectId(id),
      });

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.status !== "pending") {
        return res.status(409).json({ message: "Payment already processed" });
      }

      // Update manual payment status
      await db.collection("manual_payments").updateOne(
        { _id: payment._id },
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: req.user.id,
          },
        },
      );

      // Update booking to confirmed
      const now = new Date();
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(payment.bookingId) },
        {
          $set: {
            status: "confirmed",
            paidAt: now,
          },
        },
      );

      res.json({ message: "Manual payment approved and booking confirmed" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/manual-payments/:id/reject — Reject manual payment
router.post(
  "/manual-payments/:id/reject",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const db = await getDb();

      const payment = await db.collection("manual_payments").findOne({
        _id: new ObjectId(id),
      });

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.status !== "pending") {
        return res.status(409).json({ message: "Payment already processed" });
      }

      // Update manual payment status
      await db.collection("manual_payments").updateOne(
        { _id: payment._id },
        {
          $set: {
            status: "rejected",
            rejectionReason: reason || "Admin rejected the payment",
            reviewedAt: new Date(),
            reviewedBy: req.user.id,
          },
        },
      );

      // Update booking status to payment_failed to allow resubmission
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(payment.bookingId) },
        {
          $set: {
            status: "payment_failed",
            paymentFailureReason: "Manual payment rejected",
          },
        },
      );

      res.json({
        message: "Manual payment rejected",
        rejectionReason: reason,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ─── COIN TOP-UPS ──────────────────────────────────────────────────────────

// GET /api/admin/coin-topups — List all pending coin top-up requests
router.get("/coin-topups", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { status = "pending" } = req.query;

    const query = status ? { status } : {};
    const topups = await db
      .collection("coin_topup_requests")
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    // Enrich with user details
    const enriched = await Promise.all(
      topups.map(async (topup) => {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(topup.userId) });

        return {
          ...topup,
          userName: user?.name,
          userEmail: user?.email,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/coin-topups/:id/confirm — Confirm coin top-up
router.post(
  "/coin-topups/:id/confirm",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = await getDb();

      const topup = await db.collection("coin_topup_requests").findOne({
        _id: new ObjectId(id),
      });

      if (!topup) {
        return res.status(404).json({ message: "Top-up request not found" });
      }

      if (topup.status !== "pending") {
        return res.status(409).json({ message: "Top-up already processed" });
      }

      // Update top-up request status
      await db.collection("coin_topup_requests").updateOne(
        { _id: topup._id },
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: req.user.id,
          },
        },
      );

      // Add coins to user's ledger
      await db.collection("coin_ledger").updateOne(
        { userId: topup.userId },
        {
          $inc: { coins: topup.amount },
          $push: {
            transactions: {
              type: "topup",
              topupRequestId: topup._id.toString(),
              amount: topup.amount,
              timestamp: new Date(),
              description: `Top-up via ${topup.paymentMethod}`,
              approvedBy: req.user.id,
            },
          },
        },
        { upsert: true },
      );

      // Track revenue
      await db.collection("revenue").insertOne({
        amount: topup.amount,
        paymentMethod: topup.paymentMethod,
        type: "coin_topup",
        userId: topup.userId,
        transactionId: topup.transactionId,
        topupRequestId: topup._id,
        approvedAt: new Date(),
        approvedBy: req.user.id,
        createdAt: new Date(),
      });

      res.json({
        message: "Coin top-up approved",
        coinsAdded: topup.amount,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/coin-topups/:id/reject — Reject coin top-up
router.post(
  "/coin-topups/:id/reject",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const db = await getDb();

      const topup = await db.collection("coin_topup_requests").findOne({
        _id: new ObjectId(id),
      });

      if (!topup) {
        return res.status(404).json({ message: "Top-up request not found" });
      }

      if (topup.status !== "pending") {
        return res.status(409).json({ message: "Top-up already processed" });
      }

      // Update top-up request status
      await db.collection("coin_topup_requests").updateOne(
        { _id: topup._id },
        {
          $set: {
            status: "rejected",
            rejectionReason: reason || "Admin rejected the top-up",
            reviewedAt: new Date(),
            reviewedBy: req.user.id,
          },
        },
      );

      res.json({
        message: "Coin top-up rejected",
        rejectionReason: reason,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/coin-topups/:id/refund — Refund approved coins to user
router.post(
  "/coin-topups/:id/refund",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const db = await getDb();

      const topup = await db.collection("coin_topup_requests").findOne({
        _id: new ObjectId(id),
      });

      if (!topup) {
        return res.status(404).json({ message: "Top-up request not found" });
      }

      if (topup.status !== "approved") {
        return res
          .status(409)
          .json({ message: "Only approved top-ups can be refunded" });
      }

      if (topup.refundStatus === "completed") {
        return res
          .status(409)
          .json({ message: "This top-up has already been refunded" });
      }

      // Remove coins from user's ledger
      await db.collection("coin_ledger").updateOne(
        { userId: topup.userId },
        {
          $inc: { coins: -topup.amount },
          $push: {
            transactions: {
              type: "refund",
              topupRequestId: topup._id.toString(),
              amount: -topup.amount,
              timestamp: new Date(),
              description: `Refund: ${reason || "Admin refund"}`,
              refundedBy: req.user.id,
            },
          },
        },
      );

      // Mark top-up as refunded
      await db.collection("coin_topup_requests").updateOne(
        { _id: topup._id },
        {
          $set: {
            refundStatus: "completed",
            refundReason: reason || "Admin refunded the top-up",
            refundedAt: new Date(),
            refundedBy: req.user.id,
          },
        },
      );

      // Record refund in revenue (negative amount to offset original credit)
      await db.collection("revenue").insertOne({
        amount: -topup.amount,
        paymentMethod: topup.paymentMethod,
        type: "coin_topup_refund",
        userId: topup.userId,
        transactionId: topup.transactionId,
        topupRequestId: topup._id,
        refundReason: reason,
        refundedAt: new Date(),
        refundedBy: req.user.id,
        createdAt: new Date(),
      });

      res.json({
        message: "Coins refunded successfully",
        coinsRefunded: topup.amount,
        reason,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/bookings/:id/refund-coins — Refund coins for a coin-paid booking
router.post(
  "/bookings/:id/refund-coins",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Refund reason required" });
      }

      const db = await getDb();

      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(id),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.paidWithCoins !== true) {
        return res
          .status(409)
          .json({ message: "This booking was not paid with coins" });
      }

      if (booking.refundStatus === "completed") {
        return res
          .status(409)
          .json({ message: "This booking has already been refunded" });
      }

      const refundAmount = booking.totalAmount || 0;

      // Add coins back to user's wallet
      await db.collection("coin_ledger").updateOne(
        { userId: booking.userId },
        {
          $inc: { coins: refundAmount },
          $push: {
            transactions: {
              type: "refund",
              bookingId: booking._id.toString(),
              bookingType: booking.type,
              amount: refundAmount,
              timestamp: new Date(),
              description: `Refund: ${reason}`,
              refundedBy: req.user.id,
            },
          },
        },
        { upsert: true },
      );

      // Mark booking as refunded
      await db.collection("bookings").updateOne(
        { _id: booking._id },
        {
          $set: {
            status: "refunded",
            refundStatus: "completed",
            refundReason: reason,
            refundedAt: new Date(),
            refundedBy: req.user.id,
          },
        },
      );

      // Record refund in revenue (negative amount)
      await db.collection("revenue").insertOne({
        amount: -refundAmount,
        type: "booking_refund",
        bookingId: booking._id.toString(),
        bookingType: booking.type,
        userId: booking.userId,
        refundReason: reason,
        refundedAt: new Date(),
        refundedBy: req.user.id,
        createdAt: new Date(),
      });

      res.json({
        message: "Coins refunded successfully",
        coinsRefunded: refundAmount,
        reason,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/add-coins — Add coins to user (search by email first)
router.post("/add-coins", auth, role("admin"), async (req, res) => {
  try {
    const { email, amount, reason } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (!reason) {
      return res
        .status(400)
        .json({ message: "Reason for coin addition required" });
    }

    const db = await getDb();

    // Search for user by email
    const user = await db.collection("users").findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found with this email" });
    }

    // Verify user has user role (not admin/staff)
    if (user.role === "admin" || user.role === "hotel_staff") {
      return res.status(403).json({
        message: `Cannot add coins to ${user.role}. Only regular users can receive coins.`,
        userRole: user.role,
      });
    }

    // Add coins to user's wallet
    await db.collection("coin_ledger").updateOne(
      { userId: user._id.toString() },
      {
        $inc: { coins: amount },
        $push: {
          transactions: {
            type: "admin_add",
            amount,
            timestamp: new Date(),
            description: `Admin added coins: ${reason}`,
            addedBy: req.user.id,
          },
        },
      },
      { upsert: true },
    );

    // Record in revenue
    await db.collection("revenue").insertOne({
      amount,
      type: "admin_coin_add",
      userId: user._id.toString(),
      reason,
      addedAt: new Date(),
      addedBy: req.user.id,
      createdAt: new Date(),
    });

    res.json({
      message: "Coins added successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      coinsAdded: amount,
      reason,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/search-user — Search user by email (for verification)
router.get("/search-user", auth, role("admin"), async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const db = await getDb();

    const user = await db.collection("users").findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user can receive coins
    const canReceiveCoins =
      user.role !== "admin" && user.role !== "hotel_staff";

    // Get current coin balance
    const ledger = await db.collection("coin_ledger").findOne({
      userId: user._id.toString(),
    });

    res.json({
      found: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      canReceiveCoins,
      currentBalance: ledger?.coins || 0,
      reason: !canReceiveCoins
        ? `Cannot add coins to ${user.role}`
        : "This user can receive coins",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PAYMENT HISTORY ──────────────────────────────────────────────────────────

// GET /api/admin/payment-history — Get all payments, refunds, coins with filters
router.get("/payment-history", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const {
      email,
      dateFrom,
      dateTo,
      paidBy, // 'online', 'manual', 'coin'
      type, // 'payment', 'refund', 'coin_refund', 'admin_coin_add'
      page = 1,
      limit = 50,
    } = req.query;

    const today = new Date();
    const payments = [];

    // ─── 1. BOOKING PAYMENTS (Online & Manual) ──────────────────────────────────

    const bookingMatch = {};
    const userMatch = {};

    if (email) {
      userMatch.$or = [{ "userInfo.email": { $regex: email, $options: "i" } }];
    }

    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      bookingMatch.createdAt = dateFilter;
    }

    if (paidBy === "online") {
      bookingMatch.paymentMethod = "online";
    } else if (paidBy === "manual") {
      bookingMatch.paymentMethod = "manual";
    }

    const bookingPipeline = [
      { $match: bookingMatch },
      { $addFields: { userObjectId: { $toObjectId: "$userId" } } },
      {
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
    ];

    if (email) {
      bookingPipeline.push({
        $match: {
          "userInfo.email": { $regex: email, $options: "i" },
        },
      });
    }

    const bookingsData = await db
      .collection("bookings")
      .aggregate(bookingPipeline)
      .toArray();

    bookingsData.forEach((booking) => {
      if (
        !type ||
        type === "payment" ||
        (type === "refund" && booking.refundStatus === "completed")
      ) {
        payments.push({
          _id: booking._id,
          type: booking.refundStatus === "completed" ? "refund" : "payment",
          email: booking.userInfo.email,
          userName: booking.userInfo.name,
          userId: booking.userId,
          paidBy: booking.paymentMethod || "online",
          amount: booking.totalAmount || booking.amount,
          transactionId: booking.transactionId || null,
          timestamp: booking.refundedAt || booking.createdAt,
          itemType: booking.type === "car" ? "Car" : "Hotel",
          itemName: booking.carName || booking.hotelName,
          status: booking.refundStatus === "completed" ? "Refunded" : "Paid",
          bookingId: booking._id.toString(),
        });
      }
    });

    // ─── 2. COIN TOPUP REQUESTS (Online Payments) ──────────────────────────────

    const coinTopupMatch = {};
    if (paidBy !== "manual" && paidBy !== "coin") {
      // Only include if filtering for online or no paidBy filter
      if (!paidBy || paidBy === "online") {
        const coinTopupPipeline = [
          { $match: coinTopupMatch },
          { $addFields: { userObjectId: { $toObjectId: "$userId" } } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "userInfo",
            },
          },
          { $unwind: "$userInfo" },
        ];

        if (email) {
          coinTopupPipeline.push({
            $match: {
              "userInfo.email": { $regex: email, $options: "i" },
            },
          });
        }

        if (dateFrom || dateTo) {
          const dateFilter = {};
          if (dateFrom) dateFilter.$gte = new Date(dateFrom);
          if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
          }
          coinTopupPipeline.push({
            $match: { submittedAt: dateFilter },
          });
        }

        const coinTopups = await db
          .collection("coin_topup_requests")
          .aggregate(coinTopupPipeline)
          .toArray();

        coinTopups.forEach((ct) => {
          if (!type || type === "payment") {
            payments.push({
              _id: ct._id,
              type: "payment",
              email: ct.userInfo.email,
              userName: ct.userInfo.name,
              userId: ct.userId,
              paidBy: "online",
              amount: ct.amount,
              transactionId: ct.transactionId || null,
              timestamp: ct.submittedAt,
              itemType: "Coin Topup",
              itemName: `${ct.amount} Coins`,
              status: ct.status,
              requestId: ct._id.toString(),
            });
          }
        });
      }
    }

    // ─── 3. COIN LEDGER TRANSACTIONS (Admin adds & Coin refunds) ──────────────

    if (!paidBy || paidBy === "coin") {
      const ledgerMatch = {};
      const ledgerLookupMatch = {};

      if (email) {
        ledgerLookupMatch.$or = [
          { "userInfo.email": { $regex: email, $options: "i" } },
        ];
      }

      const ledgerPipeline = [
        { $match: ledgerMatch },
        { $unwind: "$transactions" },
        { $addFields: { userObjectId: { $toObjectId: "$userId" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
      ];

      if (email) {
        ledgerPipeline.push({
          $match: {
            "userInfo.email": { $regex: email, $options: "i" },
          },
        });
      }

      if (dateFrom || dateTo) {
        const dateFilter = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        ledgerPipeline.push({
          $match: { "transactions.timestamp": dateFilter },
        });
      }

      const ledgers = await db
        .collection("coin_ledger")
        .aggregate(ledgerPipeline)
        .toArray();

      ledgers.forEach((ledger) => {
        const tx = ledger.transactions;
        // Only include relevant transaction types
        if (
          tx.type === "admin_add" ||
          tx.type === "coin_deduction" ||
          tx.type === "refund"
        ) {
          if (!type || type === "admin_coin_add" || type === "coin_refund") {
            let txType = "payment";
            if (tx.type === "admin_add") txType = "admin_coin_add";
            else if (tx.type === "refund") txType = "coin_refund";

            if (!type || type === txType) {
              payments.push({
                _id: ledger._id,
                type: txType,
                email: ledger.userInfo.email,
                userName: ledger.userInfo.name,
                userId: ledger.userId,
                paidBy: "coin",
                amount: tx.amount,
                transactionId: null,
                timestamp: tx.timestamp,
                itemType: "Coin",
                itemName: tx.description || `${tx.amount} Coins`,
                status: tx.type === "admin_add" ? "Added" : "Refunded",
                ledgerId: ledger._id.toString(),
              });
            }
          }
        }
      });
    }

    // ─── 4. SORT & PAGINATE ─────────────────────────────────────────────────────

    payments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = payments.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginatedPayments = payments.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum,
    );

    res.json({
      history: paginatedPayments,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── BOOKING MANAGEMENT ──────────────────────────────────────────────────────────

// PATCH /api/admin/bookings/:id/reschedule — Change booking dates
router.patch(
  "/bookings/:id/reschedule",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });

      const { checkIn, checkOut, pickupDate, returnDate } = req.body;
      const db = await getDb();

      const booking = await db
        .collection("bookings")
        .findOne({ _id: new ObjectId(req.params.id) });

      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      let newCheckIn, newCheckOut;

      if (booking.type === "hotel") {
        if (!checkIn || !checkOut)
          return res
            .status(400)
            .json({ message: "checkIn and checkOut required for hotel" });
        newCheckIn = new Date(checkIn);
        newCheckOut = new Date(checkOut);
        if (isNaN(newCheckIn) || isNaN(newCheckOut))
          return res.status(400).json({ message: "Invalid dates" });
        if (newCheckOut <= newCheckIn)
          return res
            .status(400)
            .json({ message: "checkOut must be after checkIn" });

        // Check if new dates conflict with other bookings in same room
        const conflicts = await db.collection("bookings").findOne({
          _id: { $ne: new ObjectId(req.params.id) },
          roomId: booking.roomId,
          status: { $in: ["confirmed", "pending"] },
          checkOut: { $gt: newCheckIn },
          checkIn: { $lt: newCheckOut },
        });

        if (conflicts) {
          return res.status(409).json({
            message: "New dates conflict with another booking for this room",
          });
        }
      } else if (booking.type === "car") {
        if (!pickupDate || !returnDate)
          return res
            .status(400)
            .json({ message: "pickupDate and returnDate required for car" });
        newCheckIn = new Date(pickupDate);
        newCheckOut = new Date(returnDate);
        if (isNaN(newCheckIn) || isNaN(newCheckOut))
          return res.status(400).json({ message: "Invalid dates" });
        if (newCheckOut <= newCheckIn)
          return res
            .status(400)
            .json({ message: "returnDate must be after pickupDate" });

        // Check if new dates conflict with other bookings for same car
        const conflicts = await db.collection("bookings").findOne({
          _id: { $ne: new ObjectId(req.params.id) },
          carId: booking.carId,
          status: { $in: ["confirmed", "pending"] },
          returnDate: { $gt: newCheckIn },
          pickupDate: { $lt: newCheckOut },
        });

        if (conflicts) {
          return res.status(409).json({
            message: "New dates conflict with another booking for this car",
          });
        }
      }

      // Update booking
      const updateData = {
        rescheduledAt: new Date(),
        rescheduledBy: req.user.id,
      };

      if (booking.type === "hotel") {
        updateData.checkIn = newCheckIn;
        updateData.checkOut = newCheckOut;
      } else {
        updateData.pickupDate = newCheckIn;
        updateData.returnDate = newCheckOut;
      }

      await db
        .collection("bookings")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });

      res.json({
        message: "Booking rescheduled successfully",
        bookingId: req.params.id,
        newDates:
          booking.type === "hotel"
            ? { checkIn: newCheckIn, checkOut: newCheckOut }
            : { pickupDate: newCheckIn, returnDate: newCheckOut },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// GET /api/admin/todays-bookings — Get all bookings and blocks for today
router.get("/todays-bookings", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ─── HOTEL BOOKINGS FOR TODAY ──────────────────────────────────────

    const hotelBookings = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            type: "hotel",
            status: { $in: ["confirmed", "pending"] },
            $or: [
              { checkIn: { $gte: today, $lt: tomorrow } }, // Check-in today
              {
                checkOut: { $gt: today, $lte: tomorrow },
              }, // Check-out today
              {
                checkIn: { $lt: today },
                checkOut: { $gt: today },
              }, // Ongoing
            ],
          },
        },
        { $addFields: { userObjectId: { $toObjectId: "$userId" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $addFields: { roomObjectId: { $toObjectId: "$roomId" } } },
        {
          $lookup: {
            from: "rooms",
            localField: "roomObjectId",
            foreignField: "_id",
            as: "roomInfo",
          },
        },
        { $unwind: { path: "$roomInfo", preserveNullAndEmptyArrays: true } },
        { $addFields: { hotelObjectId: { $toObjectId: "$hotelId" } } },
        {
          $lookup: {
            from: "hotels",
            localField: "hotelObjectId",
            foreignField: "_id",
            as: "hotelInfo",
          },
        },
        { $unwind: { path: "$hotelInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userObjectId: 0,
            roomObjectId: 0,
            hotelObjectId: 0,
            "roomInfo.images": 0,
            "roomInfo.blockedDates": 0,
          },
        },
      ])
      .toArray();

    // ─── CAR BOOKINGS FOR TODAY ──────────────────────────────────────

    const carBookings = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            type: "car",
            status: { $in: ["confirmed", "pending"] },
            $or: [
              { pickupDate: { $gte: today, $lt: tomorrow } }, // Pickup today
              {
                returnDate: { $gt: today, $lte: tomorrow },
              }, // Return today
              {
                pickupDate: { $lt: today },
                returnDate: { $gt: today },
              }, // Ongoing
            ],
          },
        },
        { $addFields: { userObjectId: { $toObjectId: "$userId" } } },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $addFields: { carObjectId: { $toObjectId: "$carId" } } },
        {
          $lookup: {
            from: "cars",
            localField: "carObjectId",
            foreignField: "_id",
            as: "carInfo",
          },
        },
        { $unwind: { path: "$carInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userObjectId: 0,
            carObjectId: 0,
            "carInfo.images": 0,
          },
        },
      ])
      .toArray();

    // ─── BLOCKED DATES FOR TODAY ──────────────────────────────────────

    const rooms = await db
      .collection("rooms")
      .aggregate([
        {
          $match: {
            blockedDates: {
              $elemMatch: {
                checkIn: { $lt: tomorrow },
                checkOut: { $gt: today },
              },
            },
          },
        },
        { $addFields: { hotelObjectId: { $toObjectId: "$hotelId" } } },
        {
          $lookup: {
            from: "hotels",
            localField: "hotelObjectId",
            foreignField: "_id",
            as: "hotelInfo",
          },
        },
        { $unwind: { path: "$hotelInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            images: 0,
            hotelObjectId: 0,
          },
        },
      ])
      .toArray();

    const blockedDates = [];
    rooms.forEach((room) => {
      room.blockedDates?.forEach((block) => {
        if (block.checkIn < tomorrow && block.checkOut > today) {
          blockedDates.push({
            roomId: room._id,
            roomNumber: room.roomNumber,
            hotelName: room.hotelInfo?.name,
            hotelId: room.hotelId,
            checkIn: block.checkIn,
            checkOut: block.checkOut,
            blockId: block._id,
          });
        }
      });
    });

    res.json({
      today: today.toISOString().split("T")[0],
      hotelBookings,
      carBookings,
      blockedDates,
      summary: {
        hotelCheckIn: hotelBookings.filter((b) => {
          const checkInDate = new Date(b.checkIn);
          checkInDate.setHours(0, 0, 0, 0);
          return checkInDate.getTime() === today.getTime();
        }).length,
        hotelCheckOut: hotelBookings.filter((b) => {
          const checkOutDate = new Date(b.checkOut);
          checkOutDate.setHours(0, 0, 0, 0);
          return checkOutDate.getTime() === today.getTime();
        }).length,
        carPickup: carBookings.filter((b) => {
          const pickupDate = new Date(b.pickupDate);
          pickupDate.setHours(0, 0, 0, 0);
          return pickupDate.getTime() === today.getTime();
        }).length,
        carReturn: carBookings.filter((b) => {
          const returnDate = new Date(b.returnDate);
          returnDate.setHours(0, 0, 0, 0);
          return returnDate.getTime() === today.getTime();
        }).length,
        blockedRooms: blockedDates.length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Old endpoint removed - use new /add-coins endpoint instead
// Kept comment for reference:
// Previous: POST /api/admin/users/:userId/add-coins — Manually add coins to user wallet
// New: POST /api/admin/add-coins — Add coins after email search

module.exports = router;
