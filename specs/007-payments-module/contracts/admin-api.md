# API Contracts: Payments Module — Admin Endpoints

**Feature**: 007-payments-module
**Base URL**: `/admin/payments`
**Authentication**: Required — Bearer JWT, `admin` role

---

## GET /admin/payments

List all payments with filters and pagination.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |
| `sortBy` | string | No | `createdAt` | Column to sort by |
| `order` | string | No | `DESC` | Sort direction: `ASC` or `DESC` |
| `status` | string | No | — | Filter by status: `pending`, `succeeded`, `failed`, `refunded` |
| `startDate` | string | No | — | Filter from date (ISO 8601, e.g., `2026-01-01`) |
| `endDate` | string | No | — | Filter until date (ISO 8601, e.g., `2026-12-31`) |
| `userId` | uuid | No | — | Filter by user ID |

### Response

**200 OK**:

```json
{
  "data": [
    {
      "id": "a1b2c3d4-5678-9abc-def0-123456789abc",
      "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "stripePaymentIntentId": "pi_3abc123def456",
      "stripeCustomerId": "cus_abc123",
      "amount": 50.00,
      "currency": "usd",
      "status": "succeeded",
      "description": "Web Development Consultation",
      "metadata": { "receipt_email": "client@example.com" },
      "createdAt": "2026-04-06T05:00:00.000Z",
      "updatedAt": "2026-04-06T05:01:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**401 Unauthorized**:

```json
{
  "statusCode": 401,
  "message": "Please provide a valid bearer token",
  "error": "Unauthorized"
}
```

---

## GET /admin/payments/:id

Get a single payment's full details.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Payment UUID |

### Response

**200 OK**:

```json
{
  "id": "a1b2c3d4-5678-9abc-def0-123456789abc",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "stripePaymentIntentId": "pi_3abc123def456",
  "stripeCustomerId": "cus_abc123",
  "amount": 50.00,
  "currency": "usd",
  "status": "succeeded",
  "description": "Web Development Consultation",
  "metadata": { "receipt_email": "client@example.com" },
  "createdAt": "2026-04-06T05:00:00.000Z",
  "updatedAt": "2026-04-06T05:01:00.000Z"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Payment not found",
  "error": "Not Found"
}
```

---

## POST /admin/payments/:id/refund

Issue a refund for a succeeded payment.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Payment UUID |

### Response

**200 OK**:

```json
{
  "id": "a1b2c3d4-5678-9abc-def0-123456789abc",
  "status": "refunded",
  "message": "Payment refunded successfully"
}
```

**400 Bad Request** (payment not in `succeeded` status):

```json
{
  "statusCode": 400,
  "message": "Cannot refund: payment status is 'pending'. Only succeeded payments can be refunded.",
  "error": "Bad Request"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Payment not found",
  "error": "Not Found"
}
```

**502 Bad Gateway** (Stripe refund fails):

```json
{
  "statusCode": 502,
  "message": "Refund failed at payment gateway. Payment status unchanged.",
  "error": "Bad Gateway"
}
```
