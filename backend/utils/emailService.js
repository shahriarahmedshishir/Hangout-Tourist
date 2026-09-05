const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { ObjectId } = require("mongodb");

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Verify AWS SES configuration on startup
(async () => {
  try {
    console.log("✅ AWS SES configured and ready");
  } catch (error) {
    console.error("AWS SES configuration error:", error.message);
  }
})();

const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

/**
 * Send email verification link via AWS SES
 */
async function sendVerificationEmail(email, name, token) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome to Hangout Tourist, ${name}!</h1>
        <p>Thank you for creating an account. Please verify your email to get started.</p>
        <a href="${verificationUrl}" class="btn">Verify Email</a>
        <p style="color: #999;">Or copy this link: <br><code>${verificationUrl}</code></p>
        <p>This link expires in 24 hours.</p>
        <div class="footer">
          <p>If you didn't create this account, please ignore this email.</p>
          <p>&copy; 2025 Hangout Tourist. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const params = {
    Source: process.env.AWS_SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Verify Your Hangout Tourist Account",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    return { success: true };
  } catch (error) {
    console.error("Error sending verification email via AWS SES:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email via AWS SES
 */
async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the link below to set a new password.</p>
        <a href="${resetUrl}" class="btn">Reset Password</a>
        <p style="color: #999;">Or copy this link: <br><code>${resetUrl}</code></p>
        <p>This link expires in 1 hour.</p>
        <div class="footer">
          <p>If you didn't request this, please ignore this email.</p>
          <p>&copy; 2025 Hangout Tourist. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const params = {
    Source: process.env.AWS_SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Reset Your Hangout Tourist Password",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email via AWS SES:", error);
    return { success: false, error: error.message };
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function getBookingName(booking) {
  return (
    booking.hotelName ||
    booking.carName ||
    booking.busName ||
    booking.serviceName ||
    booking.packageName ||
    booking.type ||
    "Hangout Tourist booking"
  );
}

/** Send a confirmation email containing an invoice for a confirmed booking. */
async function sendBookingConfirmationEmail(booking, user) {
  if (!user?.email) {
    console.warn("Booking confirmation email skipped: user email not found", {
      bookingId: booking?._id,
    });
    return { success: false, error: "User email not found" };
  }

  const bookingId = booking._id?.toString() || "N/A";
  const customerName = user.name || "Customer";
  const itemName = getBookingName(booking);
  const quantity = booking.seats || booking.seatsBooked || 1;
  const date = booking.checkIn || booking.pickupDate || booking.travelDate;
  const endDate = booking.checkOut || booking.returnDate;
  const dateLabel = endDate
    ? `${formatDate(date)} - ${formatDate(endDate)}`
    : formatDate(date);
  const total = Number(booking.totalAmount || 0).toFixed(2);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:24px; color:#222;">
      <div style="max-width:620px; margin:auto; background:#fff; padding:28px; border-radius:8px;">
        <h1 style="margin-top:0; color:#176b87;">Booking confirmed</h1>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your Hangout Tourist booking is confirmed. Here is your invoice:</p>
        <table style="width:100%; border-collapse:collapse; margin:24px 0;">
          <tr><td style="padding:10px 0; border-bottom:1px solid #ddd;"><strong>Invoice</strong></td><td style="padding:10px 0; border-bottom:1px solid #ddd;">${escapeHtml(bookingId)}</td></tr>
          <tr><td style="padding:10px 0; border-bottom:1px solid #ddd;"><strong>Service</strong></td><td style="padding:10px 0; border-bottom:1px solid #ddd;">${escapeHtml(itemName)}</td></tr>
          <tr><td style="padding:10px 0; border-bottom:1px solid #ddd;"><strong>Date</strong></td><td style="padding:10px 0; border-bottom:1px solid #ddd;">${escapeHtml(dateLabel)}</td></tr>
          <tr><td style="padding:10px 0; border-bottom:1px solid #ddd;"><strong>Quantity</strong></td><td style="padding:10px 0; border-bottom:1px solid #ddd;">${escapeHtml(quantity)}</td></tr>
          <tr><td style="padding:10px 0; border-bottom:1px solid #ddd;"><strong>Payment method</strong></td><td style="padding:10px 0; border-bottom:1px solid #ddd;">${escapeHtml(booking.paymentMethod || "N/A")}</td></tr>
          <tr><td style="padding:14px 0 0;"><strong>Total</strong></td><td style="padding:14px 0 0;"><strong>BDT ${escapeHtml(total)}</strong></td></tr>
        </table>
        <p>Thank you for choosing Hangout Tourist.</p>
      </div>
    </body>
    </html>
  `;

  const params = {
    Source: process.env.AWS_SES_FROM_EMAIL,
    Destination: { ToAddresses: [user.email] },
    Message: {
      Subject: {
        Data: `Booking confirmed - Invoice ${bookingId}`,
        Charset: "UTF-8",
      },
      Body: { Html: { Data: htmlContent, Charset: "UTF-8" } },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    return { success: true };
  } catch (error) {
    console.error(
      "Error sending booking confirmation email via AWS SES:",
      error,
    );
    return { success: false, error: error.message };
  }
}

async function notifyBookingConfirmed(db, booking) {
  if (!booking?.userId)
    return { success: false, error: "Booking user not found" };
  const userId = booking.userId.toString();
  const query = ObjectId.isValid(userId)
    ? { _id: new ObjectId(userId) }
    : { _id: booking.userId };
  const user = await db.collection("users").findOne(query, {
    projection: { name: 1, email: 1 },
  });
  return sendBookingConfirmationEmail(booking, user);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  notifyBookingConfirmed,
};
