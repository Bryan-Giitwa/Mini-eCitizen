const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { jwtSecret } = require('../config');
const { HttpError } = require('../errors');
const { asyncHandler } = require('../asyncHandler');

/** Requires a valid Bearer token; attaches the user to req.user. */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const [user] = await query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [payload.id]);
  if (!user) throw new HttpError(401, 'Account no longer exists');

  req.user = user;
  next();
});

/** Must run after authenticate. */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Admin access required'));
  next();
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

module.exports = { authenticate, requireAdmin, signToken };
