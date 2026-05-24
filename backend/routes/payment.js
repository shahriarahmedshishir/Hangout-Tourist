const express = require("express");
const router = express.Router();
const SSLCommerzPayment = require("sslcommerz-lts");
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const { isValidObjectId, validatePrice } = require("../utils/validation");
const crypto = require("crypto");

// Callback verification config: prefer HMAC secret, fallback to allowed IPs list
const CALLBACK_SECRET = process.env.SSLCOMMERZ_CALLBACK_SECRET || null;
const ALLOWED_IPS = (process.env.SSLCOMMERZ_IPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function _normalizeIp(ip) {
  if (!ip) return "";
  return ip.replace(/^::ffff:/, "");
}

function _isIpAllowed(ip) {
  const n = _normalizeIp(ip);
  return ALLOWED_IPS.some((a) => {
    if (!a) return false;
    // simple prefix match for convenience (supports CIDR-like prefixes if provided as '192.168.')
    return n === a || n.startsWith(a);
  });
}

function verifyPaymentCallback(req, res, next) {
  // In production require either a callback secret or an IP allowlist to be configured
  if (
    process.env.NODE_ENV === "production" &&
    !CALLBACK_SECRET &&
    ALLOWED_IPS.length === 0
  ) {
    console.error(
      "❌ Payment callback verification not configured in production",
    );
    return res.status(503).send("Payment callbacks temporarily disabled");
  }

  // If secret configured, validate HMAC-SHA256 of raw JSON body
  if (CALLBACK_SECRET) {
    const sigHeader = (
      req.headers["x-sslcommerz-signature"] ||
      req.headers["x-ssl-signature"] ||
      req.headers["x-signature"] ||
      ""
    ).toString();
    try {
      const payload = req.rawBody || JSON.stringify(req.body || {});
      const expected = crypto
        .createHmac("sha256", CALLBACK_SECRET)
        .update(payload)
        .digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(sigHeader || "");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        console.warn("⚠️ Invalid payment callback signature", {
          ip: req.ip,
          tran_id: req.body?.tran_id,
        });
        return res.status(403).send("Invalid signature");
      }
      return next();
    } catch (err) {
      console.error("Error verifying callback signature:", err.message);
      return res.status(403).send("Invalid signature");
    }
  }

  // Fallback: check IP allowlist
  if (ALLOWED_IPS.length) {
    const ip = req.ip || req.connection?.remoteAddress || "";
    if (!_isIpAllowed(ip)) {
      console.warn("⚠️ Payment callback from unauthorized IP", {
        ip,
        tran_id: req.body?.tran_id,
      });
      return res.status(403).send("Forbidden");
    }
    return next();
  }

  // Non-production env with no config - allow for local testing
  return next();
}

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
  holiday: "Holiday Package",
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
  // Apply payment rate limiter if configured (app sets paymentLimiter)
  if (req.app && req.app.get("paymentLimiter")) {
    await new Promise((resolve, reject) =>
      req.app.get("paymentLimiter")(req, res, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  }
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
  if (req.app && req.app.get("paymentLimiter")) {
    await new Promise((resolve, reject) =>
      req.app.get("paymentLimiter")(req, res, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  }
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
    const carQuantity = car.quantity || car.totalSeats || 0;
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
    if (carQuantity > 0 && activeBookings >= carQuantity) {
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

// POST /api/payment/initiate/package
// Initiates a holiday package booking payment through SSL Commerz
router.post("/initiate/package", auth, async (req, res) => {
  if (req.app && req.app.get("paymentLimiter")) {
    await new Promise((resolve, reject) =>
      req.app.get("paymentLimiter")(req, res, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  }
  try {
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book packages" });
    }

    const { packageId, travelDate, peopleCount, guestDetails, totalAmount } =
      req.body;

    if (!packageId || !travelDate || !peopleCount) {
      return res.status(400).json({
        message: "packageId, travelDate, and peopleCount are required",
      });
    }

    if (!isValidObjectId(packageId)) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const travelDateObj = new Date(travelDate);
    if (isNaN(travelDateObj)) {
      return res.status(400).json({ message: "Invalid travel date" });
    }

    const db = await getDb();
    const pkg = await db
      .collection("packages")
      .findOne({ _id: new ObjectId(packageId) });
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    const count = Number(peopleCount);
    const minPerson = Number(pkg.minimumPerson || 1);
    if (count < minPerson) {
      return res.status(400).json({
        message: `At least ${minPerson} people are required for this package`,
      });
    }

    const computedTotal = Number(pkg.pricePerPerson || 0) * count;
    const clientTotalAmount = parseFloat(totalAmount) || 0;
    if (!validatePrice(clientTotalAmount, computedTotal, 1)) {
      return res.status(400).json({
        message: `Price mismatch. Expected ${computedTotal} BDT, got ${clientTotalAmount} BDT. Please refresh and try again.`,
        expectedAmount: computedTotal,
      });
    }

    const tran_id = makeTranId("HT-PKG");

    const userDoc = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });

    const guestEmail =
      userDoc?.email || req.user.email || guestDetails?.email || "";
    const finalGuestDetails = { ...(guestDetails || {}), email: guestEmail };

    await db.collection("payment_sessions").insertOne({
      tran_id,
      type: "package",
      userId: req.user.id,
      packageId,
      packageName: pkg.name,
      travelDate: travelDateObj,
      peopleCount: count,
      pricePerPerson: Number(pkg.pricePerPerson || 0),
      guestDetails: finalGuestDetails,
      totalAmount: computedTotal,
      createdAt: new Date(),
    });

    const sslData = {
      total_amount: computedTotal,
      currency: "BDT",
      tran_id,
      success_url: `${BACKEND_URL}/api/payment/success`,
      fail_url: `${BACKEND_URL}/api/payment/fail`,
      cancel_url: `${BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${BACKEND_URL}/api/payment/ipn`,
      product_name: getProductName("holiday", pkg.name),
      product_category: "holiday",
      product_profile: "general",
      cus_name: userDoc?.name || "Guest",
      cus_email: userDoc?.email || "guest@example.com",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: guestDetails?.contactNumber || "01700000000",
      ship_name: userDoc?.name || "Guest",
      ship_add1: "Bangladesh",
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
      shipping_method: "NO",
      num_of_item: count,
    };

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
    const apiResponse = await sslcz.init(sslData);

    if (apiResponse?.GatewayPageURL) {
      return res.json({ paymentUrl: apiResponse.GatewayPageURL, tran_id });
    }

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
  if (req.app && req.app.get("paymentLimiter")) {
    await new Promise((resolve, reject) =>
      req.app.get("paymentLimiter")(req, res, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  }
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
router.post("/success", verifyPaymentCallback, async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body;

    // ✅ SECURITY: Log payment success attempt
    console.log("🔔 Payment success callback", {
      tran_id,
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

    // Require gateway validation before confirming bookings.
    // Do NOT confirm booking when val_id is missing or when validation fails.
    let validation = null;
    let confirmed = false;

    if (!val_id) {
      console.warn(
        "⚠️ Payment success callback missing val_id; deferring confirmation to IPN",
      );
      // Do not confirm here; wait for IPN (server-to-server) which will validate
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=pending&tran_id=${tran_id}`,
      );
    }

    try {
      const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
      validation = await sslcz.validate({ val_id });
      const validationStatus = _getValidationStatus(validation);
      console.log("✅ SSLCommerz validation response", {
        tran_id,
        validationStatus,
      });

      if (validationStatus === "VALID" || validationStatus === "VALIDATED") {
        // Try to confirm; if locked by IPN, poll until done
        confirmed = await _confirmBooking(tran_id, validation);
        if (confirmed === null) {
          // Still processing — poll for up to 8 seconds (faster confirmation)
          for (let i = 0; i < 16; i++) {
            await new Promise((r) => setTimeout(r, 500));
            if (await _isTransactionAlreadyConfirmed(tran_id)) {
              confirmed = true;
              break;
            }
          }
        }
        if (confirmed === null) {
          console.error("❌ Payment validation mismatch for tran_id:", tran_id);
          return res.redirect(
            `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`,
          );
        }
      } else {
        console.error(
          "❌ Validation API returned non-validated status:",
          validationStatus,
        );
        return res.redirect(
          `${CLIENT_URL}/payment/result?status=fail&tran_id=${tran_id}`,
        );
      }
    } catch (validationErr) {
      console.error("❌ SSLCommerz validation API error", {
        tran_id,
        err: validationErr.message,
      });
      // Don't confirm booking on validation API error — advise pending
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=pending&tran_id=${tran_id}`,
      );
    }

    if (confirmed === null) {
      console.log(
        "ℹ️ Payment still processing, redirecting to pending:",
        tran_id,
      );
      return res.redirect(
        `${CLIENT_URL}/payment/result?status=pending&tran_id=${tran_id}`,
      );
    }

    if (confirmed === false) {
      console.error("❌ Payment confirmation failed for tran_id:", tran_id);
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
router.post("/fail", verifyPaymentCallback, async (req, res) => {
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
router.post("/cancel", verifyPaymentCallback, async (req, res) => {
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
router.post("/ipn", verifyPaymentCallback, async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body;

    // ✅ SECURITY: Log IPN payment callback
    console.log("🔔 IPN payment callback", {
      tran_id,
      status,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
    });

    if ((status === "VALID" || status === "VALIDATED") && val_id) {
      // Minimal delay for IPN — lock mechanism prevents duplicate processing
      await new Promise((resolve) => setTimeout(resolve, 500));
      const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASSWORD, IS_LIVE);
      const validation = await sslcz.validate({ val_id });
      const validationStatus = _getValidationStatus(validation);
      console.log("✅ IPN validation response", {
        tran_id,
        validationStatus,
      });

      if (validationStatus === "VALID" || validationStatus === "VALIDATED") {
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
  console.log("🔧 [_confirmBooking START]", {
    tran_id,
    validationProvided: !!validation,
  });
  const db = await getDb();
  const now = new Date();
  const STALE_LOCK_MS = 2 * 60 * 1000; // 2 minutes

  // Atomically claim the session for processing only.
  // If a previous processing attempt hung, allow a stale lock to be reclaimed.
  let claim = await db.collection("payment_sessions").findOneAndUpdate(
    {
      tran_id,
      $or: [
        { processing: { $exists: false } },
        { processing: false },
        { processingAt: { $lt: new Date(now - STALE_LOCK_MS) } },
      ],
    },
    { $set: { processing: true, processingAt: now } },
    { returnDocument: "after" },
  );
  let session = claim.value ?? claim;

  if (session) {
    console.log(
      "🔧 [LOCK ACQUIRED] Successfully claimed lock for tran_id:",
      tran_id,
    );
  } else {
    console.log(
      "🔧 [LOCK FAILED] Could not claim lock for tran_id:",
      tran_id,
      "- another callback is processing",
    );
  }

  if (!session) {
    const existingSession = await db
      .collection("payment_sessions")
      .findOne({ tran_id });

    if (existingSession) {
      console.warn("Session exists but is currently locked for processing:", {
        tran_id,
        processing: existingSession.processing,
        processingAt: existingSession.processingAt,
      });

      if (await _isTransactionAlreadyConfirmed(tran_id)) {
        console.log(
          "ℹ️ Transaction already confirmed; duplicate callback received",
          { tran_id },
        );
        return true;
      }

      const waitResult = await _waitForSessionProcessingCompletion(
        db,
        tran_id,
        15000,
      );
      console.log("🔧 [WAIT RESULT]", waitResult, "for tran_id:", tran_id);

      if (waitResult === "confirmed") {
        console.log(
          "🔧 [WAIT CONFIRMED] Transaction confirmed during wait for tran_id:",
          tran_id,
        );
        return true;
      }

      if (waitResult === "available") {
        console.log(
          "🔧 [WAIT AVAILABLE] Lock released, attempting to claim for tran_id:",
          tran_id,
        );
        claim = await db.collection("payment_sessions").findOneAndUpdate(
          {
            tran_id,
            $or: [
              { processing: { $exists: false } },
              { processing: false },
              { processingAt: { $lt: new Date(now - STALE_LOCK_MS) } },
            ],
          },
          { $set: { processing: true, processingAt: new Date() } },
          { returnDocument: "after" },
        );
        session = claim.value ?? claim;
        if (session) {
          console.log(
            "🔧 [LOCK RE-ACQUIRED] Successfully claimed lock after wait for tran_id:",
            tran_id,
          );
        } else {
          console.log(
            "🔧 [LOCK RE-FAILED] Failed to reclaim lock after wait for tran_id:",
            tran_id,
          );
        }
      }

      if (waitResult === "timeout") {
        console.warn(
          "🔧 [WAIT TIMEOUT] Session processing still active after wait for tran_id:",
          tran_id,
        );
        // Wait a bit more then do a final check
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (await _isTransactionAlreadyConfirmed(tran_id)) {
          console.log(
            "ℹ️ Booking was confirmed during extended wait:",
            tran_id,
          );
          return true;
        }
        return null;
      }

      if (waitResult === "missing") {
        console.warn(
          "🔧 [WAIT MISSING] Session was deleted while waiting for tran_id:",
          tran_id,
        );
        // Session was deleted while we waited — check if booking was created
        if (await _isTransactionAlreadyConfirmed(tran_id)) {
          console.log("ℹ️ Session processed by concurrent callback:", tran_id);
          return true;
        }
        return false;
      }
    }

    if (!session) {
      if (await _isTransactionAlreadyConfirmed(tran_id)) {
        console.log(
          "ℹ️ Transaction already confirmed; duplicate callback received",
          { tran_id },
        );
        return true;
      }

      console.warn(
        "Session not found or already processed for tran_id:",
        tran_id,
      );
      return false; // Session not found or already processed
    }
  }

  // Safety check: ensure session is not null before proceeding
  if (!session) {
    console.error(
      "🔧 [CRITICAL] Session is null despite all retry attempts for tran_id:",
      tran_id,
    );
    return false;
  }

  try {
    console.log("🔧 [_confirmBooking TRY START] Validating session...", {
      tran_id,
      sessionType: session?.type,
    });

    // Cross-check: tran_id and amount from SSLCommerz must match our session
    if (validation) {
      const validatedTranId =
        validation.tran_id || validation.tran_id?.toString();
      // SSLCommerz returns amount as a string; compare as floats
      const validatedAmount = _getValidationAmount(validation);
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
      if (
        validatedAmount > 0 &&
        Math.abs(validatedAmount - expectedAmount) > 1
      ) {
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

    // now is already set when claiming session
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
      console.log(
        "🔧 [HOTEL] Inserting",
        bookings.length,
        "bookings for tran_id:",
        tran_id,
      );
      await db.collection("bookings").insertMany(bookings);
      console.log(
        "✅ [HOTEL] Bookings inserted successfully for tran_id:",
        tran_id,
      );
    } else if (session.type === "car") {
      // Double-check: Ensure car is still available (prevent race condition)
      const conflictingBookings = await db
        .collection("carrentBookings")
        .countDocuments({
          carId: session.carId,
          type: "car",
          status: "confirmed",
          pickupDate: { $lt: session.returnDate },
          returnDate: { $gt: session.pickupDate },
        });

      const car = await db
        .collection("carrent")
        .findOne({ _id: new ObjectId(session.carId) });

      if (car && car.quantity > 0 && conflictingBookings >= car.quantity) {
        console.error(`Car ${session.carName} is no longer available`);
        // Payment succeeded but car is no longer available
        await db.collection("payment_sessions").deleteOne({ tran_id });
        return false; // Fail the confirmation
      }

      console.log("Creating car booking");
      await db.collection("carrentBookings").insertOne({
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
        seatsBooked: session.seatsBooked || 1,
        status: "confirmed",
        transactionId: tran_id,
        paymentMethod: "SSLCommerz",
        paidAt: now,
        refundStatus: null,
        createdAt: now,
      });
    } else if (session.type === "package" || session.type === "holiday") {
      console.log(
        "🔧 [PACKAGE] Creating holiday package booking for tran_id:",
        tran_id,
      );
      await db.collection("bookings").insertOne({
        userId: session.userId,
        type: "holiday",
        packageId: session.packageId,
        packageName: session.packageName,
        travelDate: session.travelDate,
        peopleCount: session.peopleCount,
        pricePerPerson: session.pricePerPerson,
        totalAmount: session.totalAmount,
        guestDetails: session.guestDetails || {},
        status: "confirmed",
        transactionId: tran_id,
        paymentMethod: "SSLCommerz",
        paidAt: now,
        refundStatus: null,
        createdAt: now,
      });
      console.log(
        "✅ [PACKAGE] Holiday booking inserted successfully for tran_id:",
        tran_id,
      );
    } else if (session.type === "bus") {
      // Double-check: Ensure bus seats are still available (prevent race condition)
      const conflictingBookings = await db
        .collection("busBookings")
        .countDocuments({
          busId: session.busId,
          status: "confirmed",
          travelDate: {
            $gte: new Date(session.travelDate.getTime() - 24 * 60 * 60 * 1000),
            $lt: new Date(session.travelDate.getTime() + 24 * 60 * 60 * 1000),
          },
        });

      const bus = await db
        .collection("buses")
        .findOne({ _id: new ObjectId(session.busId) });

      const availableSeats = bus.quantity - conflictingBookings;
      if (availableSeats < session.seats) {
        console.error(
          `Bus ${session.busName} has insufficient seats remaining`,
        );
        // Payment succeeded but bus is no longer available
        await db.collection("payment_sessions").deleteOne({ tran_id });
        return false; // Fail the confirmation
      }

      console.log("Creating bus booking");
      await db.collection("busBookings").insertOne({
        userId: session.userId,
        type: "bus",
        busId: session.busId,
        busName: session.busName,
        travelDate: session.travelDate,
        seats: session.seats,
        pickupLocation: session.pickupLocation,
        contactNumber: session.contactNumber,
        pricePerSeat: session.pricePerSeat,
        totalAmount: session.totalAmount,
        status: "confirmed",
        transactionId: tran_id,
        paymentMethod: "SSLCommerz",
        paidAt: now,
        refundStatus: null,
        createdAt: now,
      });
    } else if (session.type === "carrent") {
      // Double-check: Ensure carrent seats are still available (prevent race condition)
      const bookedSeatsData = await db
        .collection("carrentBookings")
        .aggregate([
          {
            $match: {
              serviceId: session.serviceId,
              status: "confirmed",
              returnDate: { $gte: now },
              $or: [
                {
                  pickupDate: { $lt: session.returnDate },
                  returnDate: { $gt: session.pickupDate },
                },
              ],
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

      const bookedSeats = bookedSeatsData[0]?.total || 0;
      const service = await db
        .collection("carrent")
        .findOne({ _id: new ObjectId(session.serviceId) });

      const availableSeats =
        (service.quantity || service.totalSeats || 0) - bookedSeats;
      if (availableSeats < session.seatsBooked) {
        console.error(
          `Service ${session.serviceName} has insufficient cars remaining`,
        );
        // Payment succeeded but service is no longer available
        await db.collection("payment_sessions").deleteOne({ tran_id });
        return false; // Fail the confirmation
      }

      console.log("Creating carrent booking");
      await db.collection("carrentBookings").insertOne({
        userId: session.userId,
        type: "carrent",
        serviceId: session.serviceId,
        serviceName: session.serviceName,
        carName: session.serviceName, // For frontend display
        carType: service.type || "Standard", // For frontend display
        pickupDate: session.pickupDate,
        returnDate: session.returnDate,
        days: Math.ceil(
          (session.returnDate - session.pickupDate) / (1000 * 60 * 60 * 24),
        ), // Calculate days
        seatsBooked: session.seatsBooked,
        pickupLocation: session.pickupLocation,
        contactNumber: session.contactNumber,
        pricePerSeat: session.pricePerSeat,
        totalAmount: session.totalAmount,
        status: "confirmed",
        transactionId: tran_id,
        paymentMethod: "SSLCommerz",
        paidAt: now,
        refundStatus: null,
        createdAt: now,
      });
    } else if (session.type === "coin_topup") {
      console.log(
        "Processing coin top-up - auto-approving SSL Commerz payment",
      );
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

    console.log(
      "🔧 [_confirmBooking] Deleting payment session for tran_id:",
      tran_id,
    );
    await db.collection("payment_sessions").deleteOne({ tran_id });
    console.log(
      "✅ [_confirmBooking COMPLETE] Booking confirmed and session deleted for tran_id:",
      tran_id,
    );
    return true; // Successfully created booking
  } catch (err) {
    console.error(
      "❌ [_confirmBooking ERROR] for tran_id:",
      tran_id,
      "| Message:",
      err.message,
      "| Stack:",
      err.stack,
    );
    console.log(
      "🔧 [_confirmBooking ERROR] Attempting to release lock for tran_id:",
      tran_id,
    );
    try {
      await db
        .collection("payment_sessions")
        .updateOne(
          { tran_id, processing: true },
          { $unset: { processing: "", processingAt: "" } },
        );
      console.log(
        "✅ [_confirmBooking ERROR] Lock released for tran_id:",
        tran_id,
      );
    } catch (unlockErr) {
      console.error(
        "❌ [_confirmBooking ERROR] Failed to release lock for tran_id:",
        tran_id,
        "| Error:",
        unlockErr.message,
      );
    }
    throw err;
  }
}

function _getValidationStatus(validation) {
  if (!validation) return null;
  return (
    validation.status ||
    validation.validationStatus ||
    validation.validation_status ||
    validation.validationMessage ||
    null
  );
}

function _getValidationAmount(validation) {
  if (!validation) return 0;
  return parseFloat(
    validation.amount ||
      validation.currency_amount ||
      validation.currencyAmount ||
      validation.currency_amount_in_bdt ||
      validation.total_amount ||
      0,
  );
}

async function _waitForSessionProcessingCompletion(
  db,
  tran_id,
  timeoutMs = 5000,
) {
  console.log(
    "🔧 [_waitForSessionProcessingCompletion START] for tran_id:",
    tran_id,
    "timeout:",
    timeoutMs,
  );
  const start = Date.now();
  let iterations = 0;
  while (Date.now() - start < timeoutMs) {
    iterations++;
    const session = await db
      .collection("payment_sessions")
      .findOne({ tran_id }, { projection: { processing: 1, processingAt: 1 } });

    if (!session) {
      console.log(
        "🔧 [_waitForSessionProcessingCompletion] Session not found, checking if confirmed for tran_id:",
        tran_id,
      );
      if (await _isTransactionAlreadyConfirmed(tran_id)) {
        console.log(
          "✅ [_waitForSessionProcessingCompletion] Returning 'confirmed' for tran_id:",
          tran_id,
        );
        return "confirmed";
      }
      console.log(
        "❌ [_waitForSessionProcessingCompletion] Returning 'missing' for tran_id:",
        tran_id,
      );
      return "missing";
    }

    if (!session.processing) {
      console.log(
        "✅ [_waitForSessionProcessingCompletion] Returning 'available' for tran_id:",
        tran_id,
        "after",
        iterations,
        "iterations",
      );
      return "available";
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(
    "⏱️ [_waitForSessionProcessingCompletion] Timeout reached for tran_id:",
    tran_id,
    "after",
    iterations,
    "iterations",
  );
  return "timeout";
}

async function _isTransactionAlreadyConfirmed(tran_id) {
  console.log(
    "🔧 [_isTransactionAlreadyConfirmed] Checking if transaction exists for tran_id:",
    tran_id,
  );
  const db = await getDb();
  const collections = [
    "bookings",
    "carrentBookings",
    "busBookings",
    "coin_topup_requests",
  ];

  for (const name of collections) {
    console.log(
      "🔧 [_isTransactionAlreadyConfirmed] Checking collection:",
      name,
    );
    const existing = await db
      .collection(name)
      .findOne({ transactionId: tran_id }, { projection: { _id: 1 } });
    if (existing) {
      console.log(
        "✅ [_isTransactionAlreadyConfirmed] Found in",
        name,
        "for tran_id:",
        tran_id,
      );
      return true;
    }
  }

  console.log(
    "❌ [_isTransactionAlreadyConfirmed] Not found in any collection for tran_id:",
    tran_id,
  );
  return false;
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
// BUS BOOKING PAYMENT
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/payment/initiate/bus
// Initiates a bus booking payment through SSL Commerz
router.post("/initiate/bus", auth, async (req, res) => {
  if (req.app && req.app.get("paymentLimiter")) {
    await new Promise((resolve, reject) =>
      req.app.get("paymentLimiter")(req, res, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  }
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book buses" });
    }

    const { busId, travelDate, seats, pickupLocation, contactNumber } =
      req.body;

    if (!busId || !travelDate || !seats) {
      return res
        .status(400)
        .json({ message: "busId, travelDate, and seats are required" });
    }
    if (!isValidObjectId(busId)) {
      return res.status(400).json({ message: "Invalid bus id" });
    }

    const travelDateObj = new Date(travelDate);
    if (isNaN(travelDateObj)) {
      return res.status(400).json({ message: "Invalid travel date" });
    }

    const seatsCount = parseInt(seats, 10);
    if (seatsCount <= 0) {
      return res.status(400).json({ message: "Seats must be at least 1" });
    }

    const db = await getDb();
    const bus = await db
      .collection("buses")
      .findOne({ _id: new ObjectId(busId) });
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    if (bus.isActive === false) {
      return res.status(400).json({ message: "Bus is not available" });
    }

    const now = new Date();
    const bookedSeatsData = await db
      .collection("busBookings")
      .aggregate([
        {
          $match: {
            busId: busId.toString(),
            status: { $in: ["confirmed", "pending"] },
            travelDate: {
              $gte: new Date(travelDateObj.getTime() - 24 * 60 * 60 * 1000),
              $lt: new Date(travelDateObj.getTime() + 24 * 60 * 60 * 1000),
            },
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

    const bookedSeats = bookedSeatsData[0]?.total || 0;
    const availableSeats = (bus.totalSeats || 0) - bookedSeats;
    if (availableSeats < seatsCount) {
      return res.status(409).json({
        message: `Only ${availableSeats} seat(s) available for this bus on this date`,
      });
    }

    const totalAmount = bus.price * seatsCount;

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

    const tran_id = makeTranId("HT-BUS");

    // Store booking intent in payment_sessions — NOT in bookings yet
    await db.collection("payment_sessions").insertOne({
      tran_id,
      type: "bus",
      userId: req.user.id,
      busId,
      busName: bus.name,
      travelDate: travelDateObj,
      seats: seatsCount,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      pricePerSeat: bus.price,
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
      product_name: getProductName("bus", bus.name),
      product_category: "bus",
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
      num_of_item: seatsCount,
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

// POST /api/payment/initiate/carrent — Cox's Bazar service booking
router.post("/initiate/carrent", auth, async (req, res) => {
  if (req.app && req.app.get("paymentLimiter")) {
    await new Promise((resolve, reject) =>
      req.app.get("paymentLimiter")(req, res, (err) =>
        err ? reject(err) : resolve(),
      ),
    );
  }
  try {
    // Prevent staff and admin from booking
    if (req.user.role === "hotel_staff" || req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Staff and admin accounts cannot book services" });
    }

    const {
      serviceId,
      pickupDate,
      returnDate,
      seatsBooked,
      pickupLocation,
      contactNumber,
    } = req.body;

    if (!serviceId || !pickupDate || !returnDate || !seatsBooked) {
      return res.status(400).json({
        message:
          "serviceId, pickupDate, returnDate, and seatsBooked are required",
      });
    }
    if (!isValidObjectId(serviceId)) {
      return res.status(400).json({ message: "Invalid service id" });
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

    const seatsCount = parseInt(seatsBooked, 10);
    if (seatsCount <= 0) {
      return res.status(400).json({ message: "Seats must be at least 1" });
    }

    const db = await getDb();
    const service = await db
      .collection("carrent")
      .findOne({ _id: new ObjectId(serviceId) });
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.isActive === false) {
      return res.status(400).json({ message: "Service is not available" });
    }

    // Calculate available seats for the booking period
    const now = new Date();
    const bookedSeatsData = await db
      .collection("carrentBookings")
      .aggregate([
        {
          $match: {
            serviceId: serviceId.toString(),
            status: { $in: ["confirmed", "pending"] },
            returnDate: { $gte: now },
            $or: [
              {
                pickupDate: { $lt: returnDateObj },
                returnDate: { $gt: pickupDateObj },
              },
            ],
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

    const bookedSeats = bookedSeatsData[0]?.total || 0;
    const availableSeats =
      (service.quantity || service.totalSeats || 0) - bookedSeats;

    if (availableSeats < seatsCount) {
      return res.status(409).json({
        message: `Only ${availableSeats} car(s) available for this service during selected dates`,
      });
    }

    const totalAmount = service.price * seatsCount;

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

    const tran_id = makeTranId("HT-CARRENT");

    // Store booking intent in payment_sessions — NOT in bookings yet
    await db.collection("payment_sessions").insertOne({
      tran_id,
      type: "carrent",
      userId: req.user.id,
      serviceId: serviceId.toString(),
      serviceName: service.name,
      pickupDate: pickupDateObj,
      returnDate: returnDateObj,
      seatsBooked: seatsCount,
      pickupLocation: pickupLocation || "",
      contactNumber: contactNumber || "",
      pricePerSeat: service.price,
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
      product_name: getProductName("carrent", service.name),
      product_category: "carrent",
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
      num_of_item: seatsCount,
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

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION STATUS CHECK ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/payment/check-transaction?tran_id=...
// Check if a transaction has been confirmed (for frontend polling)
// NO AUTH REQUIRED - just checking if transaction exists
router.get("/check-transaction", async (req, res) => {
  const { tran_id } = req.query;
  if (!tran_id) return res.status(400).json({ confirmed: false });
  const confirmed = await _isTransactionAlreadyConfirmed(tran_id);
  res.json({ confirmed });
});

// ═══════════════════════════════════════════════════════════════════════════
// END MANUAL PAYMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

module.exports = router;
