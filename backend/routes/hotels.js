const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { getCache, setCache, delCache } = require("../cache");
const { ObjectId } = require("mongodb");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET /api/hotels — all active hotels with price range (OPTIMIZED)
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const cacheKey = `hotels:list:${page}:${limit}`;

    // Try cache first
    let hotels = await getCache(cacheKey);
    if (hotels) return res.json(hotels);

    const db = await getDb();

    // Use aggregation pipeline — single query instead of N+1
    const result = await db
      .collection("hotels")
      .aggregate([
        { $match: { isActive: { $ne: false } } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "rooms",
            let: { hotelId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$hotelId", "$$hotelId"] },
                  isActive: { $ne: false },
                },
              },
              { $project: { price: 1 } },
            ],
            as: "rooms",
          },
        },
        {
          $addFields: {
            minPrice: {
              $cond: [
                { $gt: [{ $size: "$rooms" }, 0] },
                { $min: "$rooms.price" },
                0,
              ],
            },
            maxPrice: {
              $cond: [
                { $gt: [{ $size: "$rooms" }, 0] },
                { $max: "$rooms.price" },
                0,
              ],
            },
            roomCount: { $size: "$rooms" },
          },
        },
        { $project: { rooms: 0 } }, // Remove rooms array from response
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);
    res.json(result);
  } catch (err) {
    console.error("Hotels fetch error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/hotels/:id — single hotel with rooms (OPTIMIZED)
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });

    const cacheKey = `hotel:${req.params.id}`;
    let cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const db = await getDb();
    const result = await db
      .collection("hotels")
      .aggregate([
        { $match: { _id: new ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "rooms",
            let: { hotelId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$hotelId", "$$hotelId"] },
                  isActive: { $ne: false },
                },
              },
            ],
            as: "rooms",
          },
        },
      ])
      .toArray();

    if (!result.length)
      return res.status(404).json({ message: "Hotel not found" });

    const hotel = result[0];
    await setCache(cacheKey, hotel, 300); // Cache for 5 minutes
    res.json(hotel);
  } catch (err) {
    console.error("Hotel detail error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/hotels/:id/rooms — rooms with availability (OPTIMIZED)
router.get("/:id/rooms", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid id" });

    const { checkIn, checkOut } = req.query;
    const db = await getDb();

    // If no dates provided, return all rooms
    if (!checkIn || !checkOut) {
      const rooms = await db
        .collection("rooms")
        .find({ hotelId: req.params.id, isActive: { $ne: false } })
        .project({
          blockedDates: 1,
          price: 1,
          name: 1,
          capacity: 1,
          amenities: 1,
        })
        .toArray();
      return res.json(rooms);
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Single aggregation query for availability status
    const roomsWithStatus = await db
      .collection("rooms")
      .aggregate([
        { $match: { hotelId: req.params.id, isActive: { $ne: false } } },
        {
          $lookup: {
            from: "bookings",
            let: { roomId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$roomId", "$$roomId"] },
                  status: { $in: ["confirmed", "pending"] },
                  checkIn: { $lt: checkOutDate },
                  checkOut: { $gt: checkInDate },
                },
              },
              { $sort: { checkOut: 1 } },
              { $limit: 1 },
            ],
            as: "conflict",
          },
        },
        {
          $addFields: {
            isBooked: {
              $cond: [
                {
                  $or: [
                    { $gt: [{ $size: "$conflict" }, 0] },
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: { $ifNull: ["$blockedDates", []] },
                              as: "b",
                              cond: {
                                $and: [
                                  {
                                    $lt: [
                                      { $toDate: "$$b.checkIn" },
                                      checkOutDate,
                                    ],
                                  },
                                  {
                                    $gt: [
                                      { $toDate: "$$b.checkOut" },
                                      checkInDate,
                                    ],
                                  },
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
                true,
                false,
              ],
            },
            nextAvailable: {
              $cond: [
                { $gt: [{ $size: "$conflict" }, 0] },
                { $arrayElemAt: ["$conflict.checkOut", 0] },
                null,
              ],
            },
          },
        },
        { $project: { conflict: 0 } },
      ])
      .toArray();

    res.json(roomsWithStatus);
  } catch (err) {
    console.error("Rooms availability error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Invalidate hotel cache when modified via admin
router.post("/:id/invalidate-cache", async (req, res) => {
  try {
    await delCache(`hotel:${req.params.id}`);
    // Invalidate list cache for all pages
    let page = 1;
    while (page <= 10) {
      await delCache(`hotels:list:${page}:20`);
      page++;
    }
    res.json({ message: "Cache invalidated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
