/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED PAYMENT FRAUD DETECTION & VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

const crypto = require("crypto");

/**
 * Generate hash for duplicate detection
 * Detects: Same user booking same room/dates
 */
function generateBookingHash(userId, itemId, checkIn, checkOut) {
  const combined = `${userId}:${itemId}:${new Date(checkIn).getTime()}:${new Date(checkOut).getTime()}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Generate hash for package bookings
 */
function generatePackageBookingHash(userId, packageId, travelDate) {
  const combined = `${userId}:${packageId}:${new Date(travelDate).getTime()}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Validate payment and check for fraud patterns
 * @param {object} options - Validation options
 * @returns {object} - { valid: boolean, error: string, warnings: [] }
 */
async function validatePaymentRequest(options) {
  const {
    userId,
    amount,
    type, // 'hotel', 'car', 'package', 'coin'
    itemId, // roomId, carId, packageId, null for coins
    checkIn, // For hotel
    checkOut, // For hotel
    redisClient,
  } = options;

  const warnings = [];
  const errors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. AMOUNT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Check for negative or zero amount
  if (amount <= 0) {
    errors.push("Invalid payment amount");
  }

  // Check for suspiciously large amounts
  if (amount > 500000) {
    // 500k BDT
    warnings.push(
      `Large payment detected: ${amount} BDT. May require additional verification.`,
    );
  }

  // Check for unusual amounts (potential testing with stolen cards)
  if (amount < 10) {
    warnings.push("Unusually small payment amount");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. VELOCITY CHECKS (Prevent spam/abuse)
  // ═══════════════════════════════════════════════════════════════════════════

  if (redisClient) {
    try {
      // Check bookings per hour
      const bookingsThisHour = await redisClient.get(
        `bookings:${userId}:hourly`,
      );
      if (bookingsThisHour && parseInt(bookingsThisHour) > 20) {
        errors.push("Too many booking attempts. Please try again later.");
      }

      // Check for duplicate booking (same room/dates within 24 hours)
      if (type === "hotel" && itemId && checkIn && checkOut) {
        const bookingHash = generateBookingHash(
          userId,
          itemId,
          checkIn,
          checkOut,
        );
        const isDuplicate = await redisClient.exists(
          `booking:dup:${bookingHash}`,
        );
        if (isDuplicate) {
          warnings.push("Duplicate booking detected for same room/dates");
        }
      }

      // Check daily total payments
      const dailyTotal = await redisClient.get(`payments:daily:${userId}`);
      const newTotal = parseFloat(dailyTotal || 0) + amount;
      if (newTotal > 250000) {
        // 250k BDT daily limit
        errors.push(
          `Daily payment limit exceeded. Remaining: ${250000 - parseFloat(dailyTotal || 0)} BDT`,
        );
      }

      // Check failed payment attempts
      const failedAttempts = await redisClient.get(`payments:failed:${userId}`);
      if (failedAttempts && parseInt(failedAttempts) > 5) {
        errors.push(
          "Too many failed payment attempts. Please contact support.",
        );
      }
    } catch (err) {
      console.error("Redis check failed (non-critical):", err.message);
      // Continue validation even if Redis is down
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. FREQUENCY PATTERN DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  if (redisClient && type !== "coin") {
    try {
      // Get user's last 5 bookings
      const lastBookings = await redisClient.lRange(
        `user:bookings:${userId}`,
        0,
        4,
      );

      if (lastBookings && lastBookings.length > 2) {
        const bookings = lastBookings.map((b) => JSON.parse(b));
        const timeDiffs = [];

        for (let i = 0; i < bookings.length - 1; i++) {
          const diff = bookings[i].timestamp - bookings[i + 1].timestamp;
          timeDiffs.push(diff);
        }

        // If all bookings within 1 minute, likely automated attack
        if (timeDiffs.every((diff) => diff < 60000)) {
          warnings.push("Rapid successive bookings detected");
        }
      }
    } catch (err) {
      console.error("Booking history check failed:", err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Return validation result
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    shouldRequireAdditionalVerification:
      warnings.length > 0 || errors.length > 0,
  };
}

/**
 * Compare server-calculated price with client-submitted price
 * Prevents price tampering
 */
function validatePaymentAmount(clientAmount, serverAmount, tolerance = 1) {
  const diff = Math.abs(clientAmount - serverAmount);
  if (diff > tolerance) {
    return false; // Price mismatch - potential tampering
  }
  return true;
}

/**
 * Detect potentially fraudulent user behavior
 */
async function analyzeUserBehavior(userId, redisClient) {
  if (!redisClient) return { riskScore: 0, flags: [] };

  const flags = [];
  let riskScore = 0;

  try {
    // Check 1: Multiple payment methods
    const uniquePaymentMethods = await redisClient.sCard(
      `user:payment_methods:${userId}`,
    );
    if (uniquePaymentMethods > 5) {
      flags.push("Multiple payment methods used");
      riskScore += 10;
    }

    // Check 2: Geographic anomaly (if tracking IP)
    // Could check if login IP differs significantly from payment IP
    const lastLoginIp = await redisClient.get(`user:last_ip:${userId}`);
    if (lastLoginIp) {
      // Compare with current request IP (passed separately)
      // This would require IP geolocation library
    }

    // Check 3: Account age (new accounts higher risk)
    const createdAt = await redisClient.get(`user:created_at:${userId}`);
    if (createdAt) {
      const accountAgeMs = Date.now() - parseInt(createdAt);
      const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
      if (accountAgeDays < 1) {
        flags.push("New account (less than 1 day old)");
        riskScore += 20;
      }
      if (accountAgeDays < 7) {
        flags.push("New account (less than 7 days old)");
        riskScore += 10;
      }
    }

    // Check 4: Email verification
    const emailVerified = await redisClient.get(
      `user:email_verified:${userId}`,
    );
    if (!emailVerified) {
      flags.push("Email not verified");
      riskScore += 15;
    }

    // Check 5: Phone verification (if implemented)
    const phoneVerified = await redisClient.get(
      `user:phone_verified:${userId}`,
    );
    if (!phoneVerified) {
      flags.push("Phone not verified");
      riskScore += 10;
    }
  } catch (err) {
    console.error("User behavior analysis error:", err.message);
  }

  return {
    riskScore: Math.min(riskScore, 100), // Cap at 100
    flags,
    shouldReviewByAdmin: riskScore > 50,
  };
}

/**
 * Generate payment audit trail entry
 */
function createPaymentAuditEntry(options) {
  return {
    timestamp: new Date().toISOString(),
    userId: options.userId,
    amount: options.amount,
    currency: options.currency || "BDT",
    type: options.type,
    itemId: options.itemId,
    status: options.status,
    tranId: options.tranId,
    paymentMethod: options.paymentMethod,
    requestId: options.requestId,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    validationResult: options.validationResult,
    riskScore: options.riskScore,
  };
}

/**
 * Check if transaction is blocked due to suspicious activity
 */
async function isTransactionBlocked(userId, redisClient) {
  if (!redisClient) return false;

  try {
    const blocked = await redisClient.get(`payment:blocked:${userId}`);
    return blocked === "1";
  } catch (err) {
    console.error("Transaction block check failed:", err.message);
    return false;
  }
}

/**
 * Block user from making transactions (temporary)
 */
async function blockUserTransactions(
  userId,
  durationSeconds = 3600,
  reason = "",
) {
  if (!redisClient) return null;

  try {
    await redisClient.setEx(
      `payment:blocked:${userId}`,
      durationSeconds,
      reason || "Suspicious activity",
    );
    return true;
  } catch (err) {
    console.error("Failed to block user:", err.message);
    return null;
  }
}

/**
 * Whitelist a transaction after admin review
 */
async function whitelistTransaction(tranId, redisClient) {
  if (!redisClient) return null;

  try {
    // Store in whitelist for 30 days (for recurring checks)
    await redisClient.setEx(
      `transaction:whitelisted:${tranId}`,
      30 * 24 * 60 * 60,
      "1",
    );
    return true;
  } catch (err) {
    console.error("Failed to whitelist transaction:", err.message);
    return null;
  }
}

module.exports = {
  generateBookingHash,
  generatePackageBookingHash,
  validatePaymentRequest,
  validatePaymentAmount,
  analyzeUserBehavior,
  createPaymentAuditEntry,
  isTransactionBlocked,
  blockUserTransactions,
  whitelistTransaction,
};
