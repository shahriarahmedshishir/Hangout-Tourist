const { MongoClient } = require("mongodb");

let client;
let db;

async function getDb() {
  if (db) return db;
  client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017",
  );
  await client.connect();
  db = client.db(process.env.DB_NAME || "hangouttourist");
  console.log("Connected to MongoDB:", db.databaseName);
  return db;
}

module.exports = { getDb };
