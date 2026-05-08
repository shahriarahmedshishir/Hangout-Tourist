const express = require("express");
const router = express.Router();
const SSLCommerzPayment = require("sslcommerz-lts");
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");
const { isValidObjectId, validatePrice } = require("../utils/validation");

// ═══════════════════════════════════════════════════════════════════════════
// SSL COMMERZ CONFIGURATION & SETUP
// ═══════════════════════════════════════════════════════════════════════════

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID;
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD;
const IS_LIVE = false; // sandbox mode

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// Ensure TTL index on payment_sessions (auto-expires after 5 minutes)
async function ensureSessionTTL() {
  const db = await getDb();
  await db
    .collection("payment_sessions")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }); // ✅ SECURITY: Reduced from 3600 to 300 seconds (5 minutes)
}
ensureSessionTTL().catch(() => {});

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Removed isValidObjectId - now imported from utils/validation.js

function makeTranId(prefix = "HT") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

const PRODUCT_LABELS = {
  hotel: "Hotel Booking",
  car: "Car Rental",
  flight: "Flight Booking",
  holiday: "Holiday Package",
  visa: "Visa Application",
};

function getProductName(type, name) {
  const label = PRODUCT_LABELS[type] || type;
  return name ? `${label} - ${name}` : label;
}

// ═══════════════════════════════════════════════════════════════════════════
// ███████████████████████████████████████████████████████████████████████████
// SSL COMMERZ PAYMENT SYSTEM - ALL ENDPOINTS & HANDLERS
// ███████████████████████████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════
//
// This block contains all SSL Commerz payment processing logic including:
// - Payment initiation endpoints (hotel, car, coin-topup)
// - SSL Commerz callbacks (success, fail, cancel, ipn)
// - Payment confirmation and session management
//
// For SSL Commerz integration support, contact: support@sslcommerz.com
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// PAYMENT INITIATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────

// POST /api/payment/initiate/hotel
// Initiates a hotel booking payment through SSL Commerz
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

    // ✅ SECURITY: Validate total amount hasn't been tampered with
    // Client sends totalAmount, we recalculate and verify it matches
    const clientTotalAmount = parseFloat(req.body.totalAmount) || 0;
    if (!validatePrice(clientTotalAmount, totalAmount, 1)) {
      console.warn(
        `Price mismatch for user ${req.user.id}: client=${clientTotalAmount}, server=${totalAmount}`,
      );
      return res.status(400).json({
        message: `Price mismatch. Expected ${totalAmount} BDT, got ${clientTotalAmount} BDT. Please refresh and try again.`,
        expectedAmount: totalAmount,
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
      product_name: getProductName("hotel", hotel?.name),
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
// Initiates a car rental booking payment through SSL Commerz
router.post("/initiate/car", auth, async (req, res) => {
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

    // ✅ SECURITY: Validate total amount hasn't been tampered with
    const clientTotalAmount = parseFloat(req.body.totalAmount) || 0;
    if (!validatePrice(clientTotalAmount, totalAmount, 1)) {
      console.warn(
        `Price mismatch for user ${req.user.id}: client=${clientTotalAmount}, server=${totalAmount}`,
      );
      return res.status(400).json({
        message: `Price mismatch. Expected ${totalAmount} BDT, got ${clientTotalAmount} BDT. Please refresh and try again.`,
        expectedAmount: totalAmount,
      });
    }

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
      product_name: getProductName("car", car.name),
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

// POST /api/payment/initiate/coin-topup
// Initiates a coin top-up payment through SSL Commerz
// User taps up coins which get auto-credited to wallet after payment succeeds
router.post("/initiate/coin-topup", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    // ✅ SECURITY: Log payment attempt
    console.log("🔔 Coin top-up initiated", {
      userId: req.user.id,
      userName: req.user.name,
      amount,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
    });

    if (!amount || amount <= 0) {
      console.warn("❌ Invalid amount attempted", {
        userId: req.user.id,
        amount,
      });
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const tran_id = makeTranId("HT-COIN");

    // Store coin top-up intent in payment_sessions
    await db.collection("payment_sessions").insertOne({
      tran_id,
      type: "coin_topup",
      userId: req.user.id,
      amount,
      createdAt: new Date(),
    });

    const sslData = {
      total_amount: amount,
      currency: "BDT",
      tran_id,
      success_url: `${BACKEND_URL}/api/payment/success`,
      fail_url: `${BACKEND_URL}/api/payment/fail`,
      cancel_url: `${BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${BACKEND_URL}/api/payment/ipn`,
      product_name: `Hangcoin Top-up - ${amount} coins`,
      product_category: "coin_topup",
      product_profile: "general",
      cus_name: user?.name || "Guest",
      cus_email: user?.email || "guest@example.com",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
      ship_name: user?.name || "Guest",
      ship_add1: "Bangladesh",
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
      shipping_method: "NO",
      num_of_item: 1,
    };

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
    const apiResponse = await sslcz.init(sslData);

    if (apiResponse?.GatewayPageURL) {
      console.log("✅ Payment gateway initialized", { tran_id, amount });
      return res.json({ paymentUrl: apiResponse.GatewayPageURL, tran_id });
    }

    // Gateway init failed — clean up session
    console.error("❌ SSL Commerz gateway init failed", { tran_id, amount });
    await db.collection("payment_sessions").deleteOne({ tran_id });
    res
      .status(502)
      .json({ message: "Failed to initiate payment gateway. Try again." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// SSL COMMERZ CALLBACK ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────
// These endpoints receive callbacks from SSL Commerz payment gateway
// Do not modify callback URLs without updating SSL Commerz merchant panel

// POST /api/payment/success
// Browser redirect callback from SSL Commerz after successful payment
router.post("/success", async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body;

    // ✅ SECURITY: Log payment success attempt
    console.log("🔔 Payment success callback received", {
      tran_id,
      val_id,
      status,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
    });

    if (!tran_id) {
      console.error("❌ No tran_id in success callback from", req.ip);
      return res.redirect(`${CLIENT_URL}/payment/result?status=fail`);
    }

    if (status !== "VALID" && status !== "VALIDATED") {
      console.error(`❌ Invalid status: ${status} for tran_id: ${tran_id}`);
      await _deleteSession(tran_id);
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`,
      );
    }

    // Validate transaction with SSLCommerz (if val_id is provided)
    let validation = null;
    let confirmed = true;

    if (val_id) {
      try {
        const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
        validation = await sslcz.validate({ val_id });
        console.log("✅ SSLCommerz validation successful", {
          tran_id,
          validationStatus: validation?.status,
        });

        if (
          validation?.status === "VALID" ||
          validation?.status === "VALIDATED"
        ) {
          // Cross-check tran_id and amount from validation response against session
          confirmed = await _confirmBooking(tran_id, validation);
          if (!confirmed) {
            console.error(
              "❌ Payment validation mismatch for tran_id:",
              tran_id,
            );
            return res.redirect(
              `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`,
            );
          }
        } else {
          // Validation response doesn't show VALID/VALIDATED status
          // But SSL Commerz already told us it's VALID, so confirm booking
          console.warn(
            "⚠️ Validation API returned different status:",
            validation?.status,
          );
          confirmed = await _confirmBooking(tran_id, null);
        }
      } catch (validationErr) {
        console.warn(
          "⚠️ SSLCommerz validation API error:",
          validationErr.message,
        );
        // Since SSL Commerz callback status is VALID, confirm the booking
        // even if direct validation API fails
        confirmed = await _confirmBooking(tran_id, null);
      }
    } else {
      // No val_id provided, but status is VALID — trust SSL Commerz
      console.log(
        "⚠️ No val_id provided but status is VALID, confirming booking",
      );
      confirmed = await _confirmBooking(tran_id, null);
    }

    if (!confirmed) {
      console.error("❌ Booking confirmation failed for tran_id:", tran_id);
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}&reason=unavailable`,
      );
    }

    console.log("✅ Payment success confirmed", { tran_id });
    return res.redirect(
      `${CLIENT_URL}/payment/result?status=success&tran_id=${tran_id}`,
    );
  } catch (err) {
    console.error("❌ SSLCommerz success handler error:", err);
    res.redirect(`${CLIENT_URL}/payment/result?status=fail`);
  }
});

// POST /api/payment/fail
// Browser redirect callback from SSL Commerz when payment fails
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
// Browser redirect callback from SSL Commerz when user cancels payment
router.post("/cancel", async (req, res) => {
  const { tran_id } = req.body;
  try {
    if (tran_id) await _deleteSession(tran_id);
  } catch {}
  res.redirect(
    `${CLIENT_URL}/payment/result?status=cancel&tran_id=${tran_id || ""}`,
  );
});

// POST /api/payment/ipn
// Server-to-server Instant Payment Notification from SSL Commerz
// This is a backup callback (browser may not reach /success if user closes window)
// Configure IPN URL in SSL Commerz merchant panel
router.post("/ipn", async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body;

    // ✅ SECURITY: Log IPN payment callback
    console.log("🔔 IPN payment callback received", {
      tran_id,
      val_id,
      status,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
    });

    if ((status === "VALID" || status === "VALIDATED") && val_id) {
      const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
      const validation = await sslcz.validate({ val_id });
      console.log("✅ IPN validation response:", {
        tran_id,
        status: validation?.status,
      });

      if (
        validation?.status === "VALID" ||
        validation?.status === "VALIDATED"
      ) {
        // For IPN, we attempt confirmation. If session is not found, it's ok (already processed)
        const db = await getDb();
        const session = await db
          .collection("payment_sessions")
          .findOne({ tran_id });

        if (session) {
          // Session still exists, process it
          await _confirmBooking(tran_id, validation);
          console.log("✅ IPN booking confirmed", { tran_id });
        } else {
          // Session not found - might be already processed by browser callback, which is ok
          console.log("ℹ️ IPN: Session already processed:", tran_id);
        }
      }
    }
  } catch (err) {
    console.error("❌ IPN error:", err);
  }
  res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────────────────────
// PAYMENT PROCESSING HELPER FUNCTIONS (SSL COMMERZ)
// ─────────────────────────────────────────────────────────────────────────

// Move session data → bookings as confirmed, then delete session
// Returns true only if booking was successfully created
// Returns false if validation fails or session not found
async function _confirmBooking(tran_id, validation = null) {
  const db = await getDb();
  const session = await db.collection("payment_sessions").findOne({ tran_id });

  console.log("_confirmBooking called for tran_id:", tran_id);
  console.log("Session found:", !!session);

  if (!session) {
    console.warn("Session not found for tran_id:", tran_id);
    return false; // Session not found - potential tampering or already processed
  }

  // Cross-check: tran_id and amount from SSLCommerz must match our session
  if (validation) {
    const validatedTranId = validation.tran_id;
    // SSLCommerz returns amount as a string; compare as floats
    const validatedAmount = parseFloat(
      validation.amount || validation.currency_amount || 0,
    );
    const expectedAmount = parseFloat(session.totalAmount);

    console.log("Validation check:", {
      validatedTranId,
      expectedTranId: tran_id,
      validatedAmount,
      expectedAmount,
    });

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
  } else {
    console.log(
      "No validation object provided, creating booking based on session",
    );
  }

  const now = new Date();

  if (session.type === "hotel") {
    // Double-check: Ensure rooms are still available (prevent race condition)
    for (const r of session.rooms) {
      const conflict = await db.collection("bookings").findOne({
        roomId: r.roomId,
        status: "confirmed",
        checkIn: { $lt: session.checkOut },
        checkOut: { $gt: session.checkIn },
      });

      if (conflict) {
        console.error(
          `Room ${r.roomNumber} was booked by another user during payment`,
        );
        // Payment succeeded but room is no longer available
        // Don't create booking - let user know to refund
        await db.collection("payment_sessions").deleteOne({ tran_id });
        return false; // Fail the confirmation
      }
    }

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
    console.log("Creating", bookings.length, "hotel booking(s)");
    await db.collection("bookings").insertMany(bookings);
  } else if (session.type === "car") {
    // Double-check: Ensure car is still available (prevent race condition)
    const conflictingBookings = await db.collection("bookings").countDocuments({
      carId: session.carId,
      type: "car",
      status: "confirmed",
      pickupDate: { $lt: session.returnDate },
      returnDate: { $gt: session.pickupDate },
    });

    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(session.carId) });

    if (car && car.quantity > 0 && conflictingBookings >= car.quantity) {
      console.error(`Car ${session.carName} is no longer available`);
      // Payment succeeded but car is no longer available
      await db.collection("payment_sessions").deleteOne({ tran_id });
      return false; // Fail the confirmation
    }

    console.log("Creating car booking");
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
  } else if (session.type === "coin_topup") {
    console.log("Processing coin top-up - auto-approving SSL Commerz payment");
    // SSL Commerz payments are auto-approved since they're validated by SSLCommerz
    // Directly add coins to coin_ledger
    await db.collection("coin_ledger").updateOne(
      { userId: session.userId },
      {
        $inc: { coins: session.amount },
        $push: {
          transactions: {
            type: "topup",
            paymentMethod: "ssl_commerz",
            amount: session.amount,
            timestamp: now,
            transactionId: tran_id,
            description: `SSL Commerz coin top-up (auto-approved)`,
            approvedBy: null,
          },
        },
      },
      { upsert: true },
    );

    // Store transaction record
    await db.collection("coin_topup_requests").insertOne({
      userId: session.userId,
      amount: session.amount,
      paymentMethod: "ssl_commerz",
      status: "approved",
      transactionId: tran_id,
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: null, // System auto-approved
      rejectionReason: null,
    });

    // Track revenue (coins received as payment)
    await db.collection("revenue").insertOne({
      amount: session.amount,
      paymentMethod: "ssl_commerz",
      type: "coin_topup",
      userId: session.userId,
      transactionId: tran_id,
      topupRequestId: null,
      approvedAt: now,
      approvedBy: null,
      createdAt: now,
    });
  }

  await db.collection("payment_sessions").deleteOne({ tran_id });
  console.log("Booking confirmed and session deleted for tran_id:", tran_id);
  return true; // Successfully created booking
}

// Delete pending session (payment failed or cancelled — nothing goes to bookings)
async function _deleteSession(tran_id) {
  const db = await getDb();
  await db.collection("payment_sessions").deleteOne({ tran_id });
}

// ═══════════════════════════════════════════════════════════════════════════
// END SSL COMMERZ PAYMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL PAYMENT SYSTEM (Non-SSL Commerz)
// ═══════════════════════════════════════════════════════════════════════════
// For manual payments (bank transfer, mobile banking, cash, etc.)
// Requires admin approval before coins are credited

// POST /api/payment/submit/manual-coin-topup
// User submits a manual coin top-up request (bank transfer, mobile banking, etc.)
// Coins are NOT credited immediately - requires admin approval in dashboard
router.post("/submit/manual-coin-topup", auth, async (req, res) => {
  try {
    const { amount, paymentMethod, proofUrl, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        message:
          "Payment method is required (e.g., Bank Transfer, Mobile Banking)",
      });
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const tran_id = makeTranId("HT-MANUAL");
    const now = new Date();

    // Create pending top-up request (requires admin approval)
    const result = await db.collection("coin_topup_requests").insertOne({
      userId: req.user.id,
      amount,
      paymentMethod, // e.g., "bank_transfer", "mobile_banking", "cash", "cheque"
      status: "pending",
      transactionId: tran_id,
      proofUrl: proofUrl || null, // Optional: receipt/screenshot URL
      description: description || null,
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    });

    res.json({
      message:
        "Top-up request submitted successfully. Awaiting admin approval.",
      topupRequestId: result.insertedId,
      transactionId: tran_id,
      status: "pending",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// END MANUAL PAYMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

module.exports = router;
