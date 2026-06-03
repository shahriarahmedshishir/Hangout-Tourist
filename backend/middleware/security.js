/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED ERROR HANDLER MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════════
 * Prevents information disclosure; logs errors server-side only
 */

const { v4: uuidv4 } = require("uuid");

/**
 * Error logging with request ID for audit trail
 */
function logError(requestId, error, context = {}) {
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    errorMessage: error.message,
    errorStack: error.stack,
    context,
    environment: process.env.NODE_ENV,
  };

  if (process.env.NODE_ENV === "production") {
    // In production, integrate with logging service (ELK, CloudWatch, etc.)
    console.error(JSON.stringify(errorLog));
    // Example: Send to external logging
    // sendToLoggingService(errorLog);
  } else {
    console.error(errorLog);
  }

  return requestId;
}

/**
 * Generic error response (no sensitive details)
 */
function sendGenericError(res, statusCode, message, requestId) {
  res.status(statusCode).json({
    error: message,
    requestId, // User can report this for support investigation
    timestamp: new Date().toISOString(),
  });
}

/**
 * Middleware: Attach request ID to every request
 */
function requestIdMiddleware(req, res, next) {
  req.id = uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
}

/**
 * Wrapper for async route handlers with error handling
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      const requestId = logError(req.id, err, {
        endpoint: req.path,
        method: req.method,
        userId: req.user?.id || "anonymous",
      });

      // Handle specific error types
      if (err.name === "ValidationError") {
        return sendGenericError(
          res,
          400,
          "Validation error. Please check your input.",
          requestId,
        );
      }

      if (err.name === "UnauthorizedError") {
        return sendGenericError(res, 401, "Unauthorized", requestId);
      }

      if (err.name === "ForbiddenError") {
        return sendGenericError(res, 403, "Access denied", requestId);
      }

      if (err.name === "NotFoundError") {
        return sendGenericError(res, 404, "Resource not found", requestId);
      }

      // Default: 500 with generic message
      sendGenericError(
        res,
        500,
        "An unexpected error occurred. Please try again later.",
        requestId,
      );
    });
  };
}

/**
 * Global error handler middleware (must be last)
 */
function globalErrorHandler(err, req, res, next) {
  const requestId = req.id || uuidv4();

  const errorContext = {
    endpoint: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    userId: req.user?.id || "anonymous",
    ip: req.ip,
  };

  logError(requestId, err, errorContext);

  // Don't send error stack to client
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Internal server error";

  res.status(statusCode).json({
    error: message,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CSRF PROTECTION MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════════
 */

const csrf = require("csurf");
const session = require("express-session");

// Extend session with Redis store in production
let csrfProtection;

function initCsrfProtection() {
  // CSRF with double-submit cookie pattern
  csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  });
  return csrfProtection;
}

function getCsrfProtection() {
  return (
    csrfProtection ||
    csrf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      },
    })
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECURITY HEADERS MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════════
 */

function securityHeadersMiddleware(req, res, next) {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent referrer leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=())",
  );

  next();
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUEST LOGGING MIDDLEWARE (For audit trail)
 * ═══════════════════════════════════════════════════════════════════════════
 */

function auditLoggingMiddleware(req, res, next) {
  const start = Date.now();

  // Intercept response to log it
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    // Log important operations
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const auditLog = {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        userId: req.user?.id || "anonymous",
        userRole: req.user?.role || "guest",
        duration: `${duration}ms`,
        ip: req.ip,
      };

      // Log payment operations more verbosely
      if (req.path.includes("/payment") || req.path.includes("/booking")) {
        auditLog.body = req.body; // Consider filtering sensitive fields
      }

      if (process.env.NODE_ENV === "production") {
        console.log(JSON.stringify(auditLog));
        // Send to audit logging service
      } else {
        console.log(auditLog);
      }
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUSPICIOUS ACTIVITY DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Detect and block suspicious payment requests
 * Returns true if request looks suspicious
 */
async function detectSuspiciousPayment(userId, amount, redisClient) {
  if (!redisClient) return false;

  try {
    // Check 1: Multiple payment failures in short time
    const failedPayments = await redisClient.get(`payments:failed:${userId}`);
    if (parseInt(failedPayments || 0) > 5) {
      console.warn(`🚨 Suspicious: ${userId} has 5+ failed payments`);
      return true;
    }

    // Check 2: Unusually large amount
    const dailyTotal = await redisClient.get(`payments:daily:${userId}`);
    if (
      dailyTotal &&
      parseFloat(dailyTotal) + amount > 100000 // 100k BDT daily limit
    ) {
      console.warn(`🚨 Suspicious: ${userId} exceeded daily limit`);
      return true;
    }

    // Check 3: Rapid successive requests from same user
    const recentRequests = await redisClient.incr(`payment:velocity:${userId}`);
    if (recentRequests === 1) {
      await redisClient.expire(`payment:velocity:${userId}`, 60);
    }
    if (recentRequests > 10) {
      // 10+ payment attempts in 60 seconds
      console.warn(`🚨 Suspicious: ${userId} velocity exceeded`);
      return true;
    }

    return false;
  } catch (err) {
    console.error("Error detecting suspicious activity:", err.message);
    return false; // Fail open: allow request if check fails
  }
}

module.exports = {
  // Error Handling
  requestIdMiddleware,
  asyncHandler,
  globalErrorHandler,
  sendGenericError,
  logError,
  // CSRF
  initCsrfProtection,
  getCsrfProtection,
  // Security Headers
  securityHeadersMiddleware,
  // Audit Logging
  auditLoggingMiddleware,
  // Fraud Detection
  detectSuspiciousPayment,
};
