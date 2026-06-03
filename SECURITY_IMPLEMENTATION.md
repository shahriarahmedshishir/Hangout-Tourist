# 🔐 Security Implementation Guide - Hangout Tourist

## Quick Start for Production Implementation

This guide walks through integrating all security enhancements into your application.

---

## 📦 What We've Added

### 1. **Redis Integration** (`backend/redis.js`)

✅ Session management across multiple servers  
✅ Payment fraud detection tracking  
✅ Admin audit trails  
✅ Token blacklist for early logout  
✅ Distributed rate limiting

### 2. **Security Middleware** (`backend/middleware/security.js`)

✅ Request ID tracking for audit trails  
✅ Enhanced error handling (no info leakage)  
✅ CSRF protection  
✅ Security headers  
✅ Audit logging for state-changing operations

### 3. **Payment Fraud Detection** (`backend/utils/paymentFraudDetection.js`)

✅ Duplicate booking detection  
✅ User velocity checking (prevent spam)  
✅ Suspicious user behavior analysis  
✅ Daily payment limits enforcement  
✅ Automatic audit trail creation

### 4. **Comprehensive Security Audit** (`SECURITY_AUDIT.md`)

✅ 11 security issues identified  
✅ Fix priority levels (Critical, Medium, Low)  
✅ Implementation recommendations

### 5. **Production Deployment Guide** (`PRODUCTION_DEPLOYMENT.md`)

✅ Complete environment setup  
✅ Security configurations  
✅ Monitoring & alerting  
✅ Testing checklist

---

## 🚀 Implementation Steps (In Order)

### Phase 1: Install Dependencies ✅ DONE

```bash
npm install redis uuid express-session
```

### Phase 2: Update Core Files (30 minutes)

#### Step 1: Update `backend/server.js`

Add at the very top (after imports):

```javascript
const { initRedis } = require("./redis");
const {
  requestIdMiddleware,
  securityHeadersMiddleware,
  auditLoggingMiddleware,
  globalErrorHandler,
} = require("./middleware/security");

// Initialize Redis before starting server
(async () => {
  try {
    const redis = await initRedis();
    console.log("✅ Redis initialized");
  } catch (err) {
    console.error("⚠️ Redis initialization failed (dev mode)");
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
})();
```

Add middleware EARLY (before routes):

```javascript
app.use(requestIdMiddleware); // Line ~110
app.use(securityHeadersMiddleware); // Line ~111
app.use(auditLoggingMiddleware); // Line ~112
```

Add error handler LAST (after all routes):

```javascript
app.use(globalErrorHandler); // Before server.listen()
```

#### Step 2: Update `backend/routes/payment.js`

Add imports:

```javascript
const {
  validatePaymentRequest,
  analyzeUserBehavior,
  createPaymentAuditEntry,
  isTransactionBlocked,
} = require("../utils/paymentFraudDetection");
const { trackLargePayment, logAdminAction, getRedis } = require("../redis");
```

In the hotel payment initiate endpoint (~line 160), add fraud detection:

```javascript
router.post("/initiate/hotel", auth, async (req, res) => {
  try {
    // ... existing validation ...

    // NEW: Fraud detection
    const redis = getRedis();

    if (redis) {
      // Check if user is blocked
      const isBlocked = await isTransactionBlocked(req.user.id, redis);
      if (isBlocked) {
        return res.status(403).json({
          message:
            "Your account has been restricted due to suspicious activity",
        });
      }

      // Validate payment request
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

      // Track payment amount
      await trackLargePayment(req.user.id, totalAmount);
    }

    // ... continue with existing payment logic ...
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});
```

In the payment success callback, add audit logging:

```javascript
router.post("/success", verifyPaymentCallback, async (req, res) => {
  try {
    // ... existing validation ...

    const redis = getRedis();

    // Log payment for audit trail
    if (redis) {
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

      await redis.lPush("audit:payments", JSON.stringify(auditEntry));
    }

    // ... continue with existing logic ...
  } catch (err) {
    // Now using generic error from globalErrorHandler
    throw err;
  }
});
```

#### Step 3: Update `backend/routes/manual-payment.js`

Add rate limiting:

```javascript
const { checkRateLimit } = require("../redis");

router.post("/initiate/hotel", auth, async (req, res) => {
  try {
    const redis = getRedis();

    // NEW: Rate limit manual payments
    if (redis) {
      const rateLimitCheck = await checkRateLimit(
        `manual:${req.user.id}`,
        5, // Max 5 attempts
        3600, // Per hour
      );

      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          message: `Too many manual payment attempts. Retry in ${Math.ceil(rateLimitCheck.resetAt - Date.now() / 1000)} seconds`,
        });
      }
    }

    // ... existing code ...
  } catch (err) {
    throw err;
  }
});
```

### Phase 3: Configure Environment Variables (15 minutes)

Create `.env.production` (DO NOT commit to git):

```bash
NODE_ENV=production
PORT=5001

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hangouttourist
DB_NAME=hangouttourist

# Security
JWT_SECRET=<generate-with: openssl rand -base64 32>
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Redis
REDIS_URL=redis://default:password@redis-host:6379

# Payment (SSLCommerz Production)
SSLCOMMERZ_STORE_ID=<your_prod_id>
SSLCOMMERZ_STORE_PASSWORD=<your_prod_password>
SSLCOMMERZ_CALLBACK_SECRET=<generate-with: openssl rand -base64 32>

# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
AWS_SES_FROM_EMAIL=noreply@your-domain.com

# URLs
CLIENT_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
```

### Phase 4: Database Setup (15 minutes)

#### MongoDB Indexes

```bash
# Connect to your MongoDB and run:
db.hotels.createIndex({ "name": 1 })
db.bookings.createIndex({ "userId": 1, "status": 1 })
db.bookings.createIndex({ "roomId": 1, "status": 1 })
db.users.createIndex({ "email": 1 })
db.payment_sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 300 })
```

#### Redis Setup

```bash
# Local Redis (dev)
redis-server --requirepass your_password

# Or use managed Redis (AWS ElastiCache, Redis Cloud, etc.)
# Ensure persistence is enabled
```

### Phase 5: Testing (30 minutes)

#### Test 1: Redis Connection

```bash
# In Node REPL:
const { initRedis } = require("./redis");
const redis = await initRedis();
await redis.ping(); // Should return "PONG"
```

#### Test 2: Error Handling

```bash
# Make a request to any endpoint
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"invalid": "request"}'

# Response should NOT show stack trace:
# {"error":"Validation error. Please check your input.","requestId":"xxx"}
```

#### Test 3: Request IDs

```bash
curl -v http://localhost:5001/api/payment/health

# Response headers should include:
# X-Request-ID: xxx
```

#### Test 4: Fraud Detection

```bash
# Try to make multiple bookings rapidly
# Should be rate limited and return: "Too many booking attempts"
```

### Phase 6: Deploy to Production (Follow deployment guide)

---

## 📊 Monitoring Setup

### 1. Request ID Logging

Every request now has a unique ID. Use it to track issues:

```bash
# Find all logs for a specific request
grep "requestId: abc123def456" /var/log/app.log
```

### 2. Payment Audit Trail

All payment transactions are logged in Redis:

```javascript
// Retrieve payment audit logs
const logs = await redis.lRange("audit:payments", 0, -1);
```

### 3. Admin Actions

All admin actions are tracked:

```javascript
// Get admin's action history
const actions = await redis.lRange("audit:admin:adminUserId", 0, 49);
```

---

## 🛡️ Security Checklist

Before going live, verify:

- [ ] Redis is connected and working
- [ ] Error responses don't show stack traces
- [ ] Request IDs are being logged
- [ ] Rate limiting is working (test by making rapid requests)
- [ ] Fraud detection is triggering on test cases
- [ ] Admin audit trail is being created
- [ ] Payment callbacks are being verified (HMAC or IP)
- [ ] HTTPS is enforced
- [ ] CORS only allows production domain
- [ ] Environment variables are set correctly
- [ ] Database has proper authentication
- [ ] Backups are automated

---

## 🚨 Troubleshooting

### Redis Connection Failing

```bash
# Check Redis is running
redis-cli ping

# Check credentials in .env
echo $REDIS_URL

# Verify network connectivity
telnet redis-host 6379
```

### Payment Fraud Detection Not Working

```bash
# Check Redis is initialized
const redis = getRedis();
console.log(redis ? "✅ Redis OK" : "❌ Redis failed");

# Verify fraud detection is being called
grep "Suspicious:" /var/log/app.log
```

### Errors Still Leaking Stack Traces

```bash
# Ensure globalErrorHandler is added LAST in server.js
# Check no other error handlers are catching errors before it
grep "res.status(500)" backend/routes/*.js
```

---

## 📖 Files Changed/Added

### New Files

- ✅ `backend/redis.js` - Redis wrapper
- ✅ `backend/middleware/security.js` - Security middleware
- ✅ `backend/utils/paymentFraudDetection.js` - Fraud detection
- ✅ `SECURITY_AUDIT.md` - Security audit report
- ✅ `PRODUCTION_DEPLOYMENT.md` - Production guide

### Modified Files

- 🔄 `backend/server.js` - Add middleware
- 🔄 `backend/routes/payment.js` - Add fraud detection
- 🔄 `backend/routes/manual-payment.js` - Add rate limiting
- 🔄 `backend/package.json` - Add dependencies

---

## 🎯 Next Steps

1. **Immediate (This week):**
   - Integrate Redis
   - Add middleware to server.js
   - Test fraud detection
   - Set up monitoring

2. **Short-term (Next week):**
   - Deploy to staging
   - Load testing
   - Admin review tools
   - Automated alerts

3. **Long-term (Month 2):**
   - Geographic validation
   - Machine learning fraud detection
   - 2FA for high-risk transactions
   - Comprehensive admin dashboard

---

## 💡 Pro Tips

1. **Request ID Tracking:** Always include `requestId` when reaching out to support - helps track issues quickly
2. **Redis Monitoring:** Use `redis-cli MONITOR` to watch commands in real-time during testing
3. **Payment Testing:** Use SSLCommerz sandbox IDs for testing - never use production IDs in dev
4. **Error Logs:** Set up centralized logging (ELK, CloudWatch) to easily search errors by requestId
5. **Backup Strategy:** Always backup Redis periodically - contains critical fraud detection data

---

**Last Updated:** 2026-06-03  
**Status:** Ready for Implementation  
**Difficulty Level:** Medium (2-3 hours to implement fully)
