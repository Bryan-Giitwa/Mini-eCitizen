const mysql = require("mysql2/promise");
const { db: dbConfig } = require("./config");

// One shared connection pool for the whole app.
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  timezone: "Z", // JS <-> MySQL date conversion in UTC
});

// Every pooled connection works in UTC so CURRENT_TIMESTAMP defaults are consistent.
pool.on("connection", (connection) =>
  connection.query("SET time_zone = '+00:00'"),
);

/** Run a query and return just the rows (or the OkPacket for INSERT/UPDATE). */
async function query(sql, params = [], executor = pool) {
  const [result] = await executor.query(sql, params);
  return result;
}

/**
 * Run `work(conn)` inside a transaction: commits on success, rolls back on error.
 * Pass `conn` as the executor argument of `query` to join the transaction.
 */
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction };
