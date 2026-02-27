# GrowBucks API Reference

Complete API documentation for GrowBucks endpoints.

## Authentication

All endpoints require authentication via NextAuth session. Endpoints return:
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Insufficient permissions (e.g., child accessing parent-only endpoints)
- `404 Not Found` - Resource doesn't exist or user doesn't have access

---

## Children

### List Children
```
GET /api/children
```

Returns all children for the authenticated parent, with interest statistics.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Emma",
    "avatar_url": "https://...",
    "balance_cents": 10050,
    "interest_rate_daily": 0.01,
    "interest_paused": false,
    "last_interest_at": "2026-02-27T00:00:00Z",
    "created_at": "2026-02-01T00:00:00Z",
    "interest_earned_this_month": 523
  }
]
```

### Create Child
```
POST /api/children
```

**Body:**
```json
{
  "name": "Emma",           // Required: 1-50 characters
  "pin": "1234",           // Required: 4-6 digits
  "interest_rate_daily": 0.01,  // Optional: 0.001-0.05 (default: 0.01)
  "avatar_url": "https://..."   // Optional
}
```

**Response:** `201 Created` with child object

**Limits:** Maximum 10 children per parent

### Get Child Details
```
GET /api/children/[id]
```

Returns detailed child info with recent transactions.

### Update Child
```
PATCH /api/children/[id]
```

**Body:** (all fields optional)
```json
{
  "name": "Emma Rose",
  "pin": "5678",
  "interest_rate_daily": 0.02,
  "interest_paused": true,
  "avatar_url": "https://..."
}
```

### Delete Child
```
DELETE /api/children/[id]
```

**Response:** `200 OK` or `404 Not Found`

---

## Transactions

### Create Transaction
```
POST /api/transactions
```

**Body:**
```json
{
  "child_id": "uuid",
  "type": "deposit" | "withdrawal",
  "amount_cents": 1000,    // $0.01 - $10,000
  "description": "Birthday money"  // Optional
}
```

**Behavior:**
- **Deposits:** Parent-only, processed immediately
- **Withdrawals:**
  - Parent: Processed immediately
  - Child: Creates pending request for parent approval

**Response:** `201 Created` with transaction object

### Approve/Reject Withdrawal
```
PATCH /api/transactions
```

Parent-only endpoint for pending withdrawal requests.

**Body:**
```json
{
  "transaction_id": "uuid",
  "approved": true | false,
  "reason": "Optional rejection reason"
}
```

**Response:**
```json
{
  "success": true,
  "status": "approved" | "rejected"
}
```

### Get Pending Withdrawals
```
GET /api/pending-withdrawals
```

Returns count and list of pending withdrawal requests.

**Response:**
```json
{
  "count": 2,
  "totalCents": 1500,
  "withdrawals": [
    {
      "id": "uuid",
      "childId": "uuid",
      "childName": "Emma",
      "amountCents": 1000,
      "description": "Candy money",
      "requestedAt": "2026-02-27T10:00:00Z"
    }
  ]
}
```

---

## Goals

### List Goals
```
GET /api/goals
```

Returns all savings goals for the parent's children.

**Response:**
```json
[
  {
    "id": "uuid",
    "child_id": "uuid",
    "child_name": "Emma",
    "name": "New Bike",
    "target_cents": 15000,
    "current_cents": 10050,
    "target_date": "2026-06-01",
    "emoji": "🚲",
    "is_active": true,
    "created_at": "2026-02-01T00:00:00Z"
  }
]
```

### Create Goal
```
POST /api/goals
```

**Body:**
```json
{
  "child_id": "uuid",     // Required
  "name": "New Bike",     // Required
  "target_cents": 15000,  // Required
  "target_date": "2026-06-01",  // Optional
  "emoji": "🚲"           // Optional, defaults to "🎯"
}
```

**Response:** `201 Created` with goal object

---

## Notifications

### List Notifications
```
GET /api/notifications
```

Returns unread notifications (up to 20).

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "interest" | "deposit" | "withdrawal" | "goal",
      "title": "Interest Earned!",
      "message": "Emma earned $0.10 in interest today",
      "emoji": "📈",
      "amount_cents": 10,
      "child_id": "uuid",
      "created_at": "2026-02-27T00:00:00Z",
      "read_at": null
    }
  ],
  "unreadCount": 5
}
```

### Create Notification
```
POST /api/notifications
```

**Body:**
```json
{
  "childId": "uuid",
  "type": "interest",
  "title": "Interest Earned!",
  "message": "Emma earned $0.10 today",
  "emoji": "📈",
  "amountCents": 10
}
```

### Mark Notification Read
```
PATCH /api/notifications/[id]/read
```

### Mark All Read
```
POST /api/notifications/read-all
```

---

## Notification Settings

### Get Settings
```
GET /api/notification-settings
```

**Response:**
```json
{
  "settings": {
    "email_enabled": true,
    "push_enabled": true,
    "interest_email": true,
    "interest_push": true,
    "deposits_email": true,
    "deposits_push": true,
    "withdrawals_email": true,
    "withdrawals_push": true,
    "goals_email": true,
    "goals_push": false,
    "quiet_hours_enabled": false,
    "quiet_hours_start": "21:00",
    "quiet_hours_end": "07:00"
  }
}
```

### Update Settings
```
PUT /api/notification-settings
```

**Body:** Any subset of settings fields

---

## Interest Calculation

### Run Interest Calculation
```
POST /api/calculate-interest
```

Calculates daily compound interest for all children. Handles catch-up for missed days.

**Note:** This endpoint is called by Vercel Cron daily at midnight UTC.

**Response:**
```json
{
  "processed": 15,
  "totalInterestCents": 523,
  "skipped": 2
}
```

---

## Authentication Endpoints

### Sign Up
```
POST /api/auth/signup
```

**Body:**
```json
{
  "email": "parent@example.com",
  "password": "SecurePass123",
  "name": "Parent Name"
}
```

### Change Password
```
POST /api/auth/change-password
```

Parent-only. Does not work for Google OAuth accounts.

**Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one letter
- At least one number

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

---

## Rate Limits

Currently no rate limiting is implemented. For production deployments, consider adding rate limiting via Vercel Edge Middleware or a service like Upstash.
