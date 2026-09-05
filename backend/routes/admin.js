const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getDb } = require("../db");
const { delCache } = require("../cache");
const { ObjectId } = require("mongodb");
const { auth, role } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { sendVerificationEmail } = require("../utils/emailService");
const {
  applyDiscountToPrice,
  normalizeDateDiscounts,
} = require("../utils/pricing");

// Utility to escape user input when building a RegExp for MongoDB queries
function escapeRegex(input = "") {
  const s = String(input).slice(0, 200); // limit length to avoid ReDoS
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const adminAuth = [auth, role("admin")];

function getUploadedFiles(files) {
  if (Array.isArray(files)) return files;
  if (!files || typeof files !== "object") return [];
  return Object.values(files).flat();
}

async function invalidateHotelCaches(hotelId = null) {
  if (hotelId) await delCache(`hotel:${hotelId}`);
  for (let page = 1; page <= 10; page += 1) {
    await delCache(`hotels:list:${page}:20`);
  }
}

// Helper function to delete image files from /uploads
function deleteImageFiles(imageUrls) {
  if (!imageUrls || !Array.isArray(imageUrls)) return;
  imageUrls.forEach((url) => {
    if (url && typeof url === "string" && url.startsWith("/uploads/")) {
      const filename = path.basename(url);
      const filepath = path.join(__dirname, "..", "uploads", filename);
      fs.unlink(filepath, (err) => {
        if (err && err.code !== "ENOENT")
          console.error(`Failed to delete file ${filepath}:`, err.message);
      });
    }
  });
}

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    }
  } catch {}

  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseNumberValue(value, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseRoomDiscounts(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return normalizeDateDiscounts(value);
}

function normalizeHotelPayload(body, uploadedImages = []) {
  const hotelImages = [
    ...uploadedImages.map((file) => `/uploads/${file.filename}`),
    ...parseArrayValue(body.images || body.image || []),
  ].filter(Boolean);

  const facilityDetails = parseJsonObject(body.facilitiesDetails, {});
  const policy = parseJsonObject(body.policy, {});
  const location = parseJsonObject(body.location, {});
  const review = parseJsonObject(body.review, {});

  return {
    name: String(body.name || "").trim(),
    propertyType: body.propertyType || "Hotel",
    starRating: body.starRating || "3 Star",
    review: {
      rating: parseNumberValue(review.rating ?? body.reviewRating, 0),
      totalReviews: parseNumberValue(
        review.totalReviews ?? body.reviewTotalReviews,
        0,
      ),
    },
    area: body.area || "",
    description: body.description || "",
    totalRooms: parseNumberValue(body.totalRooms, 0),
    numberOfFloors: parseNumberValue(body.numberOfFloors, 0),
    checkIn: body.checkIn || "14:00",
    checkOut: body.checkOut || "12:00",
    image: hotelImages,
    images: hotelImages,
    location: {
      name: location.name || body.locationName || body.area || "",
      googleMapLink: location.googleMapLink || body.googleMapLink || "",
    },
    touristspot: body.touristspot || location.name || body.area || "",
    whatsNearby: parseArrayValue(body.whatsNearby),
    services: parseArrayValue(body.services),
    facilitiesDetails: facilityDetails,
    policy,
    propertyAccepts: parseArrayValue(body.propertyAccepts),
    discountPercentage: parseNumberValue(body.discountPercentage, 0),
    isActive:
      body.isActive !== undefined ? String(body.isActive) !== "false" : true,
    updatedAt: new Date(),
  };
}

function normalizeRoomPayload(body, hotelId, uploadedImages = []) {
  const roomImages = [
    ...uploadedImages.map((file) => `/uploads/${file.filename}`),
    ...parseArrayValue(body.images || body.image || []),
  ].filter(Boolean);

  const basePrice = parseNumberValue(body.price ?? body.basePrice, 0);
  const discountPercent = parseNumberValue(body.discountPercentage, 0);
  const effectivePricing = applyDiscountToPrice(basePrice, discountPercent);
  const roomFacilities = parseJsonObject(body.facilities, {});

  return {
    hotelId,
    roomNumber: String(body.roomNumber || "").trim(),
    roomCategory: body.roomCategory || body.name || "Standard Room",
    numberOfRooms: parseNumberValue(body.numberOfRooms, 1),
    roomType: body.roomType || "Standard",
    bedType: body.bedType || "Queen Bed",
    roomSize: body.roomSize || "",
    roomView: body.roomView || "City View",
    roomCharacteristics: parseArrayValue(body.roomCharacteristics),
    smokingPolicy: body.smokingPolicy || "non",
    adultOccupancy: parseNumberValue(body.adultOccupancy ?? body.maxGuests, 2),
    complementaryChildOccupancy: parseNumberValue(
      body.complementaryChildOccupancy,
      1,
    ),
    maximumGuestsAllowed: parseNumberValue(
      body.maximumGuestsAllowed ?? body.maxGuests,
      3,
    ),
    onDemandExtraBed: parseNumberValue(body.onDemandExtraBed, 0),
    price: basePrice,
    basePrice,
    taxesAndFees: parseNumberValue(body.taxesAndFees, 0),
    mealPlan: body.mealPlan || "Breakfast Included",
    discounts: parseRoomDiscounts(body.discounts),
    discountPercentage: discountPercent,
    effectivePrice: effectivePricing.price,
    services: parseArrayValue(body.services),
    facilities: roomFacilities,
    images: roomImages,
    isAvailable:
      body.isAvailable !== undefined
        ? String(body.isAvailable) !== "false"
        : true,
    isActive:
      body.isActive !== undefined ? String(body.isActive) !== "false" : true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function findBookingAcrossCollections(db, bookingId) {
  const objectId = new ObjectId(bookingId);

  const legacyBooking = await db
    .collection("bookings")
    .findOne({ _id: objectId });
  if (legacyBooking) {
    return { booking: legacyBooking, collection: db.collection("bookings") };
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

  return { booking: null, collection: null };
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
      name: staffName.trim(),
      email: email.toLowerCase(),
      password: hashed,
      role: "hotel_staff",
      hotelId: hotel._id.toString(),
      hotelName: hotel.name,
      emailVerified: true,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Staff account created successfully",
      id: staffResult.insertedId,
      emailVerified: true,
    });
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
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Hotel name is required" });
      }

      const db = await getDb();
      const hotelData = normalizeHotelPayload(
        req.body,
        getUploadedFiles(req.files),
      );

      const result = await db.collection("hotels").insertOne({
        ...hotelData,
        createdAt: new Date(),
      });

      await invalidateHotelCaches();
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
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });

      const db = await getDb();
      const existingHotel = await db
        .collection("hotels")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!existingHotel)
        return res.status(404).json({ message: "Hotel not found" });
      const uploadedImages = getUploadedFiles(req.files);
      const update = normalizeHotelPayload(req.body, uploadedImages);
      if (!uploadedImages.length && !req.body.images && !req.body.image) {
        update.image = existingHotel.image || null;
        update.images =
          existingHotel.images ||
          (existingHotel.image ? [existingHotel.image] : []);
      }

      await db
        .collection("hotels")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
      await invalidateHotelCaches(req.params.id);
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
    await invalidateHotelCaches(req.params.id);
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
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });

      if (!req.body.roomNumber && !req.body.roomCategory) {
        return res
          .status(400)
          .json({ message: "roomNumber or roomCategory is required" });
      }

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

      const roomData = normalizeRoomPayload(
        req.body,
        req.params.id,
        getUploadedFiles(req.files),
      );
      const result = await db.collection("rooms").insertOne(roomData);

      await invalidateHotelCaches(req.params.id);
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
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid id" });

      const db = await getDb();
      const existingRoom = await db
        .collection("rooms")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!existingRoom)
        return res.status(404).json({ message: "Room not found" });
      const uploadedImages = getUploadedFiles(req.files);

      const update = normalizeRoomPayload(
        req.body,
        existingRoom?.hotelId || req.body.hotelId,
        uploadedImages,
      );
      if (!uploadedImages.length && !req.body.images && !req.body.image) {
        update.images =
          existingRoom.images ||
          (existingRoom.image ? [existingRoom.image] : []);
      }

      await db
        .collection("rooms")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
      await invalidateHotelCaches(existingRoom?.hotelId || req.body.hotelId);
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
    const room = await db
      .collection("rooms")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!room) return res.status(404).json({ message: "Room not found" });

    await db
      .collection("bookings")
      .updateMany(
        { roomId: req.params.id, status: { $in: ["confirmed", "pending"] } },
        { $set: { status: "cancelled", refundStatus: "in_progress" } },
      );
    await db
      .collection("rooms")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    await invalidateHotelCaches(room?.hotelId);
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
    await invalidateHotelCaches(room.hotelId);
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
    const room = await db
      .collection("rooms")
      .findOne({ _id: new ObjectId(req.params.id) });
    await invalidateHotelCaches(room?.hotelId);
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
    const room = await db
      .collection("rooms")
      .findOne({ _id: new ObjectId(req.params.id) });
    await invalidateHotelCaches(room?.hotelId);
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
      const room = await db
        .collection("rooms")
        .findOne({ _id: new ObjectId(req.params.id) });
      await invalidateHotelCaches(room?.hotelId);
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
        const bookedSeats = await db
          .collection("bookings")
          .aggregate([
            {
              $match: {
                carId: car._id.toString(),
                type: "car",
                status: { $in: ["confirmed", "pending"] },
                returnDate: { $gte: now },
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
        const totalBooked = bookedSeats[0]?.total || 0;
        return {
          ...car,
          bookedSeats: totalBooked,
          availableSeats: Math.max(
            0,
            (car.quantity || car.totalSeats || 0) - totalBooked,
          ),
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
      const {
        name,
        type,
        seats,
        transmission,
        fuel,
        price,
        totalSeats,
        places,
        discountPercentage,
      } = req.body;
      if (!name || !price || !totalSeats) {
        return res
          .status(400)
          .json({ message: "name, price, totalSeats are required" });
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
      const basePrice = parseFloat(price) || 0;
      const discount = Number(discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(basePrice, discount);
      const db = await getDb();
      const result = await db.collection("cars").insertOne({
        name,
        type: type || "Sedan",
        seats: parseInt(seats) || 5,
        transmission: transmission || "Automatic",
        fuel: fuel || "Petrol",
        price: basePrice,
        basePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        totalSeats: parseInt(totalSeats),
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
      const {
        name,
        type,
        seats,
        transmission,
        fuel,
        price,
        totalSeats,
        places,
        discountPercentage,
      } = req.body;
      const db = await getDb();

      // Get existing car to delete old images if new ones are uploaded
      const existingCar = await db
        .collection("cars")
        .findOne({ _id: new ObjectId(req.params.id) });

      const basePrice = parseFloat(price) || 0;
      const discount = Number(discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(basePrice, discount);
      const update = {
        name,
        type,
        seats: parseInt(seats),
        transmission,
        fuel,
        price: basePrice,
        basePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        totalSeats: parseInt(totalSeats),
        places: places
          ? places
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      };

      // If new images are uploaded, delete old ones
      if (req.files && req.files.length > 0) {
        if (existingCar?.images) {
          deleteImageFiles(existingCar.images);
        }
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

    // Get car before deleting to retrieve image paths
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(req.params.id) });

    // Delete associated images from filesystem
    if (car?.images) {
      deleteImageFiles(car.images);
    }

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
      hotelId,
      viewMode = "upcoming", // "upcoming" = today+future (default), "past" = before today, "all" = no filter
      dateField = "checkin",
    } = req.query;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get bookings
    const bookingsPipeline = [];

    // Add computed startDate field (pickupDate for cars, checkIn for hotels, travelDate for packages)
    bookingsPipeline.push({
      $addFields: {
        startDate: { $ifNull: ["$pickupDate", "$checkIn", "$travelDate"] },
      },
    });

    // Build initial match
    const bookingsMatch = {};
    if (type && type !== "coin_topup") {
      if (type === "package" || type === "holiday") {
        bookingsMatch.type = { $in: ["package", "holiday"] };
      } else {
        bookingsMatch.type = type;
      }
    }
    if (status) bookingsMatch.status = status;

    // Date filtering based on viewMode
    if (viewMode === "upcoming") {
      if (dateField === "booking") {
        bookingsMatch.createdAt = { $gte: today };
      } else {
        bookingsMatch.startDate = { $gte: today };
      }
    } else if (viewMode === "past") {
      if (dateField === "booking") {
        bookingsMatch.createdAt = { $lt: today };
      } else {
        bookingsMatch.startDate = { $lt: today };
      }
    }
    // Filter by hotelId when provided
    if (hotelId && isValidObjectId(hotelId)) {
      bookingsMatch.hotelId = hotelId;
    }
    // If viewMode === "all", no date filter applied

    // Date range filter (custom range overrides viewMode)
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      if (dateField === "booking") {
        bookingsMatch.createdAt = dateFilter;
      } else {
        bookingsMatch.startDate = dateFilter;
      }
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
        userPhone: {
          $ifNull: [
            "$contactNumber",
            "$guestDetails.contactNumber",
            { $arrayElemAt: ["$userInfo.phone", 0] },
            "",
          ],
        },
        userNid: {
          $ifNull: [
            "$guestDetails.nidNumber",
            "$nidNumber",
            { $arrayElemAt: ["$userInfo.nidNumber", 0] },
            "",
          ],
        },
      },
    });

    bookingsPipeline.push({
      $lookup: {
        from: "manual_payments",
        let: { bookingId: { $toString: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$bookingId", "$$bookingId"] } } },
          { $sort: { submittedAt: -1 } },
          { $limit: 1 },
        ],
        as: "manualPayment",
      },
    });

    bookingsPipeline.push({
      $addFields: {
        manualPayment: { $arrayElemAt: ["$manualPayment", 0] },
        transactionId: {
          $ifNull: ["$transactionId", "$manualPayment.transactionId"],
        },
        paymentMethod: {
          $ifNull: ["$paymentMethod", "$manualPayment.paymentMethod"],
        },
        screenshot: {
          $ifNull: ["$screenshot", "$manualPayment.screenshot"],
        },
      },
    });

    // Search by user name or item name for bookings
    const searchFilters = [];
    if (search) {
      const esc = escapeRegex(search);
      searchFilters.push({ userName: { $regex: esc, $options: "i" } });
      searchFilters.push({ userEmail: { $regex: esc, $options: "i" } });
      searchFilters.push({ userNid: { $regex: esc, $options: "i" } });
      searchFilters.push({ userPhone: { $regex: esc, $options: "i" } });
      searchFilters.push({ carName: { $regex: esc, $options: "i" } });
      searchFilters.push({ hotelName: { $regex: esc, $options: "i" } });
      searchFilters.push({ packageName: { $regex: esc, $options: "i" } });
      bookingsPipeline.push({ $match: { $or: searchFilters } });
    }

    // Remove internals from bookings
    bookingsPipeline.push({ $project: { userInfo: 0, userObjectId: 0 } });

    const bookings = await db
      .collection("bookings")
      .aggregate(bookingsPipeline)
      .toArray();

    // Get car rentals
    let carRentals = [];
    if (!type || type === "car") {
      const carMatch = {};
      if (status) carMatch.status = status;

      // Add startDate for filtering
      const carPipeline = [
        {
          $addFields: {
            startDate: "$pickupDate",
          },
        },
      ];

      if (viewMode === "upcoming") {
        if (dateField === "booking") {
          carMatch.createdAt = { $gte: today };
        } else {
          carMatch.pickupDate = { $gte: today };
        }
      } else if (viewMode === "past") {
        if (dateField === "booking") {
          carMatch.createdAt = { $lt: today };
        } else {
          carMatch.pickupDate = { $lt: today };
        }
      }

      if (dateFrom || dateTo) {
        const dateFilter = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        if (dateField === "booking") {
          carMatch.createdAt = dateFilter;
        } else {
          carMatch.pickupDate = dateFilter;
        }
      }

      carPipeline.push({ $match: carMatch });

      // Lookup user info
      carPipeline.push({
        $addFields: { userObjectId: { $toObjectId: "$userId" } },
      });
      carPipeline.push({
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "userInfo",
        },
      });
      carPipeline.push({
        $addFields: {
          userName: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.name", 0] }, "Unknown"],
          },
          userEmail: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.email", 0] }, ""],
          },
          userPhone: {
            $ifNull: [
              "$contactNumber",
              { $arrayElemAt: ["$userInfo.phone", 0] },
              "",
            ],
          },
          userNid: {
            $ifNull: [
              "$nidNumber",
              { $arrayElemAt: ["$userInfo.nidNumber", 0] },
              "",
            ],
          },
        },
      });
      carPipeline.push({
        $lookup: {
          from: "manual_payments",
          let: { bookingId: { $toString: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$bookingId", "$$bookingId"] } } },
            { $sort: { submittedAt: -1 } },
            { $limit: 1 },
          ],
          as: "manualPayment",
        },
      });
      carPipeline.push({
        $addFields: {
          manualPayment: { $arrayElemAt: ["$manualPayment", 0] },
          transactionId: {
            $ifNull: ["$transactionId", "$manualPayment.transactionId"],
          },
          paymentMethod: {
            $ifNull: ["$paymentMethod", "$manualPayment.paymentMethod"],
          },
          screenshot: { $ifNull: ["$screenshot", "$manualPayment.screenshot"] },
        },
      });
      carPipeline.push({ $project: { userInfo: 0, userObjectId: 0 } });

      carRentals = await db
        .collection("carrentBookings")
        .aggregate(carPipeline)
        .toArray();
    }

    // Get bus bookings
    let busBookings = [];
    if (!type || type === "bus") {
      const busMatch = {};
      if (status) busMatch.status = status;

      const busPipeline = [
        {
          $addFields: {
            startDate: "$travelDate",
          },
        },
      ];

      if (viewMode === "upcoming") {
        if (dateField === "booking") {
          busMatch.createdAt = { $gte: today };
        } else {
          busMatch.travelDate = { $gte: today };
        }
      } else if (viewMode === "past") {
        if (dateField === "booking") {
          busMatch.createdAt = { $lt: today };
        } else {
          busMatch.travelDate = { $lt: today };
        }
      }

      if (dateFrom || dateTo) {
        const dateFilter = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        if (dateField === "booking") {
          busMatch.createdAt = dateFilter;
        } else {
          busMatch.travelDate = dateFilter;
        }
      }

      busPipeline.push({ $match: busMatch });

      // Lookup user info
      busPipeline.push({
        $addFields: { userObjectId: { $toObjectId: "$userId" } },
      });
      busPipeline.push({
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "userInfo",
        },
      });
      busPipeline.push({
        $addFields: {
          userName: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.name", 0] }, "Unknown"],
          },
          userEmail: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.email", 0] }, ""],
          },
          userPhone: {
            $ifNull: [
              "$contactNumber",
              { $arrayElemAt: ["$userInfo.phone", 0] },
              "",
            ],
          },
          userNid: {
            $ifNull: [
              "$nidNumber",
              { $arrayElemAt: ["$userInfo.nidNumber", 0] },
              "",
            ],
          },
        },
      });
      busPipeline.push({
        $lookup: {
          from: "manual_payments",
          let: { bookingId: { $toString: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$bookingId", "$$bookingId"] } } },
            { $sort: { submittedAt: -1 } },
            { $limit: 1 },
          ],
          as: "manualPayment",
        },
      });
      busPipeline.push({
        $addFields: {
          manualPayment: { $arrayElemAt: ["$manualPayment", 0] },
        },
      });
      busPipeline.push({ $project: { userInfo: 0, userObjectId: 0 } });

      busBookings = await db
        .collection("busBookings")
        .aggregate(busPipeline)
        .toArray();
    }

    // Get coin topups if type filter is not set or is coin_topup
    let coinTopups = [];
    if (!type || type === "coin_topup") {
      const coinMatch = {};
      if (status) coinMatch.status = status;

      // Apply viewMode filter to coin topups
      if (viewMode === "upcoming") {
        if (dateField === "booking") {
          coinMatch.submittedAt = { $gte: today };
        } else {
          coinMatch.submittedAt = { $gte: today };
        }
      } else if (viewMode === "past") {
        if (dateField === "booking") {
          coinMatch.submittedAt = { $lt: today };
        } else {
          coinMatch.submittedAt = { $lt: today };
        }
      }

      // Date range filter overrides viewMode
      if (dateFrom || dateTo) {
        const dateFilter = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
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
            userPhone: user?.phone || "",
            userNid: user?.nidNumber || "",
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
            ct.userNid?.toLowerCase().includes(q) ||
            ct.userPhone?.toLowerCase().includes(q) ||
            "coin topup".includes(q),
        );
      }
    }

    // Merge and sort
    let allItems = [...bookings, ...carRentals, ...busBookings, ...coinTopups];

    // Filter by search if provided
    if (search) {
      const q = search.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.userName?.toLowerCase().includes(q) ||
          item.userEmail?.toLowerCase().includes(q) ||
          item.userNid?.toLowerCase().includes(q) ||
          item.userPhone?.toLowerCase().includes(q) ||
          item.carName?.toLowerCase().includes(q) ||
          item.hotelName?.toLowerCase().includes(q) ||
          item.busName?.toLowerCase().includes(q) ||
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

    // ✅ Auto-calculate and initiate refund when cancelling
    const refundAmount = booking.totalAmount || 0;
    const now = new Date();

    await db.collection("bookings").updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          status: "cancelled",
          refundStatus: "in_progress",
          refundAmount: parseFloat(refundAmount),
          refundInitiatedAt: now,
          refundInitiatedBy: req.user.id,
          cancelledAt: now,
        },
      },
    );

    // Notify user via socket
    const io = req.app.get("io");
    io.to(`user-${booking.userId}`).emit("booking-cancelled", {
      bookingId: req.params.id,
      refundAmount: refundAmount,
      refundStatus: "in_progress",
    });

    // Notify car/hotel watchers
    if (booking.type === "car") {
      io.to("cars-room").emit("car-available", { carId: booking.carId });
    } else {
      io.to(`hotel-${booking.hotelId}`).emit("room-available", {
        roomId: booking.roomId,
      });
    }

    res.json({
      message: "Booking cancelled and refund initiated",
      refundAmount: refundAmount,
      refundStatus: "in_progress",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bookings/:id/initiate-refund — initiate refund for cancelled booking
router.post(
  "/bookings/:id/initiate-refund",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { refundAmount } = req.body;

      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      if (!refundAmount || refundAmount <= 0) {
        return res.status(400).json({
          message: "Refund amount is required and must be greater than 0",
        });
      }

      const db = await getDb();
      const { booking, collection } = await findBookingAcrossCollections(
        db,
        req.params.id,
      );

      if (!booking || !collection) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "cancelled") {
        return res.status(400).json({
          message: "Only cancelled bookings can have refunds initiated",
        });
      }

      if (booking.refundStatus && booking.refundStatus !== "pending") {
        return res
          .status(400)
          .json({ message: "Refund already initiated or completed" });
      }

      // Update booking with refund amount and set status to in_progress
      await collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            refundStatus: "in_progress",
            refundAmount: parseFloat(refundAmount),
            refundInitiatedAt: new Date(),
            refundInitiatedBy: req.user.id,
          },
        },
      );

      // Emit socket event to user
      try {
        const serverModule = require("../server");
        if (serverModule && serverModule.io) {
          const userIdStr = booking.userId.toString
            ? booking.userId.toString()
            : booking.userId;
          serverModule.io.to(`user-${userIdStr}`).emit("refund-initiated", {
            bookingId: req.params.id,
            refundAmount: parseFloat(refundAmount),
          });
        }
      } catch (err) {
        console.log("Socket emit failed (non-critical):", err.message);
      }

      res.json({
        message: "Refund initiated",
        booking: {
          _id: booking._id,
          refundStatus: "in_progress",
          refundAmount: parseFloat(refundAmount),
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

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
      const { booking, collection } = await findBookingAcrossCollections(
        db,
        req.params.id,
      );
      if (!booking || !collection)
        return res.status(404).json({ message: "Booking not found" });
      if (booking.refundStatus !== "in_progress") {
        return res
          .status(400)
          .json({ message: "Booking is not in refund-pending state" });
      }

      const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : null;

      await collection.updateOne(
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

    // Count total bookings from all sources (exclude staff-sourced bookings for admin-facing counts)
    const hotelBookingsCount = await db
      .collection("bookings")
      .countDocuments({ status: "confirmed", source: { $ne: "staff" } });
    const carBookingsCount = await db
      .collection("carrentBookings")
      .countDocuments({ status: "confirmed" });
    const busBookingsCount = await db
      .collection("busBookings")
      .countDocuments({ status: "confirmed" });
    const totalBookings =
      hotelBookingsCount + carBookingsCount + busBookingsCount;

    const [
      totalHotels,
      totalCars,
      totalUsers,
      revenueResult,
      refundedResult,
      todayRevenueResult,
      todayCanceledResult,
      coinTopupRevenueResult,
      todayCoinTopupRevenueResult,
      carRevenueResult,
      busRevenueResult,
      carTodayRevenueResult,
      busTodayRevenueResult,
    ] = await Promise.all([
      db.collection("hotels").countDocuments({ isActive: { $ne: false } }),
      db.collection("cars").countDocuments({ isActive: { $ne: false } }),
      db.collection("users").countDocuments({ role: "user" }),
      // Total revenue from confirmed bookings (EXCLUDE coin-paid bookings and staff-created bookings)
      db
        .collection("bookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              paidWithCoins: { $ne: true }, // Exclude bookings paid with coins
              source: { $ne: "staff" }, // Exclude bookings created by staff (offline)
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Total refunded amount (EXCLUDE coin-paid bookings and refunds for staff-created bookings)
      db
        .collection("bookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              refundStatus: "completed",
              paidWithCoins: { $ne: true }, // Exclude coin-paid bookings
              source: { $ne: "staff" }, // Exclude staff bookings
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Today's revenue (EXCLUDE coin-paid bookings and staff-created bookings)
      db
        .collection("bookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              paidAt: { $gte: today, $lt: tomorrow },
              paidWithCoins: { $ne: true }, // Exclude coin-paid bookings
              source: { $ne: "staff" }, // Exclude staff bookings
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
      // Total revenue from car rentals
      db
        .collection("carrentBookings")
        .aggregate([
          { $match: { status: "confirmed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Total revenue from bus bookings
      db
        .collection("busBookings")
        .aggregate([
          { $match: { status: "confirmed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Today's revenue from car rentals
      db
        .collection("carrentBookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              paidAt: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
      // Today's revenue from bus bookings
      db
        .collection("busBookings")
        .aggregate([
          {
            $match: {
              status: "confirmed",
              createdAt: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray(),
    ]);

    const bookingRevenue = revenueResult[0]?.total || 0;
    const refundedTotal = refundedResult[0]?.total || 0;
    const coinTopupRevenue = coinTopupRevenueResult[0]?.total || 0;
    const carRevenue = carRevenueResult[0]?.total || 0;
    const busRevenue = busRevenueResult[0]?.total || 0;
    const totalRevenue =
      bookingRevenue + coinTopupRevenue + carRevenue + busRevenue;
    const netRevenue = totalRevenue - refundedTotal;
    const todayBookingRevenue = todayRevenueResult[0]?.total || 0;
    const todayCarRevenue = carTodayRevenueResult[0]?.total || 0;
    const todayBusRevenue = busTodayRevenueResult[0]?.total || 0;
    const todayCoinTopupRevenue = todayCoinTopupRevenueResult[0]?.total || 0;
    const todayRevenue =
      todayBookingRevenue +
      todayCoinTopupRevenue +
      todayCarRevenue +
      todayBusRevenue;

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
      userMatch.$or = [
        { "userInfo.email": { $regex: escapeRegex(email), $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setUTCHours(23, 59, 59, 999);
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
      const escEmail = escapeRegex(email);
      bookingPipeline.push({
        $match: {
          "userInfo.email": { $regex: escEmail, $options: "i" },
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
          const escEmail = escapeRegex(email);
          coinTopupPipeline.push({
            $match: {
              "userInfo.email": { $regex: escEmail, $options: "i" },
            },
          });
        }

        if (dateFrom || dateTo) {
          const dateFilter = {};
          if (dateFrom) dateFilter.$gte = new Date(dateFrom);
          if (dateTo) {
            const end = new Date(dateTo);
            end.setUTCHours(23, 59, 59, 999);
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
        const escEmail = escapeRegex(email);
        ledgerLookupMatch.$or = [
          { "userInfo.email": { $regex: escEmail, $options: "i" } },
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
        const escEmail = escapeRegex(email);
        ledgerPipeline.push({
          $match: {
            "userInfo.email": { $regex: escEmail, $options: "i" },
          },
        });
      }

      if (dateFrom || dateTo) {
        const dateFilter = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
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
            checkIn: { $gte: today, $lt: tomorrow }, // Check-in TODAY only
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
            pickupDate: { $gte: today, $lt: tomorrow }, // Pickup TODAY only
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
      carrentBookings: [],
      busBookings: [],
      blockedDates,
      summary: {
        hotelCheckIn: hotelBookings.length,
        hotelCheckOut: 0,
        carPickup: carBookings.length,
        carReturn: 0,
        carrentPickup: 0,
        busBookings: 0,
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

// ─── BOOKING CANCELLATION MANAGEMENT ───────────────────────────────────────────

// GET /api/admin/cancel-requests — get all pending cancel requests
router.get("/cancel-requests", auth, role("admin"), async (req, res) => {
  try {
    const db = await getDb();

    const cancelRequests = await db
      .collection("cancel_requests")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    const enriched = await Promise.all(
      cancelRequests.map(async (request) => {
        const [user, bookingLookup] = await Promise.all([
          db.collection("users").findOne({ _id: request.userId }),
          findBookingAcrossCollections(db, request.bookingId),
        ]);

        return {
          ...request,
          user,
          booking: bookingLookup.booking,
        };
      }),
    );

    res.json(enriched.filter((request) => request.user && request.booking));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/cancel-requests/:requestId/approve — approve cancel request
router.post(
  "/cancel-requests/:requestId/approve",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const db = await getDb();

      // Get cancel request
      const cancelRequest = await db
        .collection("cancel_requests")
        .findOne({ _id: new ObjectId(req.params.requestId) });

      if (!cancelRequest) {
        return res.status(404).json({ message: "Cancel request not found" });
      }

      if (cancelRequest.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Cancel request already processed" });
      }

      // Get booking
      const bookingLookup = await findBookingAcrossCollections(
        db,
        cancelRequest.bookingId,
      );
      const booking = bookingLookup.booking;
      const bookingCollection = bookingLookup.collection;

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update cancel request status
      await db.collection("cancel_requests").updateOne(
        { _id: new ObjectId(req.params.requestId) },
        {
          $set: {
            status: "approved",
            approvedAt: new Date(),
            approvedBy: req.user.id,
          },
        },
      );

      // ✅ Auto-calculate and initiate refund when approving cancellation
      const refundAmount = booking.totalAmount || 0;
      const now = new Date();

      // Update booking status to cancelled and auto-initiate refund
      await bookingCollection.updateOne(
        { _id: new ObjectId(cancelRequest.bookingId) },
        {
          $set: {
            status: "cancelled",
            refundStatus: "in_progress",
            refundAmount: parseFloat(refundAmount),
            refundInitiatedAt: now,
            refundInitiatedBy: req.user.id,
            cancelledAt: now,
            cancelledBy: "admin",
            cancelRequestId: req.params.requestId,
          },
        },
      );

      // Emit socket events
      try {
        const serverModule = require("../server");
        if (serverModule && serverModule.io) {
          // Notify admin of approval
          serverModule.io.to("admin").emit("cancel-request-approved", {
            requestId: req.params.requestId,
            bookingId: cancelRequest.bookingId.toString(),
          });

          // Notify user their cancellation was approved with refund initiated
          const userIdStr = booking.userId.toString
            ? booking.userId.toString()
            : booking.userId;
          serverModule.io.to(`user-${userIdStr}`).emit("cancel-approved", {
            bookingId: cancelRequest.bookingId.toString(),
            refundAmount: refundAmount,
            refundStatus: "in_progress",
          });
        }
      } catch (err) {
        console.log("Socket emit failed (non-critical):", err.message);
      }

      res.json({
        message: "Cancel request approved and refund initiated",
        cancelRequest: { ...cancelRequest, status: "approved" },
        refundAmount: refundAmount,
        refundStatus: "in_progress",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/cancel-requests/:requestId/reject — reject cancel request
router.post(
  "/cancel-requests/:requestId/reject",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const db = await getDb();

      // Get cancel request
      const cancelRequest = await db
        .collection("cancel_requests")
        .findOne({ _id: new ObjectId(req.params.requestId) });

      if (!cancelRequest) {
        return res.status(404).json({ message: "Cancel request not found" });
      }

      if (cancelRequest.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Cancel request already processed" });
      }

      // Get booking so we can notify the correct user even for car-rent bookings
      const bookingLookup = await findBookingAcrossCollections(
        db,
        cancelRequest.bookingId,
      );
      const booking = bookingLookup.booking;

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update cancel request status
      await db.collection("cancel_requests").updateOne(
        { _id: new ObjectId(req.params.requestId) },
        {
          $set: {
            status: "rejected",
            rejectedAt: new Date(),
            rejectionReason: req.body.reason || "",
            rejectedBy: req.user.id,
          },
        },
      );

      // Emit socket event to user
      try {
        const serverModule = require("../server");
        if (serverModule && serverModule.io) {
          const userIdStr = cancelRequest.userId.toString
            ? cancelRequest.userId.toString()
            : cancelRequest.userId;

          // Notify admin of rejection
          serverModule.io.to("admin").emit("cancel-request-rejected", {
            requestId: req.params.requestId,
            bookingId: cancelRequest.bookingId.toString(),
          });

          // Notify user their cancellation was rejected
          serverModule.io.to(`user-${userIdStr}`).emit("cancel-rejected", {
            bookingId: cancelRequest.bookingId.toString(),
            reason: req.body.reason || "",
          });
        }
      } catch (err) {
        console.log("Socket emit failed (non-critical):", err.message);
      }

      res.json({
        message: "Cancel request rejected",
        cancelRequest: { ...cancelRequest, status: "rejected" },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// POST /api/admin/bookings/:id/initiate-refund — initiate refund for cancelled booking
router.post(
  "/bookings/:id/initiate-refund",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const { refundAmount } = req.body;

      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      if (!refundAmount || refundAmount <= 0) {
        return res
          .status(400)
          .json({ message: "Refund amount must be greater than 0" });
      }

      const db = await getDb();
      const booking = await db
        .collection("bookings")
        .findOne({ _id: new ObjectId(req.params.id) });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "cancelled") {
        return res.status(400).json({
          message: "Only cancelled bookings can have refunds initiated",
        });
      }

      if (booking.refundStatus && booking.refundStatus !== "pending") {
        return res
          .status(400)
          .json({ message: "Refund already initiated or completed" });
      }

      // Update booking with refund amount and set status to in_progress
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            refundStatus: "in_progress",
            refundAmount: parseFloat(refundAmount),
            refundInitiatedAt: new Date(),
            refundInitiatedBy: req.user.id,
          },
        },
      );

      // Emit socket event to user
      try {
        const serverModule = require("../server");
        if (serverModule && serverModule.io) {
          const userIdStr = booking.userId.toString
            ? booking.userId.toString()
            : booking.userId;
          serverModule.io.to(`user-${userIdStr}`).emit("refund-initiated", {
            bookingId: req.params.id,
            refundAmount: parseFloat(refundAmount),
          });
        }
      } catch (err) {
        console.log("Socket emit failed (non-critical):", err.message);
      }

      res.json({
        message: "Refund initiated",
        booking: {
          _id: booking._id,
          refundStatus: "in_progress",
          refundAmount: parseFloat(refundAmount),
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// GET /api/admin/carrent — all cars
router.get("/carrent", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const cars = await db
      .collection("carrent")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const now = new Date();
    const enriched = await Promise.all(
      cars.map(async (car) => {
        const activeBookings = await db
          .collection("carrentBookings")
          .countDocuments({
            carId: car._id.toString(),
            status: { $in: ["confirmed", "pending"] },
            returnDate: { $gte: now },
          });
        return {
          ...car,
          bookedCount: activeBookings,
          availableCars: Math.max(0, (car.quantity || 0) - activeBookings),
        };
      }),
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/carrent — create car
router.post(
  "/carrent",
  adminAuth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        fuel,
        price,
        quantity,
        places,
        type,
        transmission,
        discountPercentage,
      } = req.body;

      if (!name || !price) {
        return res.status(400).json({ message: "Name and price are required" });
      }

      const db = await getDb();
      const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];
      const basePrice = Number(price) || 0;
      const discount = Number(discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(basePrice, discount);

      const car = {
        name,
        fuel,
        price: basePrice,
        basePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        quantity: quantity ? parseInt(quantity) : 1,
        places: places ? places.split(",").map((p) => p.trim()) : [],
        type,
        transmission,
        images,
        isActive: true,
        createdAt: new Date(),
      };

      const result = await db.collection("carrent").insertOne(car);

      res.json({
        _id: result.insertedId,
        ...car,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT /api/admin/carrent/:id — update car
router.put(
  "/carrent/:id",
  adminAuth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        fuel,
        price,
        quantity,
        places,
        type,
        transmission,
        discountPercentage,
      } = req.body;
      const db = await getDb();

      const car = await db
        .collection("carrent")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!car) return res.status(404).json({ message: "Car not found" });

      let images = car.images;
      if (req.files?.length) {
        if (car.images) {
          deleteImageFiles(car.images);
        }
        images = req.files.map((f) => `/uploads/${f.filename}`);
      }

      const basePrice =
        price !== undefined ? Number(price) || 0 : Number(car.price) || 0;
      const discount =
        discountPercentage !== undefined
          ? Number(discountPercentage || 0)
          : Number(car.discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(basePrice, discount);

      const updated = {
        name: name || car.name,
        fuel: fuel || car.fuel,
        price: basePrice,
        basePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        quantity: quantity ? parseInt(quantity) : (car.quantity ?? 1),
        places: places
          ? places.split(",").map((p) => p.trim())
          : car.places || [],
        type: type || car.type,
        transmission: transmission || car.transmission,
        images,
        updatedAt: new Date(),
      };

      await db
        .collection("carrent")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updated });

      res.json({ _id: req.params.id, ...updated });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /api/admin/carrent/:id
router.delete("/carrent/:id", adminAuth, async (req, res) => {
  try {
    const db = await getDb();

    // Get car before deleting to retrieve image paths
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(req.params.id) });

    // Delete associated images from filesystem
    if (car?.images) {
      deleteImageFiles(car.images);
    }

    const result = await db
      .collection("carrent")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Car deleted", deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/carrent/:id/toggle — toggle availability
router.patch("/carrent/:id/toggle", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const car = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    await db
      .collection("carrent")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isActive: !car.isActive } },
      );

    res.json({ isActive: !car.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/carrent/:id/bookings — get car bookings
router.get("/carrent/:id/bookings", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db
      .collection("carrentBookings")
      .find({ carId: req.params.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// BUS SERVICES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

// GET /api/admin/buses — all buses
router.get("/buses", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const buses = await db
      .collection("buses")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const now = new Date();
    const enriched = await Promise.all(
      buses.map(async (bus) => {
        const bookedSeats = await db
          .collection("busBookings")
          .aggregate([
            {
              $match: {
                busId: bus._id.toString(),
                status: { $in: ["confirmed", "pending"] },
                travelDate: { $gte: now },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $toInt: "$seats" } },
              },
            },
          ])
          .toArray();
        const totalBooked = bookedSeats[0]?.total || 0;
        return {
          ...bus,
          bookedSeats: totalBooked,
          availableSeats: Math.max(0, (bus.totalSeats || 0) - totalBooked),
        };
      }),
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/buses — create bus
router.post(
  "/buses",
  adminAuth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        busType,
        seats,
        acType,
        departureTime,
        price,
        totalSeats,
        routes,
        tripType,
        discountPercentage,
      } = req.body;

      if (!name || !acType || !departureTime || !price || !routes) {
        return res.status(400).json({
          message:
            "name, acType, departureTime, price, and routes are required",
        });
      }

      const db = await getDb();
      const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

      // Parse routes from comma-separated string
      const routeArray =
        typeof routes === "string"
          ? routes
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean)
          : Array.isArray(routes)
            ? routes
            : [];

      if (routeArray.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one route is required" });
      }

      const basePrice = Number(price) || 0;
      const discount = Number(discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(basePrice, discount);
      const bus = {
        name,
        busType: busType || "Standard Bus",
        seats: parseInt(seats) || 45,
        acType, // "AC" or "Non-AC"
        departureTime, // "10:30 AM", "2:00 PM", etc.
        price: basePrice,
        basePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        totalSeats: parseInt(totalSeats) || 45,
        routes: routeArray,
        tripType: tripType || "one-way", // "one-way" or "round-trip"
        images,
        isActive: true,
        createdAt: new Date(),
      };

      const result = await db.collection("buses").insertOne(bus);

      res.json({
        _id: result.insertedId,
        ...bus,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT /api/admin/buses/:id — update bus
router.put(
  "/buses/:id",
  adminAuth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        busType,
        seats,
        acType,
        departureTime,
        price,
        totalSeats,
        routes,
        tripType,
        discountPercentage,
      } = req.body;
      const db = await getDb();

      const bus = await db
        .collection("buses")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!bus) return res.status(404).json({ message: "Bus not found" });

      let images = bus.images;
      if (req.files?.length) {
        if (bus.images) {
          deleteImageFiles(bus.images);
        }
        images = req.files.map((f) => `/uploads/${f.filename}`);
      }

      const routeArray =
        typeof routes === "string"
          ? routes
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean)
          : Array.isArray(routes)
            ? routes
            : bus.routes;

      const basePrice =
        price !== undefined ? Number(price) || 0 : Number(bus.price) || 0;
      const discount =
        discountPercentage !== undefined
          ? Number(discountPercentage || 0)
          : Number(bus.discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(basePrice, discount);
      const updated = {
        name: name || bus.name,
        busType: busType || bus.busType,
        seats: parseInt(seats) || bus.seats,
        acType: acType || bus.acType,
        departureTime: departureTime || bus.departureTime,
        price: basePrice,
        basePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        totalSeats: parseInt(totalSeats) || bus.totalSeats || 45,
        routes: routeArray,
        tripType: tripType || bus.tripType || "one-way",
        images,
        updatedAt: new Date(),
      };

      await db
        .collection("buses")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updated });

      res.json({ _id: req.params.id, ...updated });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /api/admin/buses/:id
router.delete("/buses/:id", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const result = await db
      .collection("buses")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Bus deleted", deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/buses/:id/toggle — toggle availability
router.patch("/buses/:id/toggle", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const bus = await db
      .collection("buses")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    await db
      .collection("buses")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isActive: !bus.isActive } },
      );

    res.json({ isActive: !bus.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/buses/:id/bookings — get bus bookings
router.get("/buses/:id/bookings", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db
      .collection("busBookings")
      .find({ busId: req.params.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// TOUR PACKAGES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

router.get("/packages", adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const packages = await db
      .collection("packages")
      .find({ createdBy: String(req.user._id) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post(
  "/packages",
  adminAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        transportation,
        hotel,
        meal,
        duration,
        pricePerPerson,
        minimumPerson,
        localTransport,
        additionalInfo,
        termsAndConditions,
        description,
        giftIncluded,
        discountPercentage,
      } = req.body;

      const pricePerPersonValue = Number(pricePerPerson);
      const minimumPersonValue = Number(minimumPerson);

      if (
        !name ||
        !transportation ||
        !hotel ||
        !meal ||
        !pricePerPersonValue ||
        !minimumPersonValue
      ) {
        return res.status(400).json({
          message:
            "Package name, transportation, hotel, meal, price per person, and minimum person are required",
        });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";
      const db = await getDb();
      const discount = Number(discountPercentage || 0);
      const effectivePricing = applyDiscountToPrice(
        pricePerPersonValue,
        discount,
      );
      const pkg = {
        name,
        transportation,
        hotel,
        meal,
        duration: duration || "",
        pricePerPerson: pricePerPersonValue,
        basePrice: pricePerPersonValue,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        minimumPerson: minimumPersonValue,
        localTransport: localTransport || "",
        additionalInfo: additionalInfo || "",
        termsAndConditions: termsAndConditions || "",
        description: description || "",
        giftIncluded: giftIncluded === true || giftIncluded === "true",
        image: imageUrl,
        createdBy: String(req.user._id),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("packages").insertOne(pkg);
      res.json({ _id: result.insertedId, ...pkg });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.put(
  "/packages/:id",
  adminAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid package id" });
      }

      const db = await getDb();
      const existing = await db
        .collection("packages")
        .findOne({ _id: new ObjectId(req.params.id) });

      if (!existing) {
        return res.status(404).json({ message: "Tour package not found" });
      }
      if (String(existing.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const {
        name,
        transportation,
        hotel,
        meal,
        duration,
        pricePerPerson,
        minimumPerson,
        localTransport,
        additionalInfo,
        termsAndConditions,
        description,
        giftIncluded,
        discountPercentage,
      } = req.body;

      const pricePerPersonValue =
        pricePerPerson !== undefined
          ? Number(pricePerPerson)
          : existing.pricePerPerson;
      const minimumPersonValue =
        minimumPerson !== undefined
          ? Number(minimumPerson)
          : existing.minimumPerson;

      const discount =
        discountPercentage !== undefined
          ? Number(discountPercentage || 0)
          : Number(existing.discountPercentage || 0);
      const finalBasePrice =
        !Number.isNaN(pricePerPersonValue) && pricePerPersonValue > 0
          ? pricePerPersonValue
          : Number(existing.basePrice || existing.pricePerPerson || 0);
      const effectivePricing = applyDiscountToPrice(finalBasePrice, discount);
      const updated = {
        name: name || existing.name,
        transportation: transportation || existing.transportation,
        hotel: hotel || existing.hotel,
        meal: meal || existing.meal,
        duration: typeof duration === "string" ? duration : existing.duration,
        pricePerPerson:
          !Number.isNaN(pricePerPersonValue) && pricePerPersonValue > 0
            ? pricePerPersonValue
            : existing.pricePerPerson,
        basePrice: finalBasePrice,
        discountPercentage: Number.isFinite(discount)
          ? Math.max(0, Math.min(100, discount))
          : 0,
        effectivePrice: effectivePricing.price,
        minimumPerson:
          !Number.isNaN(minimumPersonValue) && minimumPersonValue > 0
            ? minimumPersonValue
            : existing.minimumPerson,
        localTransport:
          typeof localTransport === "string"
            ? localTransport
            : existing.localTransport,
        additionalInfo:
          typeof additionalInfo === "string"
            ? additionalInfo
            : existing.additionalInfo,
        termsAndConditions:
          typeof termsAndConditions === "string"
            ? termsAndConditions
            : existing.termsAndConditions,
        description:
          typeof description === "string" ? description : existing.description,
        giftIncluded:
          giftIncluded === true || giftIncluded === "true"
            ? true
            : giftIncluded === false || giftIncluded === "false"
              ? false
              : existing.giftIncluded,
        updatedAt: new Date(),
      };

      if (req.file) {
        if (existing.image) {
          deleteImageFiles([existing.image]);
        }
        updated.image = `/uploads/${req.file.filename}`;
      }

      await db
        .collection("packages")
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updated });

      res.json({ _id: req.params.id, ...existing, ...updated });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.delete("/packages/:id", adminAuth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const db = await getDb();
    const existing = await db
      .collection("packages")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!existing) {
      return res.status(404).json({ message: "Tour package not found" });
    }
    if (String(existing.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await db
      .collection("packages")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({ message: "Tour package deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
