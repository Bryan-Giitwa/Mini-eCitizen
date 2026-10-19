const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db');
const { HttpError } = require('../errors');
const { asyncHandler } = require('../asyncHandler');
const { authenticate, signToken } = require('../middleware/auth');
const { sendWelcome } = require('../services/notifications');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || null,
  role: u.role,
});

// POST /api/auth/register — always creates a citizen account
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim().replace(/[\s().-]/g, '');
    const password = String(req.body.password || '');

    if (name.length < 2) throw new HttpError(400, 'Name must be at least 2 characters');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
      throw new HttpError(400, 'Enter a valid phone number with country code');
    }
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    const hash = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await query('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)', [
        name,
        email,
        phone,
        hash,
      ]);
    } catch (err) {
      // The UNIQUE index on email is the source of truth; no check-then-insert race.
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'An account with this email already exists');
      throw err;
    }

    const user = { id: result.insertId, name, email, phone, role: 'citizen' };
    await sendWelcome(user);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
    // Same message for unknown email and wrong password to avoid account enumeration.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Incorrect email or password');
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me — restore session from a stored token
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/profile — update account details; email is immutable.
router.patch(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim().replace(/[\s().-]/g, '');
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (name.length < 2) throw new HttpError(400, 'Name must be at least 2 characters');
    if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
      throw new HttpError(400, 'Enter a valid phone number with country code');
    }
    if (!currentPassword) throw new HttpError(400, 'Enter your current password to save changes');

    const changingPassword = newPassword.length > 0 || confirmPassword.length > 0;
    if (changingPassword) {
      if (newPassword.length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
      if (newPassword !== confirmPassword) throw new HttpError(400, 'New password confirmation does not match');
    }

    const updatedUser = await withTransaction(async (conn) => {
      const [account] = await query(
        'SELECT id, name, email, phone, role, password_hash FROM users WHERE id = ? FOR UPDATE',
        [req.user.id],
        conn
      );
      if (!account) throw new HttpError(401, 'Account no longer exists');
      if (!(await bcrypt.compare(currentPassword, account.password_hash))) {
        throw new HttpError(401, 'Current password is incorrect');
      }

      const passwordHash = changingPassword ? await bcrypt.hash(newPassword, 10) : account.password_hash;
      await query(
        'UPDATE users SET name = ?, phone = ?, password_hash = ? WHERE id = ?',
        [name, phone, passwordHash, account.id],
        conn
      );

      return { id: account.id, name, email: account.email, phone, role: account.role };
    });

    res.json({ user: publicUser(updatedUser) });
  })
);

module.exports = router;
