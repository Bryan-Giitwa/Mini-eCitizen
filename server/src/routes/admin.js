const express = require("express");
const bcrypt = require("bcryptjs");
const { query, withTransaction } = require("../db");
const { STATUSES } = require("../constants");
const { HttpError } = require("../errors");
const { asyncHandler } = require("../asyncHandler");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  BASE_SELECT,
  addHistory,
  getRequestWithHistory,
} = require("../services/requests");
const { sendRequestStatusUpdate } = require("../services/notifications");

const router = express.Router();
router.use(authenticate, requireAdmin);

const MAX_PAGE_SIZE = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/admin/users — create a citizen or admin account.
router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim().replace(/[\s().-]/g, "");
    const password = String(req.body.password || "");
    const role = String(req.body.role || "");

    if (name.length < 2 || name.length > 100) {
      throw new HttpError(400, "Name must be between 2 and 100 characters");
    }
    if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address");
    if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
      throw new HttpError(400, "Enter a valid phone number with country code");
    }
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
    if (!["citizen", "admin"].includes(role)) {
      throw new HttpError(400, "Role must be citizen or admin");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await query(
        "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
        [name, email, phone, passwordHash, role],
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new HttpError(409, "An account with this email already exists");
      }
      throw err;
    }

    res.status(201).json({
      user: {
        id: result.insertId,
        name,
        email,
        phone,
        role,
      },
    });
  }),
);

// GET /api/admin/users?page=1 — list accounts in pages of at most five.
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 5;
    const [[{ total }], users] = await Promise.all([
      query("SELECT COUNT(*) AS total FROM users"),
      query(
        "SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?",
        [limit, (page - 1) * limit],
      ),
    ]);

    res.json({
      items: users,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
    });
  }),
);

// PATCH /api/admin/users/:id — update account details and optionally reset password.
router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new HttpError(400, "Invalid user ID");
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const rawPhone = String(req.body.phone || "").trim();
    const phone = rawPhone ? rawPhone.replace(/[\s().-]/g, "") : null;
    const password = String(req.body.password || "");
    const role = String(req.body.role || "");

    if (name.length < 2 || name.length > 100) {
      throw new HttpError(400, "Name must be between 2 and 100 characters");
    }
    if (email.length > 191 || !EMAIL_RE.test(email)) {
      throw new HttpError(400, "Enter a valid email address");
    }
    if (phone && !/^\+?[1-9]\d{6,14}$/.test(phone)) {
      throw new HttpError(400, "Enter a valid phone number with country code");
    }
    if (password && password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters");
    }
    if (!["citizen", "admin"].includes(role)) {
      throw new HttpError(400, "Role must be citizen or admin");
    }
    if (id === req.user.id && role !== req.user.role) {
      throw new HttpError(400, "You cannot change your own administrator role");
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    let user;
    try {
      user = await withTransaction(async (conn) => {
        // Lock administrator rows consistently so concurrent changes cannot remove every admin.
        const administrators = await query(
          "SELECT id FROM users WHERE role = 'admin' FOR UPDATE",
          [],
          conn,
        );
        const [account] = await query(
          "SELECT id, name, email, phone, role FROM users WHERE id = ? FOR UPDATE",
          [id],
          conn,
        );
        if (!account) throw new HttpError(404, "User not found");
        if (account.role === "admin" && role !== "admin" && administrators.length <= 1) {
          throw new HttpError(400, "The last administrator cannot be demoted");
        }

        await query(
          `UPDATE users
           SET name = ?, email = ?, phone = ?, role = ?,
               password_hash = COALESCE(?, password_hash)
           WHERE id = ?`,
          [name, email, phone, role, passwordHash, id],
          conn,
        );
        return { id, name, email, phone, role };
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new HttpError(409, "An account with this email already exists");
      }
      throw err;
    }

    res.json({ user });
  }),
);

// DELETE /api/admin/users/:id — delete a user and their associated requests.
router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new HttpError(400, "Invalid user ID");
    }
    if (id === req.user.id) {
      throw new HttpError(400, "You cannot delete your own administrator account");
    }

    await withTransaction(async (conn) => {
      const administrators = await query(
        "SELECT id FROM users WHERE role = 'admin' FOR UPDATE",
        [],
        conn,
      );
      const [account] = await query(
        "SELECT id, role FROM users WHERE id = ? FOR UPDATE",
        [id],
        conn,
      );
      if (!account) throw new HttpError(404, "User not found");
      if (account.role === "admin" && administrators.length <= 1) {
        throw new HttpError(400, "The last administrator cannot be deleted");
      }

      await query("DELETE FROM users WHERE id = ?", [id], conn);
    });

    res.json({ deleted: true, id });
  }),
);

// GET /api/admin/requests?status=&category=&q=&page=1&limit=10
router.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const { status, category, q } = req.query;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      MAX_PAGE_SIZE,
    );
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const where = [];
    const params = [];

    if (status) {
      if (!STATUSES.includes(status))
        throw new HttpError(400, "Unknown status filter");
      where.push("r.status = ?");
      params.push(status);
    }
    if (category) {
      where.push("r.category = ?");
      params.push(category);
    }
    if (q && String(q).trim()) {
      where.push(
        "(r.location LIKE ? OR r.description LIKE ? OR u.name LIKE ?)",
      );
      const like = `%${String(q).trim()}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Count and page fetched in parallel; the pool serves them on separate connections.
    const [[{ total }], items] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total FROM requests r JOIN users u ON u.id = r.user_id ${whereSql}`,
        params,
      ),
      query(
        `${BASE_SELECT} ${whereSql} ORDER BY r.created_at ASC, r.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, (page - 1) * limit],
      ),
    ]);

    res.json({
      items,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
    });
  }),
);

// PATCH /api/admin/requests/:id/status  { status, note? }
router.patch(
  "/requests/:id/status",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const note = String(req.body.note || "")
      .trim()
      .slice(0, 500);

    if (!STATUSES.includes(status)) throw new HttpError(400, "Invalid status");
    const [existing] = await query("SELECT status FROM requests WHERE id = ?", [
      id,
    ]);
    if (!existing) throw new HttpError(404, "Request not found");
    if (existing.status === status && !note)
      throw new HttpError(400, `Request is already ${status}`);

    await withTransaction(async (conn) => {
      // updated_at refreshes automatically (ON UPDATE CURRENT_TIMESTAMP).
      await query(
        "UPDATE requests SET status = ? WHERE id = ?",
        [status, id],
        conn,
      );
      await addHistory(
        id,
        status,
        note || `Status changed to ${status}`,
        req.user.id,
        conn,
      );
    });

    const updatedRequest = await getRequestWithHistory(id);
    if (existing.status !== status) {
      const [citizen] = await query(
        `SELECT u.name, u.email, u.phone, r.category, r.location
         FROM requests r JOIN users u ON u.id = r.user_id
         WHERE r.id = ?`,
        [id],
      );
      await sendRequestStatusUpdate({
        id,
        name: citizen.name,
        email: citizen.email,
        phone: citizen.phone,
        category: citizen.category,
        location: citizen.location,
        status,
      });
    }

    res.json(updatedRequest);
  }),
);

// GET /api/admin/analytics
router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    // Four independent aggregate queries run concurrently.
    const [statusRows, byCategory, dayRows, [{ hours }]] = await Promise.all([
      query("SELECT status, COUNT(*) AS c FROM requests GROUP BY status"),
      query(
        `SELECT category, COUNT(*) AS total, CAST(SUM(status = 'Resolved') AS UNSIGNED) AS resolved
         FROM requests GROUP BY category ORDER BY total DESC`,
      ),
      query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS c
         FROM requests WHERE created_at >= DATE_SUB(UTC_DATE(), INTERVAL 6 DAY) GROUP BY day`,
      ),
      query(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, r.created_at, h.resolved_at)) / 60 AS hours
         FROM requests r
         JOIN (SELECT request_id, MAX(created_at) AS resolved_at
               FROM status_history WHERE status = 'Resolved' GROUP BY request_id) h
           ON h.request_id = r.id
         WHERE r.status = 'Resolved'`,
      ),
    ]);

    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const row of statusRows) counts[row.status] = row.c;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const open = counts["Pending"] + counts["In Progress"];

    // Fill in days with zero requests so the 7-day chart is always complete.
    const perDay = new Map(dayRows.map((r) => [r.day, r.c]));
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.now() - (6 - i) * 86400000)
        .toISOString()
        .slice(0, 10);
      return { day, count: perDay.get(day) || 0 };
    });

    res.json({
      total,
      open,
      resolved: counts["Resolved"],
      byStatus: counts,
      resolutionRate: total
        ? Math.round((counts["Resolved"] / total) * 100)
        : 0,
      avgResolutionHours:
        hours == null ? null : Math.round(Number(hours) * 10) / 10,
      byCategory,
      last7Days,
    });
  }),
);

module.exports = router;
