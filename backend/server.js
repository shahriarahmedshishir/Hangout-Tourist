require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { getDb } = require("./db");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SECRET = process.env.JWT_SECRET || "hangout_secret_dev_only";

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
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Payment callbacks come from SSLCommerz's domain — register BEFORE the
// global CORS middleware so they are never blocked.
app.use("/api/payment", cors({ origin: "*" }), require("./routes/payment"));

app.use(cors({ origin: corsOrigin }));

// Make io accessible in routes
app.set("io", io);

// Socket.io: authenticate user and join personal room
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      socket.userId = decoded.id;
    } catch {}
  }
  next();
});

io.on("connection", (socket) => {
  if (socket.userId) {
    socket.join(`user-${socket.userId}`);
  }
  socket.on("join-hotel", (hotelId) => socket.join(`hotel-${hotelId}`));
  socket.on("join-cars", () => socket.join("cars-room"));
  socket.on("disconnect", () => {});
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/hotels", require("./routes/hotels"));
app.use("/api/cars", require("./routes/cars"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/manual-payment", require("./routes/manual-payment"));
app.use("/api/hangcoin", require("./routes/hangcoin"));

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

getDb()
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
