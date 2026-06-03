const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

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

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
