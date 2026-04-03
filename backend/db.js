const { MongoClient } = require("mongodb");

let client;
let db;

async function getDb() {
  if (db) return db;
  client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017",
    {
      maxPoolSize: 50, // Max 50 connections
      minPoolSize: 10, // Min 10 connections
      maxIdleTimeMS: 45000, // Close idle connections after 45s
      waitQueueTimeoutMS: 10000, // Timeout for queue wait
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
    },
  );
  await client.connect();
  db = client.db(process.env.DB_NAME || "hangouttourist");

  // Create indexes on startup
  await createIndexes(db);

  console.log("Connected to MongoDB:", db.databaseName);
  return db;
}

async function createIndexes(db) {
  try {
    // Hotels indexes
    await db.collection("hotels").createIndex({ isActive: 1 });
    await db.collection("hotels").createIndex({ createdAt: -1 });

    // Rooms indexes
    await db.collection("rooms").createIndex({ hotelId: 1, isActive: 1 });
    await db.collection("rooms").createIndex({ hotelId: 1, price: 1 });

    // Cars indexes
    await db.collection("cars").createIndex({ isActive: 1 });
    await db.collection("cars").createIndex({ createdAt: -1 });

    // Bookings indexes
    await db
      .collection("bookings")
      .createIndex({ roomId: 1, status: 1, checkIn: 1, checkOut: 1 });
    await db.collection("bookings").createIndex({ userId: 1, status: 1 });
    await db.collection("bookings").createIndex({ hotel: 1, status: 1 });

    // Car bookings indexes
    await db
      .collection("carBookings")
      .createIndex({ carId: 1, status: 1, pickUpDate: 1, dropOffDate: 1 });
    await db.collection("carBookings").createIndex({ userId: 1, status: 1 });

    // Payments indexes
    await db.collection("revenue").createIndex({ createdAt: -1 });
    await db.collection("revenue").createIndex({ type: 1, createdAt: -1 });
    await db
      .collection("coin_topup_requests")
      .createIndex({ userId: 1, status: 1 });

    console.log("Database indexes created successfully");
  } catch (err) {
    console.warn("Index creation warning:", err.message);
  }
}

module.exports = { getDb };
