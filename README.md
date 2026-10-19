# Huduma Hub — Public Service Request System

A citizen service-request application for reporting local issues, tracking progress, and helping administrators manage cases.

**Stack:** React 18, Vite, React Router, Node.js, Express, MySQL, and JWT authentication.

## Features

- Citizen registration and login with bcrypt-hashed passwords and seven-day JWTs
- Submit requests with category, location, description, and an optional image
- Citizen request history and status timelines
- Admin request search, filters, pagination, status updates, and analytics
- Responsive interface with image previews and accessible form controls
- Authentication rate limiting, Helmet security headers, and validated image uploads

## Repository layout

```text
server/
  database/psrs_eCitizen.sql   Database dump
  src/
    app.js                     Express middleware and route mounting
    server.js                  HTTP server startup
    config.js                  Environment-based configuration
    constants.js               Valid request categories and statuses
    routes/                    Authentication, citizen, and admin endpoints
    services/                  Shared request/history queries
    middleware/                Authentication and image upload handling
  uploads/                     Uploaded images (created at runtime)
client/
  public/.htaccess             Apache fallback for client-side routes
  src/
    api.js                     Shared API client
    pages/                     Login, registration, citizen, and admin screens
    components/                Shared UI components
```

## Local development

### Requirements

- Node.js 18 or later
- MySQL

### Database

Import [`server/database/psrs_eCitizen.sql`](./server/database/psrs_eCitizen.sql) into MySQL. It is a database dump for `psrs_eCitizen`; inspect the SQL before importing it into a database that already contains data.

### Backend

Install dependencies in `server/`, configure `server/.env`, then start the API:

```bash
cd server
npm install
npm run dev
```

Configure at least `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `CLIENT_ORIGIN`. Use `DB_NAME=psrs_eCitizen`. Set a strong, unique `JWT_SECRET` outside development. For local development, `CLIENT_ORIGIN` is typically `http://localhost:5173`.

### Frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

## Production deployment

Build the frontend with `cd client && npm run build`. Deploy the contents of `client/dist` to the frontend document root.

Configure the backend's production environment with the database credentials, a strong `JWT_SECRET`, and:

```text
CLIENT_ORIGIN=http://localhost:5173
```

`CLIENT_ORIGIN` must match the frontend's scheme and hostname exactly and must not include a path or trailing slash. Multiple origins can be comma-separated. Restart the backend after changing environment variables. Use a dedicated database user with only the required privileges.

## API reference

### Base URL

```text
http://localhost:5000
```

For JSON requests, send `Content-Type: application/json`. Protected routes require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Registration and login return a JWT that expires after seven days. Replace `{id}` in a URL with the relevant request ID. Examples below use illustrative data.

### Authentication

#### Register

`POST /api/auth/register` — public; creates a citizen account.

**Request body:**

```json
{
  "name": "Jane Citizen",
  "email": "jane@example.com",
  "password": "securepass123"
}
```

Name must be at least 2 characters, email must be valid, and password must be at least 8 characters.

**Success — `201 Created`:**

```json
{
  "token": "YOUR_JWT_TOKEN",
  "user": {
    "id": 12,
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "role": "citizen"
  }
}
```

#### Login

`POST /api/auth/login` — public.

**Request body:**

```json
{
  "email": "jane@example.com",
  "password": "securepass123"
}
```

**Success — `200 OK`:** Same response shape as registration.

```json
{
  "token": "YOUR_JWT_TOKEN",
  "user": {
    "id": 12,
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "role": "citizen"
  }
}
```

#### Get current user

`GET /api/auth/me` — authenticated; no request body.

**Success — `200 OK`:**

```json
{
  "user": {
    "id": 12,
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "role": "citizen"
  }
}
```

### Citizen requests

All `/api/requests` endpoints require authentication. Citizens can access their own requests; administrators can access any request.

#### Create a request

`POST /api/requests` — authenticated citizen. Send as `multipart/form-data`, not JSON. The optional image field must be named `image`; accepted types are JPG, PNG, and WebP, with a 5 MB maximum.

**Form fields:**

```text
category=Streetlight
location=Kenyatta Avenue, near Total Petrol Station
description=The streetlight has been out for a week.
image=<optional image file>
```

Allowed categories are `Streetlight`, `Water Issue`, `Garbage Collection`, `Road Damage`, `Drainage & Sewer`, and `Other`. Location must be 3–255 characters; description must be 10–1000 characters.

**Success — `201 Created`:**

```json
{
  "id": 18,
  "user_id": 12,
  "category": "Streetlight",
  "location": "Kenyatta Avenue, near Total Petrol Station",
  "description": "The streetlight has been out for a week.",
  "image_path": "/uploads/example-image.jpg",
  "status": "Pending",
  "created_at": "2026-10-19T00:00:00.000Z",
  "updated_at": "2026-10-19T00:00:00.000Z",
  "citizen_name": "Jane Citizen",
  "citizen_email": "jane@example.com",
  "history": [
    {
      "id": 42,
      "status": "Pending",
      "note": "Request submitted",
      "created_at": "2026-10-19T00:00:00.000Z",
      "changed_by_name": "Jane Citizen"
    }
  ]
}
```

`image_path` is `null` when no image is uploaded. To retrieve an image, append its path to the production base URL.

#### List my requests

`GET /api/requests` — authenticated citizen; no request body.

**Success — `200 OK`:** Array of request records. The list response does not include `history`.

```json
[
  {
    "id": 18,
    "user_id": 12,
    "category": "Streetlight",
    "location": "Kenyatta Avenue, near Total Petrol Station",
    "description": "The streetlight has been out for a week.",
    "image_path": null,
    "status": "Pending",
    "created_at": "2026-10-19T00:00:00.000Z",
    "updated_at": "2026-10-19T00:00:00.000Z",
    "citizen_name": "Jane Citizen",
    "citizen_email": "jane@example.com"
  }
]
```

#### Get a request and its history

`GET /api/requests/{id}` — authenticated owner or administrator; no request body.

**Success — `200 OK`:** One request record with a `history` array, in the same shape as the create-request response.

### Administrator endpoints

All `/api/admin` endpoints require an administrator token.

#### List, filter, and search requests

`GET /api/admin/requests` — no request body.

**Success — `200 OK`:**

```json
{
  "items": [
    {
      "id": 18,
      "user_id": 12,
      "category": "Streetlight",
      "location": "Kenyatta Avenue, near Total Petrol Station",
      "description": "The streetlight has been out for a week.",
      "image_path": null,
      "status": "Pending",
      "created_at": "2026-10-19T00:00:00.000Z",
      "updated_at": "2026-10-19T00:00:00.000Z",
      "citizen_name": "Jane Citizen",
      "citizen_email": "jane@example.com"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

#### Update request status

`PATCH /api/admin/requests/{id}/status`

**Request body:**

```json
{
  "status": "In Progress",
  "note": "A maintenance team has been assigned."
}
```

`status` must be `Pending`, `In Progress`, or `Resolved`. `note` is optional and limited to 500 characters.

**Success — `200 OK`:** The updated request record with its `history` array.

#### Get analytics

`GET /api/admin/analytics` — no request body.

**Success — `200 OK`:**

```json
{
  "total": 20,
  "open": 8,
  "resolved": 12,
  "byStatus": {
    "Pending": 3,
    "In Progress": 5,
    "Resolved": 12
  },
  "resolutionRate": 60,
  "avgResolutionHours": 18.5,
  "byCategory": [
    {
      "category": "Streetlight",
      "total": 6,
      "resolved": 4
    }
  ],
  "last7Days": [
    {
      "day": "2026-10-19",
      "count": 2
    }
  ]
}
```

## Errors and limits

Errors return JSON in this form:

```json
{
  "error": "Error description"
}
```

Typical status codes:

| Status | Meaning                                                                |
| ------ | ---------------------------------------------------------------------- |
| `400`  | Invalid input, unsupported image, or malformed JSON                    |
| `401`  | Missing/invalid/expired token or incorrect credentials                 |
| `403`  | Authenticated user is not an administrator                             |
| `404`  | Endpoint or request not found, or request is not visible to the caller |
| `409`  | Registration email is already in use                                   |
| `429`  | Authentication rate limit exceeded                                     |
| `500`  | Unexpected server error                                                |

Authentication routes are limited to 50 attempts per 15-minute window.
