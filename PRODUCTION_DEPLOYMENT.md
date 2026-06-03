# 🚀 Production Deployment Checklist & Configuration Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# .env.production (DO NOT commit to git)
NODE_ENV=production

# Core
PORT=5001
JWT_SECRET=<GENERATE-STRONG-RANDOM-STRING> # Use: openssl rand -base64 32
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hangouttourist?retryWrites=true&w=majority
DB_NAME=hangouttourist

# Frontend
CLIENT_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# SSL Commerz (Production)
SSLCOMMERZ_STORE_ID=<YOUR_PROD_STORE_ID>
SSLCOMMERZ_STORE_PASSWORD=<YOUR_PROD_PASSWORD>
SSLCOMMERZ_CALLBACK_SECRET=<STRONG-RANDOM-KEY> # Must be configured in SSLCommerz merchant panel
SSLCOMMERZ_IPS=192.168.0.1,192.168.0.2  # Get from SSLCommerz support

# AWS SES (Email)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<YOUR_IAM_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_IAM_SECRET_KEY>
AWS_SES_FROM_EMAIL=noreply@your-domain.com

# Redis (Production)
REDIS_URL=redis://default:password@redis-host:6379
# Or for Redis Cluster:
# REDIS_URL=redis://default:password@redis-cluster-1:6379,redis-cluster-2:6379,redis-cluster-3:6379

# Logging
LOG_LEVEL=error
LOG_FORMAT=json

# Security
CORS_ALLOWED_ORIGINS=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# Payment Limits
MAX_DAILY_PAYMENT_PER_USER=250000  # BDT
MAX_TRANSACTION_AMOUNT=100000      # BDT
```

### 2. Security Configurations

#### Update `backend/package.json`

Add required packages:

```bash
npm install redis uuid
```

#### Update `backend/server.js`

```javascript
// At the very top of server.js
const { initRedis } = require("./redis");
const {
  requestIdMiddleware,
  globalErrorHandler,
  securityHeadersMiddleware,
  auditLoggingMiddleware,
} = require("./middleware/security");

// Initialize Redis
(async () => {
  const redis = await initRedis();
  if (!redis && process.env.NODE_ENV === "production") {
    console.error("❌ FATAL: Redis not available in production");
    process.exit(1);
  }
})();

// Add middlewares EARLY (before routes)
app.use(requestIdMiddleware); // Add request IDs
app.use(securityHeadersMiddleware); // Add security headers
app.use(auditLoggingMiddleware); // Log all requests

// ... existing middleware ...

// Add error handler LAST (after all routes)
app.use(globalErrorHandler); // Global error handler
```

#### Update `backend/routes/payment.js`

```javascript
// At the top of the file
const {
  validatePaymentRequest,
  analyzeUserBehavior,
  createPaymentAuditEntry,
  isTransactionBlocked,
} = require("../utils/paymentFraudDetection");
const { trackLargePayment, logAdminAction } = require("../redis");

// In the hotel payment initiate endpoint, add:
router.post("/initiate/hotel", auth, async (req, res) => {
  // ... existing validation code ...

  // NEW: Fraud detection
  const redis = getRedis();

  // Check if user is blocked
  const isBlocked = await isTransactionBlocked(req.user.id, redis);
  if (isBlocked) {
    return res.status(403).json({
      message:
        "Your account has been temporarily restricted due to suspicious activity",
    });
  }

  // Validate payment
  const validation = await validatePaymentRequest({
    userId: req.user.id,
    amount: totalAmount,
    type: "hotel",
    itemId: hotelId,
    checkIn,
    checkOut,
    redisClient: redis,
  });

  if (!validation.valid) {
    return res.status(400).json({
      message: validation.errors[0],
      errors: validation.errors,
    });
  }

  if (validation.warnings.length > 0) {
    console.warn(
      `⚠️ Payment warnings for ${req.user.id}:`,
      validation.warnings,
    );
  }

  // Track payment for analytics
  await trackLargePayment(req.user.id, totalAmount, redis);

  // Continue with existing payment logic...
});

// In the success/callback endpoint, add audit logging:
router.post("/success", verifyPaymentCallback, async (req, res) => {
  // ... existing code ...

  const redis = getRedis();
  const auditEntry = createPaymentAuditEntry({
    userId: req.user?.id,
    amount: req.body.amount,
    type: req.body.product_category,
    tranId: req.body.tran_id,
    status: "success",
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Log to Redis or database
  await redis?.lPush(`audit:payments`, JSON.stringify(auditEntry));
});
```

### 3. Database Configuration

#### MongoDB

```bash
# Enable authentication
db.createUser({
  user: "hangouttourist",
  pwd: "<STRONG-PASSWORD>",
  roles: [{ role: "readWrite", db: "hangouttourist" }]
})

# Create indexes for performance
db.hotels.createIndex({ "name": 1 })
db.bookings.createIndex({ "userId": 1, "status": 1 })
db.bookings.createIndex({ "roomId": 1, "status": 1 })
db.users.createIndex({ "email": 1 })

# TTL index for payment sessions (auto-delete after 5 minutes)
db.payment_sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 300 })
```

#### Redis

```bash
# For local Redis installation:
redis-server --requirepass <STRONG-PASSWORD>

# For production Redis Cluster or AWS ElastiCache:
# Ensure persistence is enabled (RDB or AOF)
# Configure max memory policies: maxmemory-policy allkeys-lru

# Add Redis monitoring
redis-cli CONFIG SET loglevel debug
redis-cli MONITOR  # Real-time command monitoring
```

### 4. Application Integration Steps

#### Step 1: Update package.json and install

```bash
npm install redis uuid
```

#### Step 2: Configure Redis in server.js

- Import `initRedis` from `./redis.js`
- Call `initRedis()` on server startup
- Handle Redis connection errors

#### Step 3: Add middleware to server.js

- Add `requestIdMiddleware` early
- Add `auditLoggingMiddleware`
- Add `globalErrorHandler` last

#### Step 4: Update payment routes

- Import fraud detection utilities
- Add validation to payment initiation endpoints
- Log suspicious transactions
- Track user behavior

#### Step 5: Add admin routes (optional but recommended)

```javascript
// backend/routes/admin-payments.js
const express = require("express");
const router = express.Router();
const { auth, role } = require("../middleware/auth");
const { getRedis, logAdminAction } = require("../redis");

// GET /api/admin/payments/suspicious
// Returns transactions flagged as suspicious
router.get("/payments/suspicious", auth, role("admin"), async (req, res) => {
  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ message: "System maintenance in progress" });
  }

  try {
    const suspiciousPayments = await redis.lRange(
      "audit:payments:suspicious",
      0,
      99,
    );
    res.json({
      suspicious: suspiciousPayments.map((p) => JSON.parse(p)),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to retrieve transactions" });
  }
});

// POST /api/admin/payments/:tranId/approve
// Admin approves a flagged transaction
router.post(
  "/payments/:tranId/approve",
  auth,
  role("admin"),
  async (req, res) => {
    const redis = getRedis();
    try {
      await logAdminAction(req.user.id, "approve_payment", {
        tranId: req.params.tranId,
        reason: req.body.reason,
      });

      // Whitelist the transaction
      await redis?.set(`payment:approved:${req.params.tranId}`, "1", {
        EX: 30 * 24 * 60 * 60, // 30 days
      });

      res.json({ message: "Payment approved" });
    } catch (err) {
      res.status(500).json({ message: "Failed to approve payment" });
    }
  },
);

module.exports = router;
```

### 5. Monitoring & Alerting

#### Key Metrics to Monitor

```javascript
// Add to monitoring/alerting service:

// 1. Payment metrics
- Payment success rate
- Payment failure rate
- Average payment amount
- High-value transaction count

// 2. Security metrics
- Failed login attempts per hour
- Rate limit hits
- Suspicious payment flags
- Admin action audit trail

// 3. System metrics
- Redis connection status
- MongoDB connection status
- API response time (P50, P95, P99)
- Error rate by endpoint
- Request queue depth
```

#### Alert Thresholds

```
Critical:
  - Redis connection down → Immediate notification
  - Payment callback failures > 10% → Page on-call

Warning:
  - Suspicious payments > 5 in 1 hour → Email to payment team
  - Failed logins > 20 in 1 hour → Email to security team
  - Admin actions on high-value payments → Audit log review
```

### 6. Testing Before Production

```bash
# 1. Test Redis connection
npm run test:redis

# 2. Test payment flow (SSLCommerz sandbox)
npm run test:payments

# 3. Test error handling
npm run test:errors

# 4. Test rate limiting
npm run test:ratelimit

# 5. Load testing
npm run test:load

# 6. Security scanning
npm audit
npm audit fix
snyk test
```

### 7. Deployment Steps

```bash
# 1. Build/prepare application
npm run build

# 2. Run database migrations (if needed)
npm run migrate:prod

# 3. Start application with PM2
pm2 start ecosystem.config.js --env production

# 4. Verify Redis is connected
pm2 logs

# 5. Test critical endpoints
curl https://api.your-domain.com/api/payment/status

# 6. Enable monitoring
pm2 start ecosystem.config.js --env production --max-memory-restart 500M
```

### 8. Post-Deployment Validation

- [ ] All environment variables set correctly
- [ ] Redis connected and responding
- [ ] Database authentication working
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] CORS only allows production domain
- [ ] Rate limiting working (test with rapid requests)
- [ ] Error responses don't leak sensitive info
- [ ] Request IDs logged for all requests
- [ ] Payment callback verification working
- [ ] Admin audit trails being created

### 9. Ongoing Maintenance

**Daily:**

- Check error logs for anomalies
- Review failed payment attempts
- Monitor Redis memory usage

**Weekly:**

- Review admin audit trails
- Analyze payment patterns
- Check SSL certificate expiry

**Monthly:**

- Rotate API keys/passwords
- Review and update security rules
- Audit user accounts for compromise

**Quarterly:**

- Security penetration testing
- Dependency updates
- Database backup verification

---

## 📞 Support & Emergency Contacts

- **Payment Gateway Support:** support@sslcommerz.com
- **AWS Support:** https://console.aws.amazon.com/support
- **Redis Support:** https://redis.io/
- **Internal On-Call:** [Add your on-call contact]

---

## ⚠️ Critical Security Reminders

1. **Never commit `.env.production` to Git**
2. **Always use HTTPS in production**
3. **Rotate JWT_SECRET every 6 months**
4. **Keep dependencies updated (`npm audit fix`)**
5. **Monitor Redis for unauthorized access**
6. **Enable database backups & test restores**
7. **Log all admin actions**
8. **Review suspicious transactions daily**
