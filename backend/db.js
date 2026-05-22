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
  async function createIndexIfNeeded(collection, key, options = {}) {
    const coll = db.collection(collection);
    const existing = await coll.indexes();
    const name =
      options.name ||
      Object.entries(key)
        .map(([field, order]) => `${field}_${order}`)
        .join("_");
    if (existing.some((idx) => idx.name === name)) {
      return;
    }
    await coll.createIndex(key, options);
  }

  try {
    // Hotels indexes
    await createIndexIfNeeded("hotels", { isActive: 1 });
    await createIndexIfNeeded("hotels", { createdAt: -1 });

    // Rooms indexes
    await createIndexIfNeeded("rooms", { hotelId: 1, isActive: 1 });
    await createIndexIfNeeded("rooms", { hotelId: 1, price: 1 });

    // Cars indexes
    await createIndexIfNeeded("cars", { isActive: 1 });
    await createIndexIfNeeded("cars", { createdAt: -1 });

    // Car bookings indexes
    await createIndexIfNeeded("carBookings", {
      carId: 1,
      status: 1,
      pickUpDate: 1,
      dropOffDate: 1,
    });
    await createIndexIfNeeded("carBookings", { userId: 1, status: 1 });

    // CarRent indexes
    await createIndexIfNeeded("carrent", { isActive: 1 });
    await createIndexIfNeeded("carrent", { createdAt: -1 });

    // CarRent Bookings indexes
    await createIndexIfNeeded("carrentBookings", {
      carId: 1,
      status: 1,
      pickupDate: 1,
      returnDate: 1,
    });
    await createIndexIfNeeded("carrentBookings", { userId: 1, status: 1 });
    await createIndexIfNeeded("carrentBookings", { createdAt: -1 });

    // Tour package indexes
    await createIndexIfNeeded("packages", { createdBy: 1, createdAt: -1 });

    // Payments indexes
    await createIndexIfNeeded("revenue", { createdAt: -1 });
    await createIndexIfNeeded("revenue", { type: 1, createdAt: -1 });
    await createIndexIfNeeded("coin_topup_requests", { userId: 1, status: 1 });

    // Booking/payment transaction indexes
    await createIndexIfNeeded(
      "bookings",
      { transactionId: 1 },
      { unique: true, sparse: true },
    );
    await createIndexIfNeeded(
      "carrentBookings",
      { transactionId: 1 },
      { unique: true, sparse: true },
    );
    await createIndexIfNeeded(
      "busBookings",
      { transactionId: 1 },
      { unique: true, sparse: true },
    );
    await createIndexIfNeeded(
      "coin_topup_requests",
      { transactionId: 1 },
      { unique: true, sparse: true },
    );

    // Cancel requests indexes
    await createIndexIfNeeded("cancel_requests", { bookingId: 1, status: 1 });
    await createIndexIfNeeded("cancel_requests", { userId: 1 });
    await createIndexIfNeeded("cancel_requests", { createdAt: -1 });

    console.log("Database indexes created successfully");
  } catch (err) {
    console.warn("Index creation warning:", err.message);
  }
}

module.exports = { getDb };
