# Huduma Hub — Public Service Request System

A mini eCitizen-style web app where citizens report local service problems (broken streetlights, water issues, uncollected garbage…) and track them to resolution, while administrators manage cases and see live analytics.

**Stack:** React 18 + Vite + React Router (frontend) · Node.js + Express (backend) · **MySQL / MariaDB** (database, managed with phpMyAdmin) · JWT auth

---

## Features

| Requirement | Implementation |
|---|---|
| Citizen registration / login | `POST /api/auth/register`, `/login`; bcrypt-hashed passwords; JWT (7 days); session restored on reload |
| Submit request | Category, location, description, optional image (JPG/PNG/WebP, max 5 MB) with live preview |
| Admin dashboard | Role-protected page: all requests with search, status/category filters and pagination |
| Status tracking | Pending → In Progress → Resolved, set by admins; citizens see a 3-step tracker and an activity timeline |
| Basic analytics | Total / open / resolved counts, open-vs-resolved donut, cases by category |

**Bonus features**
- Activity timeline with optional admin notes shown to the citizen
- Average resolution time, resolution rate, new cases in the last 7 days
- Server-side pagination, debounced search, race-condition-safe fetching
- Rate limiting on auth routes, `helmet` headers, random upload filenames, MIME/size checks
- Responsive design, accessible forms, reduced-motion support
- One-click demo data in the SQL file

---

## Project structure

```
public-service-request-system/
├── server/
│   ├── database/schema.sql     # ← import this in phpMyAdmin (tables + demo data)
│   ├── src/
│   │   ├── app.js              # Express app: middleware, routes, error handler
│   │   ├── server.js           # Starts the HTTP server
│   │   ├── config.js           # Environment config
│   │   ├── constants.js        # Categories & statuses (single source of truth)
│   │   ├── db.js               # mysql2 pool, query() and withTransaction()
│   │   ├── asyncHandler.js     # Forwards async errors to the error middleware
│   │   ├── errors.js           # HttpError class
│   │   ├── middleware/         # auth (JWT, roles), upload (multer)
│   │   ├── routes/             # auth.js, requests.js, admin.js
│   │   └── services/requests.js# Shared queries (request + history)
│   ├── uploads/                # Uploaded images (git-ignored)
│   ├── .env.example
│   └── .gitignore
└── client/
    ├── src/
    │   ├── api.js              # fetch wrapper (token, JSON/FormData, errors)
    │   ├── AuthContext.jsx     # Auth state: user, login, register, logout
    │   ├── components/         # Layout, ProtectedRoute, AuthShell, ProgressTrack, Timeline, Analytics, Pagination…
    │   ├── pages/              # Login, Register, Dashboard, NewRequest, RequestDetail, AdminDashboard
    │   └── styles.css          # Design tokens + styles
    └── .gitignore
```

### Design & optimisation notes
- **Layered backend:** routes handle HTTP, `services/` hold reusable queries, middleware handles cross-cutting concerns.
- **Connection pooling** (`mysql2`) with every connection set to UTC; `updated_at` maintained by MySQL (`ON UPDATE CURRENT_TIMESTAMP`).
- **Transactions** keep a request and its first history entry (and every status change + history entry) atomic.
- **Parallel queries:** analytics and the paginated list run their independent queries with `Promise.all`.
- **Indexes** on `(status, created_at)`, `(user_id, created_at)` and `category` back the dashboard filters.
- **No check-then-insert races:** duplicate emails are caught from the `UNIQUE` index error.
- **Frontend:** admin screens are lazy-loaded (separate bundle), request cards are memoised, counts are computed once with `useMemo`, stale responses are ignored.
- **Server owns the rules:** categories/statuses are served at `GET /api/meta` so the client never drifts out of sync.
- **Privacy:** requesting someone else's request returns `404`, not `403`, so ids can't be probed.

---

## Setup

**Requirements:** Node.js 18+, and MySQL 5.7+/8 or MariaDB 10.3+ (for example via XAMPP, WAMP or MAMP, which include phpMyAdmin).

### 1. Database (phpMyAdmin)
1. Start MySQL/Apache from your XAMPP/WAMP control panel and open **http://localhost/phpmyadmin**.
2. Click the **Import** tab → **Choose file** → select `server/database/schema.sql` → **Go**.
   The script creates the `psrs` database, the tables, indexes and demo data.
   (Importing again resets the demo data — see the warning at the top of the file.)

Prefer the command line? `mysql -u root -p < server/database/schema.sql`

### 2. Backend
```bash
cd server
npm install
cp .env.example .env      # edit DB_USER / DB_PASSWORD and set JWT_SECRET
npm run dev               # http://localhost:5000
```
XAMPP's defaults (`root`, empty password) work with the unchanged `.env.example`. Check the connection at http://localhost:5000/api/health — it should return `{"ok":true}`.

### 3. Frontend (new terminal)
```bash
cd client
npm install
npm run dev               # http://localhost:5173
```
The Vite dev server proxies `/api` and `/uploads` to the backend, so no extra config is needed.

### Demo accounts (included in `schema.sql`)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin123!` |
| Citizen | `citizen@example.com` | `Citizen123!` |

New citizen accounts can be registered from the UI. To make someone an admin, change their `role` to `admin` in phpMyAdmin (`users` table).

### Production build
```bash
cd client && npm run build      # outputs client/dist
cd ../server && NODE_ENV=production JWT_SECRET=... npm start
```
Serve `client/dist` from any static host or reverse proxy, forwarding `/api` and `/uploads` to the server (set `CLIENT_ORIGIN` accordingly). Use a dedicated MySQL user instead of `root` in production.

### Troubleshooting
| Symptom | Fix |
|---|---|
| `ECONNREFUSED` / health check fails | MySQL isn't running, or `DB_HOST`/`DB_PORT` in `.env` are wrong |
| `ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER` / `DB_PASSWORD` in `.env` |
| `ER_BAD_DB_ERROR` | `schema.sql` hasn't been imported, or `DB_NAME` isn't `psrs` |
| Login fails for demo users | Re-import `schema.sql` (it contains the demo password hashes) |

---

## API reference

All routes except auth and meta require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | public | API + database check |
| GET | `/api/meta` | public | Categories and statuses |
| POST | `/api/auth/register` | public | Create citizen account |
| POST | `/api/auth/login` | public | Log in, returns token + user |
| GET | `/api/auth/me` | user | Current user |
| POST | `/api/requests` | user | Submit request (`multipart/form-data`) |
| GET | `/api/requests` | user | My requests |
| GET | `/api/requests/:id` | owner/admin | Request with status history |
| GET | `/api/admin/requests?status=&category=&q=&page=&limit=` | admin | `{ items, total, page, pages }` |
| PATCH | `/api/admin/requests/:id/status` | admin | `{ status, note? }` |
| GET | `/api/admin/analytics` | admin | Counts, categories, 7-day trend |

Errors always return `{ "error": "message" }` with an appropriate status code.

---

## Possible next steps
Email/SMS notifications on status change, a map-based location picker, automated tests (Vitest + Supertest), Docker Compose with MySQL.
