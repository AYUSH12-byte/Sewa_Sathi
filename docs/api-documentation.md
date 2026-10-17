# SewaSathi — RESTful API Reference Specification
## Complete Endpoint Reference, Request Schemas & Example Payloads

---

## 1. Conventions & Standards

- **Base URL:** `http://localhost:7000/api/v1` (Production: `https://api.sewasathi.com/api/v1`)
- **Transport:** HTTPS with JSON request/response bodies.
- **Authentication Header:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1.1 Standard Response Envelopes

#### Success Envelope (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Envelope (`400`, `401`, `403`, `404`, `409`, `500`):
```json
{
  "success": false,
  "code": "ERROR_CODE_ENUM",
  "message": "Human-readable explanation of error",
  "errors": [ ... ]
}
```

---

## 2. API Endpoints Catalog

### 2.1 Authentication & Profile (`/auth`, `/users`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | Any | Register as `CUSTOMER` or `PROVIDER` |
| `POST` | `/auth/login` | Public | Any | Authenticate and obtain dual JWT tokens |
| `POST` | `/auth/refresh-token` | Public | Any | Rotate access token using valid refresh token |
| `POST` | `/auth/logout` | Required | Any | Invalidate current session and clear cookies |
| `GET` | `/auth/me` | Required | Any | Retrieve authenticated profile |
| `PATCH` | `/users/me` | Required | Any | Update profile details (name, phone, address) |
| `PATCH` | `/users/me/password` | Required | Any | Change password with current password verification |

---

### 2.2 Provider Management & Public Discovery (`/providers`, `/discovery`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/discovery/providers` | Public | Any | Geospatial & category search with smart scoring |
| `GET` | `/discovery/providers/:id` | Public | Any | Public provider profile with verified reviews |
| `GET` | `/providers/me` | Required | `PROVIDER` | Get logged-in provider's full business profile |
| `PATCH` | `/providers/me` | Required | `PROVIDER` | Update business name, bio, experience, rate, address |
| `PATCH` | `/providers/me/availability` | Required | `PROVIDER` | Update weekly schedule (Sunday-Saturday slots) |
| `POST` | `/providers/me/services` | Required | `PROVIDER` | Add service offering with custom price |
| `GET` | `/providers/me/services` | Required | `PROVIDER` | List provider's enrolled services |

---

### 2.3 Service Categories (`/categories`, `/services`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/categories` | Public | Any | List all active categories (Plumbing, Electrical, etc.) |
| `GET` | `/categories/:id` | Public | Any | Get category details with nested services |
| `POST` | `/categories` | Required | `ADMIN` | Create new category (icon, name, slug) |
| `GET` | `/services` | Public | Any | List all catalog services |
| `POST` | `/services` | Required | `ADMIN` | Create standard catalog service |

---

### 2.4 Bookings Lifecycle (`/bookings`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/bookings` | Required | `CUSTOMER` | Book a service (date, slot, address, notes) |
| `GET` | `/bookings` | Required | Any | List bookings (Customer or Provider perspective) |
| `GET` | `/bookings/:id` | Required | Any | Get booking details with full audit timeline |
| `PATCH` | `/bookings/:id/accept` | Required | `PROVIDER` | Provider accepts `PENDING` booking request |
| `PATCH` | `/bookings/:id/reject` | Required | `PROVIDER` | Provider rejects `PENDING` booking request with reason |
| `PATCH` | `/bookings/:id/cancel` | Required | Any | Cancel booking before work starts |
| `PATCH` | `/bookings/:id/status` | Required | `PROVIDER` | Advance lifecycle (`SCHEDULED` ➔ `ON_WAY` ➔ `IN_PROGRESS` ➔ `COMPLETED`) |

---

### 2.5 Payments & Escrow (`/payments`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/payments/bookings/:id` | Required | `CUSTOMER` | Initialize payment (`CASH` or `ESEWA`) |
| `GET` | `/payments/:id` | Required | Any | View payment transaction details |
| `POST` | `/payments/:id/verify` | Required | Any | Verify eSewa transaction with merchant signature |
| `POST` | `/payments/:id/confirm-cash`| Required | `PROVIDER` / `ADMIN` | Confirm physical cash received from customer |

---

### 2.6 Reviews & Complaints (`/reviews`, `/complaints`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/reviews/bookings/:id` | Required | `CUSTOMER` | Submit review for completed & paid booking |
| `GET` | `/reviews/provider/:id` | Public | Any | List public reviews for a provider |
| `POST` | `/complaints` | Required | Any | Report an issue or grievance |
| `GET` | `/complaints/me` | Required | Any | List complaints submitted by authenticated user |
| `PATCH` | `/complaints/:id` | Required | `ADMIN` | Resolve or dismiss complaint ticket |

---

### 2.7 In-App Chat & Notifications (`/chat`, `/notifications`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/chat/conversations` | Required | Any | Start or get 1-to-1 conversation with another user |
| `GET` | `/chat/conversations` | Required | Any | List all user conversations with last message |
| `GET` | `/chat/conversations/:id/messages` | Required | Any | Fetch paginated chat history |
| `POST` | `/chat/conversations/:id/messages` | Required | Any | Send chat message |
| `GET` | `/notifications` | Required | Any | Get unread & recent in-app notifications |
| `PATCH`| `/notifications/:id/read` | Required | Any | Mark notification as read |

---

### 2.8 Administrative Control Center (`/admin`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/admin/dashboard/stats` | Required | `ADMIN` | Platform KPIs: users, providers, bookings, revenue |
| `GET` | `/admin/providers` | Required | `ADMIN` | List all providers with verification status |
| `PATCH`| `/admin/providers/:id/verify`| Required | `ADMIN` | Approve KYC and verify provider |
| `PATCH`| `/admin/providers/:id/reject`| Required | `ADMIN` | Reject provider application |
| `GET` | `/admin/users` | Required | `ADMIN` | Search and filter registered accounts |
| `PATCH`| `/admin/users/:id/status` | Required | `ADMIN` | Activate or suspend user account |
| `GET` | `/admin/bookings` | Required | `ADMIN` | Full bookings oversight |
| `GET` | `/admin/payments` | Required | `ADMIN` | Complete financial payment ledger |
| `GET` | `/admin/reviews` | Required | `ADMIN` | Review moderation queue |
| `PATCH`| `/admin/reviews/:id/moderate`| Required | `ADMIN` | Hide or unhide flagged review |

---

## 3. Sample Payloads

### 3.1 Booking Creation Request
```json
POST /api/v1/bookings
{
  "providerId": "651a2b3c4d5e6f7a8b9c0d1e",
  "serviceId": "651a2b3c4d5e6f7a8b9c0d2f",
  "schedule": {
    "date": "2026-10-25",
    "timeSlot": "MORNING"
  },
  "address": {
    "street": "Maitidevi Marg, House #45",
    "locality": "Maitidevi",
    "city": "Kathmandu",
    "fullAddress": "Near Maitidevi Temple, Kathmandu"
  },
  "customerNote": "Please bring a pipe wrench and replacement washer.",
  "quantity": 1
}
```

### 3.2 eSewa Payment Initialization Response
```json
POST /api/v1/payments/bookings/651a2b3c4d5e6f7a8b9c0d99
{
  "method": "ESEWA"
}

// Response:
{
  "success": true,
  "message": "eSewa checkout initialized",
  "data": {
    "paymentId": "651a2b3c4d5e6f7a8b9c0e00",
    "amount": 750,
    "esewaConfig": {
      "amount": 750,
      "taxAmount": 0,
      "totalAmount": 750,
      "transactionUuid": "PAY-20261025-0012",
      "productCode": "EPAYTEST",
      "signature": "m1kK89PzL2iQv+N...=",
      "actionUrl": "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
    }
  }
}
```
