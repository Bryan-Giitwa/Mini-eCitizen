const { query } = require('../db');

const BASE_SELECT = `
  SELECT r.*, u.name AS citizen_name, u.email AS citizen_email
  FROM requests r
  JOIN users u ON u.id = r.user_id
`;

async function getRequestById(id) {
  const [request] = await query(`${BASE_SELECT} WHERE r.id = ?`, [id]);
  return request;
}

function getHistory(requestId) {
  return query(
    `SELECT h.id, h.status, h.note, h.created_at, u.name AS changed_by_name
     FROM status_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.request_id = ?
     ORDER BY h.id ASC`,
    [requestId]
  );
}

/** `executor` lets callers join a transaction (see db.withTransaction). */
function addHistory(requestId, status, note, changedBy, executor) {
  return query(
    'INSERT INTO status_history (request_id, status, note, changed_by) VALUES (?, ?, ?, ?)',
    [requestId, status, note || null, changedBy],
    executor
  );
}

/** Request with its status timeline, ready to send to the client. */
async function getRequestWithHistory(id) {
  const [request, history] = await Promise.all([getRequestById(id), getHistory(id)]);
  return request ? { ...request, history } : null;
}

module.exports = { BASE_SELECT, getRequestById, getHistory, addHistory, getRequestWithHistory };
