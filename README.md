# Huduma Hub — Public Service Request System

A citizen service-request application for reporting local issues, tracking progress, and helping administrators manage cases.

**Stack:** React 18, Vite, React Router, Node.js, Express, MySQL, and JWT authentication.

## Live production site

Try Huduma Hub at **[https://hudumahub.jmatecsystems.com](https://hudumahub.jmatecsystems.com)**.

The logins for citizen and Admin should be accessed in`server/.env.example` file.

## Features

- Citizen registration and login
- Submit a request with a category, location, description, and optional image
- Admin dashboard for managing requests and users
- Status tracking: Pending → In Progress → Resolved
- Basic analytics showing open and resolved cases
- WhatsApp contact button and guided support chatbot
- Email and SMS notifications for account welcome, request receipt, and status updates
- Email confirmation and support-team follow-up for chatbot inquiries

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

- Node.js 20 or later
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

Configure at least `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET`. Use `DB_NAME=psrs_eCitizen`. Set a strong, unique `JWT_SECRET` outside development. The API allows the hosted Huduma Hub frontend and `http://localhost:5173` by default; `CLIENT_ORIGIN` may be used to add comma-separated frontend origins.

Configure notification delivery with `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `SMS_API_KEY`, and `SMS_SENDER_ID`. The current email setup uses port `465` with implicit TLS; `CLIENT_URL` optionally sets the destination of the email button. `SUPPORT_EMAIL` optionally sets the inbox for chatbot contact requests; by default they are sent to `EMAIL_USERNAME`. Keep all credentials in the ignored `server/.env` locally and in the hosting provider's secret environment settings in production. Never commit real credentials. Registration welcomes are sent by email and SMS, while citizens receive an email and SMS when an administrator changes a request's status. New requests receive a pending-status confirmation by email and SMS. Notifications are best-effort: a provider failure is logged by the backend and does not undo a successful account, request, or status change. Legacy profiles without a phone number cannot receive SMS until a number is added.

The floating contact assistant is available on login, registration, and app pages. It offers quick request-help answers and a contact-an-agent flow that collects a name, email, phone number, and message. Support inquiries are rate-limited and emailed to `SUPPORT_EMAIL`; the requester receives an acknowledgment from the configured `EMAIL_USERNAME` mailbox.

### Frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

## Production deployment

Build the frontend with `cd client && npm run build`. Deploy the contents of `client/dist` to the frontend document root.

Configure the backend's production environment with the database credentials and a strong `JWT_SECRET`. If setting `CLIENT_ORIGIN`, include both the deployed frontend and any local development origin that should access this API:

```text
CLIENT_ORIGIN=https://hudumahub.jmatecsystems.com,http://localhost:5173
```

Each `CLIENT_ORIGIN` must match its frontend's scheme and hostname exactly and must not include a path or trailing slash. Multiple origins can be comma-separated. Restart the backend after changing environment variables. Use a dedicated database user with only the required privileges.

During local Vite development, requests use the configured `/api` and `/uploads` development proxy to `http://localhost:5000`. Production builds use `https://hudumahubapi.jmatecsystems.com` unless `VITE_API_BASE_URL` is set at build time.

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
  "phone": "+254712345678",
  "password": "securepass123"
}
```

Name must be at least 2 characters, email must be valid, phone must include a country code and contain 7–15 digits, and password must be at least 8 characters. Spaces, parentheses, periods, and hyphens in the phone number are removed before storage.

**Success — `201 Created`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6ImNpdGl6ZW4iLCJpYXQiOjE3OTI0MzY5OTAsImV4cCI6MTc5MzA0MTc5MH0.UhIhdVlv9AlqvHt2cetmu0Hbhy2e6-g5adH6JciOTxk",
  "user": {
    "id": 12,
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "phone": "+254712345678",
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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6ImNpdGl6ZW4iLCJpYXQiOjE3OTI0MzY5OTAsImV4cCI6MTc5MzA0MTc5MH0.UhIhdVlv9AlqvHt2cetmu0Hbhy2e6-g5adH6JciOTxk",
  "user": {
    "id": 12,
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "phone": "+254712345678",
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
    "phone": "+254712345678",
    "role": "citizen"
  }
}
```

#### Update profile

`PATCH /api/auth/profile` — authenticated. Updates the account name and phone. Email is read-only. The current password is required for every update; new-password fields are optional unless changing the password.

**Request body:**

```json
{
  "name": "Jane Citizen",
  "phone": "+254712345678",
  "currentPassword": "old-password",
  "newPassword": "new-securepass123",
  "confirmPassword": "new-securepass123"
}
```

To update only the name or phone, omit `newPassword` and `confirmPassword`.

**Success — `200 OK`:**

```json
{
  "user": {
    "id": 12,
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "phone": "+254712345678",
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
After saving a request, the system sends the citizen an email and SMS confirming receipt and the initial `Pending` status. Notification delivery is best-effort and does not affect request creation.

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

### Public support contact

`POST /api/contact` — public, limited to five submissions per IP in 15 minutes.

**Request body:**

```json
{
  "name": "Jane Citizen",
  "email": "jane@example.com",
  "phone": "+254712345678",
  "message": "I need help understanding the status of my service request."
}
```

**Success — `202 Accepted`:** The support team is emailed the inquiry, and the requester receives a confirmation email.

```json
{
  "message": "Your support request has been received. We will contact you soon."
}
```

### Administrator endpoints

All `/api/admin` endpoints require an administrator token.

#### Create a user

`POST /api/admin/users` — admin only. The admin dashboard provides a separate **Add User** page for this action. Creates either a citizen or administrator account. Email addresses must be unique; passwords are stored as bcrypt hashes.

**Request body:**

```json
{
  "name": "Amina Otieno",
  "email": "amina@example.com",
  "phone": "+254712345678",
  "password": "temporary-pass-123",
  "role": "citizen"
}
```

`role` must be `citizen` or `admin`. Phone must include a country code and contain 7–15 digits; spaces, parentheses, periods, and hyphens are removed before storage.

**Success — `201 Created`:**

```json
{
  "user": {
    "id": 25,
    "name": "Amina Otieno",
    "email": "amina@example.com",
    "phone": "+254712345678",
    "role": "citizen"
  }
}
```

#### Update a user

`PATCH /api/admin/users/{id}` — admin only. Updates the user's name, email, phone, and role. Set `password` to a new value of at least eight characters to reset it; omit it or send an empty string to keep the current password. Send `phone` as an empty string to clear it. Email addresses must remain unique. Administrators cannot change their own role, and the last administrator cannot be demoted.

**Request body:**

```json
{
  "name": "Amina Otieno",
  "email": "amina@example.com",
  "phone": "+254712345678",
  "role": "citizen",
  "password": ""
}
```

**Success — `200 OK`:** Returns the updated user in the same shape as the create-user response.

#### Delete a user

`DELETE /api/admin/users/{id}` — admin only. Permanently deletes the user and, due to the database's cascading foreign keys, their service requests and request history. Administrators cannot delete their own account or the last administrator.

**Success — `200 OK`:**

```json
{
  "deleted": true,
  "id": 25
}
```

#### List users

`GET /api/admin/users?page=1` — admin only. Returns at most five users per page, ordered newest first. No request body.

**Success — `200 OK`:**

```json
{
  "items": [
    {
      "id": 25,
      "name": "Amina Otieno",
      "email": "amina@example.com",
      "phone": "+254712345678",
      "role": "citizen",
      "created_at": "2026-10-19T12:00:00.000Z"
    }
  ],
  "total": 21,
  "page": 1,
  "pages": 5
}
```

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
