const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const config = require('./config');
const { HttpError } = require('./errors');
const { UPLOAD_DIR } = require('./middleware/upload');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientOrigins }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Brute-force protection on login/registration.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (req, res, next) => next(new HttpError(404, 'Endpoint not found')));

// Central error handler: every failure becomes { error: "message" }.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : err.message;
    return res.status(400).json({ error: message });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
