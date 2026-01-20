# KHIDMA Platform - Complete API Endpoints Reference

> Quick reference guide for all implemented API endpoints
> Base URL: `/api/v1`

## Authentication Required
Most endpoints require `Authorization: Bearer <token>` header. Exceptions are marked with 🔓.

---

## Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/otp/request` | Request OTP via SMS | 🔓 |
| POST | `/auth/otp/verify` | Verify OTP and get tokens | 🔓 |
| POST | `/auth/token/refresh` | Refresh access token | 🔓 |

---

## User Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user | Any |
| PATCH | `/users/me` | Update user profile | Any |

---

## Tasker Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/taskers/me/profile` | Get tasker profile | Tasker |
| PATCH | `/taskers/me/profile` | Update tasker profile | Tasker |
| POST | `/taskers/apply` | Apply to become tasker | Any |
| GET | `/taskers/me/application-status` | Get application status | Any |
| GET | `/taskers/me/tasks/available` | Get available tasks | Tasker |
| GET | `/taskers/me/tasks/offered` | Get offered tasks | Tasker |
| GET | `/taskers/me/availability` | Get availability schedule | Tasker |
| POST | `/taskers/me/availability/blocks` | Create availability block | Tasker |
| DELETE | `/taskers/me/availability/blocks/:block_id` | Delete availability block | Tasker |
| GET | `/taskers/me/earnings` | Get earnings summary | Tasker |
| GET | `/taskers/me/payouts` | Get payout history | Tasker |
| POST | `/taskers/me/payouts/request` | Request payout | Tasker |

---

## Task Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/tasks` | Create task | Client | ✅ |
| GET | `/tasks` | List tasks | Client | |
| GET | `/tasks/:task_id` | Get task | Any* | |
| PATCH | `/tasks/:task_id` | Update task | Client | |
| POST | `/tasks/:task_id/post` | Post task to marketplace | Client | |
| POST | `/tasks/:task_id/cancel` | Cancel task | Client | |
| POST | `/tasks/:task_id/accept` | Accept task | Tasker | |
| POST | `/tasks/:task_id/decline` | Decline task | Tasker | |
| GET | `/tasks/:task_id/candidates` | Get ranked candidates | Client | |

*Accessible by task owner, assigned tasker, or admin/ops

---

## Booking Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/bookings` | Create booking | Client | ✅ |
| GET | `/bookings/:booking_id` | Get booking | Client/Tasker | |
| POST | `/bookings/:booking_id/status` | Update booking status | Client/Tasker | |
| POST | `/bookings/:booking_id/cancel` | Cancel booking | Client/Tasker | |

---

## Conversation Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| GET | `/conversations` | List conversations | Any | |
| GET | `/conversations/by-booking/:booking_id` | Get conversation by booking | Client/Tasker | |
| GET | `/conversations/:conversation_id/messages` | List messages | Client/Tasker | |
| POST | `/conversations/:conversation_id/messages` | Send message | Client/Tasker | ✅ |

---

## Media Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/media/upload` | Upload media file | Any |
| GET | `/media/:media_id` | Get media file info | Any |

---

## Payment Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/payments/intents` | Create/update payment intent | Client/Tasker | ✅ |
| POST | `/payments/intents/:intent_id/capture` | Capture funds | Client/Tasker/Ops | |

---

## Review Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/reviews` | Create review | Client/Tasker | ✅ |

---

## Report Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/reports` | Create report | Any | ✅ |
| GET | `/reports/me` | Get my reports | Any | |
| GET | `/reports/:report_id` | Get report details | Any | |

---

## Dispute Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/disputes` | Open dispute | Client/Tasker | ✅ |
| GET | `/disputes/:dispute_id` | Get dispute details | Client/Tasker/Admin | |
| POST | `/disputes/:dispute_id/evidence` | Add evidence | Client/Tasker | |

---

## Admin Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/admin/tasks/:task_id/assign` | Manual task assignment | Admin/Ops |
| GET | `/admin/tasks` | List all tasks | Admin/Ops |
| GET | `/admin/bookings` | List all bookings | Admin/Ops |
| GET | `/admin/users` | List all users | Admin/Ops |
| POST | `/admin/users/:user_id/suspend` | Suspend user | Admin/Ops |
| POST | `/admin/users/:user_id/unsuspend` | Unsuspend user | Admin/Ops |
| GET | `/admin/disputes` | List all disputes | Admin/Ops |
| POST | `/admin/disputes/:dispute_id/resolve` | Resolve dispute | Admin/Ops |
| GET | `/admin/metrics` | Get platform metrics | Admin/Ops |

---

## Category & Pricing Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | List categories | Optional |
| GET | `/categories/:category_id/pricing` | Get pricing bands | Optional |
| POST | `/pricing/estimate` | Estimate task price | Optional |

---

## Notification Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/notifications/tokens` | Register push token | Any |
| GET | `/notifications` | List notifications | Any |
| PATCH | `/notifications/:notification_id/read` | Mark as read | Any |
| GET | `/notifications/preferences` | Get preferences | Any |
| PATCH | `/notifications/preferences` | Update preferences | Any |

---

## Webhook Endpoints

| Method | Endpoint | Description | Role | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/webhooks/subscriptions` | Create subscription | Any | ✅ |
| GET | `/webhooks/subscriptions` | List subscriptions | Any | |
| DELETE | `/webhooks/subscriptions/:subscription_id` | Delete subscription | Any | |
| GET | `/webhooks/deliveries` | Get delivery logs | Any | |

---

## Common Query Parameters

### Pagination
- `limit` (integer, default: 20, max: 100)
- `cursor` (string, UUID)

### Filtering
- `state` (string) - Filter by state/status
- `city` (string) - Filter by city
- `start_date` (ISO 8601) - Start date filter
- `end_date` (ISO 8601) - End date filter
- `unread_only` (boolean) - For notifications

---

## Common Headers

### Required
- `Authorization: Bearer <token>` - JWT access token (most endpoints)
- `Content-Type: application/json` - For JSON requests
- `Idempotency-Key: <uuid>` - For mutation endpoints (where marked)

### Optional
- `Accept: application/json` - Response format preference

---

## Response Formats

### Success (200/201)
```json
{
  "id": "uuid",
  ...
}
```

### Paginated Response
```json
{
  "items": [...],
  "next_cursor": "uuid|null"
}
```

### Error (4xx/5xx)
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary amounts are in minor units (e.g., piastres for EGP)
- UUIDs are used for all resource identifiers
- Pagination uses cursor-based approach for consistency
- Idempotency keys are required for mutation endpoints to prevent duplicate operations
