/**
 * Input validation utilities for security
 */

// Email regex according to RFC 5322 (simplified but effective)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-()]{7,}$/;
const MONGODB_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 255) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} { valid: boolean, message: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters" };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password is too long" };
  }
  return { valid: true };
}

/**
 * Validate phone number
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15;
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return MONGODB_ID_REGEX.test(String(id));
}

/**
 * Sanitize string input (remove special chars that could be used for injection)
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (!input || typeof input !== "string") return "";
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

/**
 * Validate hotel booking params
 * @param {object} params
 * @returns {object} { valid: boolean, message: string }
 */
function validateHotelBookingParams(params) {
  const { roomIds, roomId, hotelId, checkIn, checkOut, contactNumber } = params;

  const idsToBook =
    Array.isArray(roomIds) && roomIds.length ? roomIds : roomId ? [roomId] : [];

  if (!idsToBook.length) {
    return { valid: false, message: "No rooms selected" };
  }

  if (!hotelId || !isValidObjectId(hotelId)) {
    return { valid: false, message: "Invalid hotel selected" };
  }

  if (!idsToBook.every((id) => isValidObjectId(id))) {
    return { valid: false, message: "Invalid room IDs" };
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { valid: false, message: "Invalid dates" };
  }

  if (checkOutDate <= checkInDate) {
    return { valid: false, message: "Check-out must be after check-in" };
  }

  // Check if dates are in the past
  if (checkInDate < new Date()) {
    return { valid: false, message: "Cannot book in the past" };
  }

  if (contactNumber && !isValidPhone(contactNumber)) {
    return { valid: false, message: "Invalid phone number" };
  }

  return { valid: true };
}

/**
 * Validate price (ensure no tampering)
 * @param {number} clientAmount - Amount from client
 * @param {number} serverAmount - Recalculated amount from server
 * @param {number} tolerance - Allowed difference in BDT (default 1)
 * @returns {boolean}
 */
function validatePrice(clientAmount, serverAmount, tolerance = 1) {
  const client = parseFloat(clientAmount) || 0;
  const server = parseFloat(serverAmount) || 0;

  if (server <= 0) return false; // Invalid server amount
  return Math.abs(client - server) <= tolerance;
}

module.exports = {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidObjectId,
  sanitizeString,
  validateHotelBookingParams,
  validatePrice,
};
