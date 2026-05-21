require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const path = require("path");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDb } = require("./db");
const { initCache } = require("./cache");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SECRET = process.env.JWT_SECRET;

// ✅ SECURITY: Enforce JWT_SECRET in production
if (!SECRET || SECRET === "hangout_secret_dev_only") {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ FATAL: JWT_SECRET not set in environment!");
    process.exit(1);
  }
  console.warn("⚠️ WARNING: Using default JWT_SECRET (dev only)");
}

// Allow the configured origin + any localhost port in development
// + SSLCommerz sandbox/live origins (they POST back to our callback endpoints)
const corsOrigin = (origin, callback) => {
  if (
    !origin ||
    origin === CLIENT_URL ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /sslcommerz\.com$/.test(origin)
  ) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1e6, // 1MB
});

// Compression middleware — reduces payload by 70%
app.use(compression());

// Serve static files with CORS headers applied - BEFORE Helmet
app.use(
  "/uploads",
  cors({ origin: "*" }),
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      } else if (filepath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (filepath.endsWith(".gif")) {
        res.setHeader("Content-Type", "image/gif");
      } else if (filepath.endsWith(".jpg") || filepath.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      }
    },
  }),
);

// ✅ SECURITY: Helmet - Sets security headers (CSP, HSTS, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http://localhost:*"],
        connectSrc: ["'self'", "https://sslcommerz.com", "http://localhost:*"],
        frameSrc: ["https://sslcommerz.com"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false,
    },
  }),
);

// ✅ SECURITY: Input sanitization & XSS protection before JSON parsing
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Payment callbacks come from SSLCommerz's domain — register BEFORE the
// global CORS middleware so they are never blocked.
app.use("/api/payment", cors({ origin: "*" }), require("./routes/payment"));

app.use(cors({ origin: corsOrigin }));

// ✅ SECURITY: Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  skip: (req) => process.env.NODE_ENV !== "production",
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per window
  message: "Too many signup attempts, please try again later",
  standardHeaders: true,
  skip: (req) => process.env.NODE_ENV !== "production",
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment attempts per minute
  message: "Too many payment requests, please try again later",
  standardHeaders: true,
  skip: (req) => process.env.NODE_ENV !== "production",
});

// Make io accessible in routes
app.set("io", io);

// Store limiters in app for reuse
app.set("authLimiter", authLimiter);
app.set("signupLimiter", signupLimiter);
app.set("paymentLimiter", paymentLimiter);

// Socket.io: authenticate user and join personal room
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      socket.userId = decoded.id;

      // Fetch user role from database
      try {
        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(decoded.id) });
        if (user) {
          socket.userRole = user.role;
        }
      } catch (err) {
        console.log("Could not fetch user role:", err.message);
      }
    } catch {}
  }
  next();
});

io.on("connection", (socket) => {
  if (socket.userId) {
    socket.join(`user-${socket.userId}`);

    // Join admin room if user is admin
    if (socket.userRole === "admin") {
      socket.join("admin");
    }
  }
  socket.on("join-hotel", (hotelId) => socket.join(`hotel-${hotelId}`));
  socket.on("join-cars", () => socket.join("cars-room"));
  socket.on("disconnect", () => {});
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/hotels", require("./routes/hotels"));
app.use("/api/cars", require("./routes/cars"));
app.use("/api/carrent", require("./routes/carrent")); // Add this line
app.use("/api/buses", require("./routes/buses")); // Bus services routes
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/bus-tickets", require("./routes/admin-bus-tickets"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/manual-payment", require("./routes/manual-payment"));
app.use("/api/hangcoin", require("./routes/hangcoin"));

// Public packages endpoint
app.use("/api/packages", require("./routes/packages"));

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

// Initialize cache and DB on startup
Promise.all([getDb(), initCache()])
  .then(() => {
    server.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

// Export io and server for use in routes
module.exports = { io, server };
