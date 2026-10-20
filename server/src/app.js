const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const config = require("./config");
const { HttpError } = require("./errors");
const { UPLOAD_DIR } = require("./middleware/upload");

const app = express();

// Trust the single hosting proxy so rate limiting sees the originating client IP.
app.set("trust proxy", 1);
// Apply security headers and allow only the configured frontend origins.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.clientOrigins,
    methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  }),
);
// Parse JSON API bodies and serve uploaded request images.
app.use(express.json({ limit: "100kb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

// Brute-force protection on login/registration.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

// Mount public authentication/contact endpoints and authenticated request/admin APIs.
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/admin", require("./routes/admin"));

// Convert unknown API paths into a consistent JSON 404 error.
app.use("/api", (req, res, next) =>
  next(new HttpError(404, "Endpoint not found")),
);

// Normalize expected validation/upload errors and hide unexpected details from clients.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5MB or smaller"
        : err.message;
    return res.status(400).json({ error: message });
  }
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.message });
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON" });

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

module.exports = app;
