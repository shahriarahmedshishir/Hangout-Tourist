const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth, role } = require("../middleware/auth");
const {
  isValidEmail,
  validatePassword,
  isValidObjectId,
} = require("../utils/validation");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/emailService");

const SECRET = process.env.JWT_SECRET;

// ✅ SECURITY: Rate limiting applied in server.js and referenced here
// Register (user only) - requires email verification
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ✅ SECURITY: Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ SECURITY: Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ SECURITY: Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const db = await getDb();
    const existing = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.collection("users").insertOne({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashed,
      role: "user",
      emailVerified: false,
      verificationToken: tokenHash,
      verificationTokenExpiry: tokenExpiry,
      createdAt: new Date(),
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      name,
      verificationToken,
    );

    res.status(201).json({
      message: "Account created! Please check your email to verify.",
      emailSent: emailResult.success,
      userId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login - requires email verification
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ SECURITY: Input validation
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresVerification: true,
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId || null,
        hotelName: user.hotelName || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.user.id))
      return res.status(400).json({ message: "Invalid user id" });
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { password: 0 } },
      );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch wallet balance from coin_ledger
    const wallet = await db
      .collection("coin_ledger")
      .findOne({ userId: req.user.id });

    const userData = {
      ...user,
      walletBalance: wallet?.coins || 0,
    };
    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get CSRF token (for payment protection)
router.get("/csrf-token", (req, res) => {
  try {
    res.json({ csrfToken: req.csrfToken() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password
router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ✅ SECURITY: Validate input
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    if (!isValidObjectId(req.user.id))
      return res.status(400).json({ message: "Invalid user id" });

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(401).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(req.user.id) },
        { $set: { password: hashed } },
      );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify email with token
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Verification token required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const db = await getDb();
    const user = await db.collection("users").findOne({
      verificationToken: tokenHash,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    // Mark email as verified
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      },
    );

    res.json({
      message: "Email verified successfully! You can now log in.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email required" });
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          verificationToken: tokenHash,
          verificationTokenExpiry: tokenExpiry,
        },
      },
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      user.name,
      verificationToken,
    );

    res.json({
      message: "Verification email sent",
      emailSent: emailResult.success,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot password - send reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email required" });
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Check if email is verified before allowing password reset
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        requiresVerification: true,
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: tokenHash,
          passwordResetTokenExpiry: tokenExpiry,
        },
      },
    );

    // Send reset email
    const emailResult = await sendPasswordResetEmail(
      email,
      user.name,
      resetToken,
    );

    res.json({
      message: "If an account exists, a reset link has been sent",
      emailSent: emailResult.success,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password required" });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const db = await getDb();
    const user = await db.collection("users").findOne({
      passwordResetToken: tokenHash,
      passwordResetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset tokens
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashed,
          passwordResetToken: null,
          passwordResetTokenExpiry: null,
        },
      },
    );

    res.json({
      message: "Password reset successfully! You can now log in.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
