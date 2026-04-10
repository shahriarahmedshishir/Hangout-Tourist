const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Use memory storage so sharp can process bytes before writing to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"), false);
  }
};

const _multer = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // allow up to 10MB raw; output will be much smaller
});

// Compress and save a single buffer, returns the saved filename
async function compressAndSave(buffer, originalMimetype) {
  // Determine extension based on mime type
  let ext = ".jpg";
  if (originalMimetype === "image/png") ext = ".png";
  else if (originalMimetype === "image/gif") ext = ".gif";
  else if (originalMimetype === "image/webp") ext = ".webp";

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dest = path.join(uploadDir, filename);

  let pipeline = sharp(buffer).rotate(); // auto-orient from EXIF

  // Resize to max 1280px wide
  pipeline = pipeline.resize({ width: 1280, withoutEnlargement: true });

  // Apply compression based on format
  if (ext === ".png") {
    pipeline = pipeline.png({ quality: 80, compression: 9 });
  } else if (ext === ".gif") {
    // GIF stays as-is, just resized
    pipeline = pipeline.toFormat("gif");
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 80 });
  } else {
    // JPEG default
    pipeline = pipeline.jpeg({ quality: 80, progressive: true });
  }

  await pipeline.toFile(dest);
  return filename;
}

// Express middleware that runs after multer and compresses every uploaded file
async function compressMiddleware(req, res, next) {
  try {
    if (req.file) {
      const filename = await compressAndSave(
        req.file.buffer,
        req.file.mimetype,
      );
      req.file.filename = filename;
      req.file.path = path.join(uploadDir, filename);
    }
    if (req.files) {
      const files = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();
      await Promise.all(
        files.map(async (f) => {
          const filename = await compressAndSave(f.buffer, f.mimetype);
          f.filename = filename;
          f.path = path.join(uploadDir, filename);
        }),
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Return a single middleware function that runs multer then compression
function makeUpload(method, field, options) {
  const multerHandler =
    options !== undefined
      ? _multer[method](field, options)
      : _multer[method](field);
  return (req, res, next) => {
    multerHandler(req, res, (err) => {
      if (err) return next(err);
      compressMiddleware(req, res, next);
    });
  };
}

// Proxy object that mirrors multer's .single/.array/.fields API
const upload = {
  single: (field) => makeUpload("single", field),
  array: (field, max) => makeUpload("array", field, max),
  fields: (fields) => makeUpload("fields", fields),
};

module.exports = upload;
