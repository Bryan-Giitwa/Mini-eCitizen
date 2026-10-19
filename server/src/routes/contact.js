const express = require('express');
const rateLimit = require('express-rate-limit');
const { HttpError } = require('../errors');
const { asyncHandler } = require('../asyncHandler');
const { sendSupportContact } = require('../services/notifications');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact requests. Please try again later.' },
});

router.post(
  '/',
  contactLimiter,
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const rawPhone = String(req.body.phone || '').trim();
    const phone = rawPhone.replace(/[\s().-]/g, '');
    const message = String(req.body.message || '').trim();

    if (name.length < 2 || name.length > 100) {
      throw new HttpError(400, 'Name must be between 2 and 100 characters');
    }
    if (email.length > 191 || !EMAIL_RE.test(email)) {
      throw new HttpError(400, 'Enter a valid email address');
    }
    if (!/^(?:\+?[1-9]\d{6,14}|0\d{9})$/.test(phone)) {
      throw new HttpError(400, 'Enter a valid phone number');
    }
    if (message.length < 10 || message.length > 1000) {
      throw new HttpError(400, 'Message must be between 10 and 1000 characters');
    }

    await sendSupportContact({ name, email, phone, message });
    res.status(202).json({
      message: 'Your support request has been received. We will contact you soon.',
    });
  }),
);

module.exports = router;
