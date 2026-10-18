const express = require("express");
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

const router = express.Router();
router.use(authenticate, requireAdmin);

const MAX_PAGE_SIZE = 50;

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

    res.json(await getRequestWithHistory(id));
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
