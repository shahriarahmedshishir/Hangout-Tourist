const express = require("express");
const router = express.Router();
const SSLCommerzPayment = require("sslcommerz-lts");
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID;
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD;
const IS_LIVE = false; // sandbox mode

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function makeTranId(prefix = "HT") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// Ensure TTL index on payment_sessions (auto-expires after 1 hour)
async function ensureSessionTTL() {
  const db = await getDb();
  await db
    .collection("payment_sessions")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
}
ensureSessionTTL().catch(() => {});

// POST /api/payment/initiate/hotel
router.post("/initiate/hotel", auth, async (req, res) => {
  try {
    const {
      rooms: roomIds,
      roomId,
      hotelId,
      checkIn,
      checkOut,
      contactNumber,
    } = req.body;

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
      return res.status(400).json({ message: "Invalid dates" });
    }

    const db = await getDb();
    const hotel = await db
      .collection("hotels")
      .findOne({ _id: new ObjectId(hotelId) });

    const days = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );

    const roomsToBook = [];
    let totalAmount = 0;

    for (const rId of idsToBook) {
      const room = await db
        .collection("rooms")
        .findOne({ _id: new ObjectId(rId) });
      if (!room) return res.status(404).json({ message: "Room not found" });
      if (room.isActive === false || room.isAvailable === false) {
        return res
          .status(400)
          .json({ message: `Room ${room.roomNumber} is not available` });
      }

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

      const conflict = await db.collection("bookings").findOne({
        roomId: rId,
        status: "confirmed",
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      });
      if (conflict) {
        return res.status(409).json({
          message: `Room ${room.roomNumber} is already booked for the selected dates`,
        });
      }

      totalAmount += room.price * days;
      roomsToBook.push({
        roomId: room._id.toString(),
        roomNumber: room.roomNumber,
        pricePerNight: room.price,
        roomTotal: room.price * days,
      });
    }

    const tran_id = makeTranId("HT-HTL");

    // Store booking intent in payment_sessions — NOT in bookings yet
    await db.collection("payment_sessions").insertOne({
      tran_id,
      type: "hotel",
      userId: req.user.id,
      hotelId,
      hotelName: hotel?.name || "",
      rooms: roomsToBook,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      days,
      totalAmount,
      contactNumber: contactNumber || "",
      createdAt: new Date(),
    });

    const userDoc = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });

    const sslData = {
      total_amount: totalAmount,
      currency: "BDT",
      tran_id,
      success_url: `${BACKEND_URL}/api/payment/success`,
      fail_url: `${BACKEND_URL}/api/payment/fail`,
      cancel_url: `${BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${BACKEND_URL}/api/payment/ipn`,
      product_name: `Hotel Booking - ${hotel?.name || "Hotel"}`,
      product_category: "hotel",
      product_profile: "general",
      cus_name: userDoc?.name || "Guest",
      cus_email: userDoc?.email || "guest@example.com",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: contactNumber || "01700000000",
      ship_name: userDoc?.name || "Guest",
      ship_add1: "Bangladesh",
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
      shipping_method: "NO",
      num_of_item: idsToBook.length,
    };

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
    const apiResponse = await sslcz.init(sslData);

    if (apiResponse?.GatewayPageURL) {
      return res.json({ paymentUrl: apiResponse.GatewayPageURL, tran_id });
    }

    // Gateway init failed — clean up session
    await db.collection("payment_sessions").deleteOne({ tran_id });
    res
      .status(502)
      .json({ message: "Failed to initiate payment gateway. Try again." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payment/initiate/car
router.post("/initiate/car", auth, async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, pickupLocation, contactNumber } =
      req.body;

    if (!carId || !pickupDate || !returnDate) {
      return res
        .status(400)
        .json({ message: "carId, pickupDate, returnDate are required" });
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
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.isActive === false || car.isAvailable === false) {
      return res.status(400).json({ message: "Car is not available" });
    }

    const now = new Date();
    const activeBookings = await db.collection("bookings").countDocuments({
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
    const totalAmount = car.price * days;
    const tran_id = makeTranId("HT-CAR");

    // Store booking intent in payment_sessions — NOT in bookings yet
    await db.collection("payment_sessions").insertOne({
      tran_id,
      type: "car",
      userId: req.user.id,
      carId,
      carName: car.name,
      pickupDate: pickupDateObj,
      returnDate: returnDateObj,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      days,
      pricePerDay: car.price,
      totalAmount,
      createdAt: new Date(),
    });

    const userDoc = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });

    const sslData = {
      total_amount: totalAmount,
      currency: "BDT",
      tran_id,
      success_url: `${BACKEND_URL}/api/payment/success`,
      fail_url: `${BACKEND_URL}/api/payment/fail`,
      cancel_url: `${BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${BACKEND_URL}/api/payment/ipn`,
      product_name: `Car Rental - ${car.name}`,
      product_category: "car",
      product_profile: "general",
      cus_name: userDoc?.name || "Guest",
      cus_email: userDoc?.email || "guest@example.com",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: contactNumber || "01700000000",
      ship_name: userDoc?.name || "Guest",
      ship_add1: "Bangladesh",
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
      shipping_method: "NO",
      num_of_item: 1,
    };

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
    const apiResponse = await sslcz.init(sslData);

    if (apiResponse?.GatewayPageURL) {
      return res.json({ paymentUrl: apiResponse.GatewayPageURL, tran_id });
    }

    // Gateway init failed — clean up session
    await db.collection("payment_sessions").deleteOne({ tran_id });
    res
      .status(502)
      .json({ message: "Failed to initiate payment gateway. Try again." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payment/success — SSLCommerz redirects user's browser here after payment
router.post("/success", async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body;

    if (!tran_id) {
      return res.redirect(`${CLIENT_URL}/payment/result?status=fail`);
    }

    if (status !== "VALID" && status !== "VALIDATED") {
      await _deleteSession(tran_id);
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`,
      );
    }

    // Validate transaction with SSLCommerz
    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
    const validation = await sslcz.validate({ val_id });

    if (validation?.status === "VALID" || validation?.status === "VALIDATED") {
      // Cross-check tran_id and amount from validation response against session
      const confirmed = await _confirmBooking(tran_id, validation);
      if (!confirmed) {
        // Amount or tran_id mismatch — do not create booking
        console.error(
          "Payment validation mismatch for tran_id:",
          tran_id,
          validation,
        );
        return res.redirect(
          `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`,
        );
      }
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=success&tran_id=${tran_id}`,
      );
    }

    await _deleteSession(tran_id);
    res.redirect(`${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`);
  } catch (err) {
    console.error("SSLCommerz success handler error:", err);
    res.redirect(`${CLIENT_URL}/payment/result?status=fail`);
  }
});

// POST /api/payment/fail
router.post("/fail", async (req, res) => {
  const { tran_id } = req.body;
  try {
    if (tran_id) await _deleteSession(tran_id);
  } catch {}
  res.redirect(
    `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id || ""}`,
  );
});

// POST /api/payment/cancel
router.post("/cancel", async (req, res) => {
  const { tran_id } = req.body;
  try {
    if (tran_id) await _deleteSession(tran_id);
  } catch {}
  res.redirect(
    `${CLIENT_URL}/payment/result?status=cancel&tran_id=${tran_id || ""}`,
  );
});

// POST /api/payment/ipn — server-to-server notification from SSLCommerz
router.post("/ipn", async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body;
    if ((status === "VALID" || status === "VALIDATED") && val_id) {
      const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
      const validation = await sslcz.validate({ val_id });
      if (
        validation?.status === "VALID" ||
        validation?.status === "VALIDATED"
      ) {
        await _confirmBooking(tran_id, validation);
      }
    }
  } catch (err) {
    console.error("IPN error:", err);
  }
  res.status(200).send("OK");
});

// Move session data → bookings as confirmed, then delete session
// Returns false if tran_id or amount from SSLCommerz doesn't match the session
async function _confirmBooking(tran_id, validation = null) {
  const db = await getDb();
  const session = await db.collection("payment_sessions").findOne({ tran_id });
  if (!session) return true; // already processed or expired — treat as ok

  // Cross-check: tran_id and amount from SSLCommerz must match our session
  if (validation) {
    const validatedTranId = validation.tran_id;
    // SSLCommerz returns amount as a string; compare as floats
    const validatedAmount = parseFloat(
      validation.amount || validation.currency_amount || 0,
    );
    const expectedAmount = parseFloat(session.totalAmount);

    if (validatedTranId && validatedTranId !== tran_id) {
      console.error(
        `tran_id mismatch: expected ${tran_id}, got ${validatedTranId}`,
      );
      await _deleteSession(tran_id);
      return false;
    }
    if (validatedAmount > 0 && Math.abs(validatedAmount - expectedAmount) > 1) {
      // Allow ±1 BDT tolerance for floating point
      console.error(
        `Amount mismatch: expected ${expectedAmount}, got ${validatedAmount}`,
      );
      await _deleteSession(tran_id);
      return false;
    }
  }

  const now = new Date();

  if (session.type === "hotel") {
    const bookings = session.rooms.map((r) => ({
      userId: session.userId,
      type: "hotel",
      hotelId: session.hotelId,
      hotelName: session.hotelName,
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      checkIn: session.checkIn,
      checkOut: session.checkOut,
      days: session.days,
      pricePerNight: r.pricePerNight,
      totalAmount: r.roomTotal,
      contactNumber: session.contactNumber,
      status: "confirmed",
      transactionId: tran_id,
      paymentMethod: "SSLCommerz",
      paidAt: now,
      refundStatus: null,
      createdAt: now,
    }));
    await db.collection("bookings").insertMany(bookings);
  } else if (session.type === "car") {
    await db.collection("bookings").insertOne({
      userId: session.userId,
      type: "car",
      carId: session.carId,
      carName: session.carName,
      pickupDate: session.pickupDate,
      returnDate: session.returnDate,
      pickupLocation: session.pickupLocation,
      contactNumber: session.contactNumber,
      days: session.days,
      pricePerDay: session.pricePerDay,
      totalAmount: session.totalAmount,
      status: "confirmed",
      transactionId: tran_id,
      paymentMethod: "SSLCommerz",
      paidAt: now,
      refundStatus: null,
      createdAt: now,
    });
  }

  await db.collection("payment_sessions").deleteOne({ tran_id });
}

// Delete pending session (payment failed or cancelled — nothing goes to bookings)
async function _deleteSession(tran_id) {
  const db = await getDb();
  await db.collection("payment_sessions").deleteOne({ tran_id });
}

module.exports = router;
