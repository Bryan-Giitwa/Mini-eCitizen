const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { HttpError } = require("../errors");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random names for filename.
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new HttpError(400, "Only JPG, PNG or WebP images are allowed"));
  },
});

module.exports = { upload, UPLOAD_DIR };
