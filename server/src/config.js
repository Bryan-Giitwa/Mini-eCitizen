const path = require("path");

// Load the server's environment file regardless of the process working directory.
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const isProduction = process.env.NODE_ENV === "production";
// Keep the deployed frontend and local Vite origin available by default.
const defaultClientOrigins = [
  "https://hudumahub.jmatecsystems.com",
  "http://localhost:5173",
];
// Allow deployments to append additional trusted origins as a comma-separated list.
const configuredClientOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const clientOrigins = [
  ...new Set([...defaultClientOrigins, ...configuredClientOrigins]),
];

if (clientOrigins.length === 0) {
  throw new Error("CLIENT_ORIGIN must contain at least one allowed origin");
}

const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  clientOrigins,
  isProduction,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "psrs_eCitizen",
  },
};

// Never start a production server with a predictable development JWT secret.
if (config.isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

module.exports = config;
