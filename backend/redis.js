const redis = require("redis");

let redisClient = null;

/**
 * Initialize Redis client for production use
 * Handles session store, cache, rate limiting, and payment tracking
 */
async function initRedis() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("❌ Redis: Max reconnection attempts reached");
            return new Error("Max retries reached");
          }
          return Math.min(retries * 50, 500);
        },
        connectTimeout: 10000,
      },
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis Client Error", err);
      if (process.env.NODE_ENV === "production") {
        // In production, we may want to alert ops team
        // Could integrate with monitoring service here
      }
    });

    redisClient.on("connect", () => {
      console.log("✅ Connected to Redis");
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Reconnecting to Redis...");
    });

    await redisClient.connect();

    // Test connection
    await redisClient.ping();
    console.log("✅ Redis ping successful");

    return redisClient;
  } catch (err) {
    console.error("❌ Failed to initialize Redis:", err);
    if (process.env.NODE_ENV === "production") {
      throw err; // Fail fast in production
    }
    console.warn("⚠️  Falling back to memory store (dev mode only)");
    return null;
  }
}

/**
 * Get Redis client
 */
function getRedis() {
  return redisClient;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SESSION MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Store user session in Redis
 * @param {string} sessionId - Unique session identifier
 * @param {object} sessionData - User session data (user ID, role, etc.)
 * @param {number} ttl - Time to live in seconds (default: 7 days)
 */
async function setSession(sessionId, sessionData, ttl = 7 * 24 * 60 * 60) {
  if (!redisClient) return null;
  try {
    await redisClient.setEx(
      `session:${sessionId}`,
      ttl,
      JSON.stringify(sessionData),
    );
    return true;
  } catch (err) {
    console.error("❌ Failed to set session:", err.message);
    return null;
  }
}

/**
 * Retrieve user session from Redis
 */
async function getSession(sessionId) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("❌ Failed to get session:", err.message);
    return null;
  }
}

/**
 * Delete session (logout)
 */
async function deleteSession(sessionId) {
  if (!redisClient) return null;
  try {
    await redisClient.del(`session:${sessionId}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to delete session:", err.message);
    return null;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN BLACKLIST (For early token revocation)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Add JWT token to blacklist (logout, password change)
 * @param {string} token - JWT token to blacklist
 * @param {number} expiresIn - Seconds until token naturally expires
 */
async function blacklistToken(token, expiresIn = 7 * 24 * 60 * 60) {
  if (!redisClient) return null;
  try {
    await redisClient.setEx(`token:blacklist:${token}`, expiresIn, "1");
    return true;
  } catch (err) {
    console.error("❌ Failed to blacklist token:", err.message);
    return null;
  }
}

/**
 * Check if token is blacklisted
 */
async function isTokenBlacklisted(token) {
  if (!redisClient) return false;
  try {
    const result = await redisClient.get(`token:blacklist:${token}`);
    return result !== null;
  } catch (err) {
    console.error("❌ Failed to check token blacklist:", err.message);
    return false;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENT FRAUD DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Track user booking velocity (prevent spam bookings)
 * @param {string} userId - User ID
 * @returns {number} - Number of bookings in last hour
 */
async function trackUserBooking(userId) {
  if (!redisClient) return 0;
  try {
    const key = `bookings:${userId}:hourly`;
    const count = await redisClient.incr(key);

    // Set expiry only on first increment
    if (count === 1) {
      await redisClient.expire(key, 3600); // 1 hour expiry
    }

    return count;
  } catch (err) {
    console.error("❌ Failed to track booking:", err.message);
    return 0;
  }
}

/**
 * Check for duplicate bookings (same user, same room, same dates)
 * @param {string} bookingHash - Hash of user+roomId+checkIn+checkOut
 * @returns {boolean} - True if duplicate detected
 */
async function checkDuplicateBooking(bookingHash) {
  if (!redisClient) return false;
  try {
    const key = `booking:dup:${bookingHash}`;
    const exists = await redisClient.exists(key);

    // Mark this booking combination for next 24 hours
    if (!exists) {
      await redisClient.setEx(key, 24 * 60 * 60, "1");
    }

    return exists === 1;
  } catch (err) {
    console.error("❌ Failed to check duplicate booking:", err.message);
    return false;
  }
}

/**
 * Track failed payment attempts (detect brute force attacks)
 * @param {string} userId - User ID
 * @returns {number} - Number of failed attempts in last hour
 */
async function trackFailedPayment(userId) {
  if (!redisClient) return 0;
  try {
    const key = `payments:failed:${userId}`;
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, 3600);
    }

    return count;
  } catch (err) {
    console.error("❌ Failed to track payment attempt:", err.message);
    return 0;
  }
}

/**
 * Reset failed payment tracking (successful payment)
 */
async function resetFailedPayments(userId) {
  if (!redisClient) return null;
  try {
    await redisClient.del(`payments:failed:${userId}`);
    return true;
  } catch (err) {
    console.error("❌ Failed to reset payment attempts:", err.message);
    return null;
  }
}

/**
 * Track large payment attempts (unusual activity)
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @param {number} maxDaily - Maximum amount per day (default: 100000 BDT)
 * @returns {number} - Total amount user has paid today
 */
async function trackLargePayment(userId, amount, maxDaily = 100000) {
  if (!redisClient) return amount;
  try {
    const key = `payments:daily:${userId}`;
    const total = await redisClient.incrByFloat(key, amount);

    if ((await redisClient.ttl(key)) === -1) {
      // First entry - set 24 hour expiry
      await redisClient.expire(key, 24 * 60 * 60);
    }

    return total;
  } catch (err) {
    console.error("❌ Failed to track large payment:", err.message);
    return amount;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN ACTION AUDIT TRAIL
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Log admin action for audit trail
 * @param {string} adminId - Admin user ID
 * @param {string} action - Action name (approve_payment, refund, etc.)
 * @param {object} details - Action details
 */
async function logAdminAction(adminId, action, details = {}) {
  if (!redisClient) return null;
  try {
    const key = `audit:admin:${adminId}`;
    const logEntry = {
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    // Use list for ordered audit trail (FIFO)
    await redisClient.lPush(key, JSON.stringify(logEntry));

    // Keep last 1000 actions per admin
    await redisClient.lTrim(key, 0, 999);

    // Set expiry: 30 days
    await redisClient.expire(key, 30 * 24 * 60 * 60);

    return true;
  } catch (err) {
    console.error("❌ Failed to log admin action:", err.message);
    return null;
  }
}

/**
 * Get admin audit trail
 * @param {string} adminId - Admin user ID
 * @param {number} limit - Number of entries to retrieve (default: 50)
 */
async function getAdminAuditTrail(adminId, limit = 50) {
  if (!redisClient) return [];
  try {
    const key = `audit:admin:${adminId}`;
    const logs = await redisClient.lRange(key, 0, limit - 1);
    return logs.map((log) => JSON.parse(log));
  } catch (err) {
    console.error("❌ Failed to get audit trail:", err.message);
    return [];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RATE LIMITING (Distributed across server instances)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Check if request should be rate limited
 * @param {string} key - Rate limit key (e.g., user_id, ip_address)
 * @param {number} limit - Max requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {object} - { allowed: boolean, remaining: number, resetAt: date }
 */
async function checkRateLimit(key, limit, windowSeconds) {
  if (!redisClient) {
    // Fallback: allow all requests if Redis unavailable
    return { allowed: true, remaining: limit, resetAt: new Date() };
  }

  try {
    const limitKey = `ratelimit:${key}`;
    const count = await redisClient.incr(limitKey);

    if (count === 1) {
      await redisClient.expire(limitKey, windowSeconds);
    }

    const ttl = await redisClient.ttl(limitKey);
    const resetAt = new Date(Date.now() + ttl * 1000);

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetAt };
  } catch (err) {
    console.error("❌ Rate limit check failed:", err.message);
    return { allowed: true, remaining: limit, resetAt: new Date() };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Set cache value
 */
async function setCacheValue(key, value, ttl = 3600) {
  if (!redisClient) return null;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("❌ Cache set failed:", err.message);
    return null;
  }
}

/**
 * Get cache value
 */
async function getCacheValue(key) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("❌ Cache get failed:", err.message);
    return null;
  }
}

/**
 * Delete cache value
 */
async function deleteCacheValue(key) {
  if (!redisClient) return null;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.error("❌ Cache delete failed:", err.message);
    return null;
  }
}

module.exports = {
  initRedis,
  getRedis,
  // Sessions
  setSession,
  getSession,
  deleteSession,
  // Token Blacklist
  blacklistToken,
  isTokenBlacklisted,
  // Payment Fraud Detection
  trackUserBooking,
  checkDuplicateBooking,
  trackFailedPayment,
  resetFailedPayments,
  trackLargePayment,
  // Admin Audit Trail
  logAdminAction,
  getAdminAuditTrail,
  // Rate Limiting
  checkRateLimit,
  // Cache
  setCacheValue,
  getCacheValue,
  deleteCacheValue,
};
