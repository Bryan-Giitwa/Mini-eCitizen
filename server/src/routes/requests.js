const express = require('express');
const { query, withTransaction } = require('../db');
const { CATEGORIES } = require('../constants');
const { HttpError } = require('../errors');
const { asyncHandler } = require('../asyncHandler');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { BASE_SELECT, addHistory, getRequestById, getRequestWithHistory } = require('../services/requests');
const { sendRequestReceived } = require('../services/notifications');

const router = express.Router();
router.use(authenticate);

// POST /api/requests — citizen submits a request (multipart: image is optional)
router.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const category = String(req.body.category || '');
    const location = String(req.body.location || '').trim();
    const description = String(req.body.description || '').trim();

    if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Choose a valid category');
    if (location.length < 3) throw new HttpError(400, 'Location must be at least 3 characters');
    if (location.length > 255) throw new HttpError(400, 'Location is too long (max 255)');
    if (description.length < 10) throw new HttpError(400, 'Description must be at least 10 characters');
    if (description.length > 1000) throw new HttpError(400, 'Description is too long (max 1000)');

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // The request and its first history entry are saved together or not at all.
    const id = await withTransaction(async (conn) => {
      const result = await query(
        'INSERT INTO requests (user_id, category, location, description, image_path) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, category, location, description, imagePath],
        conn
      );
      await addHistory(result.insertId, 'Pending', 'Request submitted', req.user.id, conn);
      return result.insertId;
    });

    const request = await getRequestWithHistory(id);
    await sendRequestReceived({
      id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      category,
      location,
    });
    res.status(201).json(request);
  })
);

// GET /api/requests — the signed-in citizen's own requests
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await query(`${BASE_SELECT} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC`, [req.user.id])
    );
  })
);

// GET /api/requests/:id — owner or admin
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const request = await getRequestById(Number(req.params.id));
    // 404 (not 403) for other people's requests so ids can't be probed.
    if (!request || (req.user.role !== 'admin' && request.user_id !== req.user.id)) {
      throw new HttpError(404, 'Request not found');
    }
    res.json(await getRequestWithHistory(request.id));
  })
);

module.exports = router;
