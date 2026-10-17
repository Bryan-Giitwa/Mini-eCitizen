const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { HttpError } = require('../errors');
const { asyncHandler } = require('../asyncHandler');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// POST /api/auth/register — always creates a citizen account
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) throw new HttpError(400, 'Name must be at least 2 characters');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    const hash = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
        name,
        email,
        hash,
      ]);
    } catch (err) {
      // The UNIQUE index on email is the source of truth; no check-then-insert race.
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'An account with this email already exists');
      throw err;
    }

    const user = { id: result.insertId, name, email, role: 'citizen' };
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

module.exports = router;
