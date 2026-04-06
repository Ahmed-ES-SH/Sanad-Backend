# API Contracts: Payments Module — Client Endpoint

**Feature**: 007-payments-module
**Base URL**: `/payments`
**Authentication**: Required — Bearer JWT (any authenticated user)

---

## POST /payments/create-intent

Create a payment intent with Stripe and store a pending payment record.

### Request

**Body** (`application/json`):

```json
{
  "amount": 50.00,
  "currency": "usd",
  "description": "Web Development Consultation",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | number | Yes | > 0.49, max 2 decimal places |
| `currency` | string | No | Max 10 chars, default `usd` |
| `description` | string | Yes | Not empty |
| `userId` | uuid | No | Valid UUID format |

### Response

**201 Created**:

```json
{
  "clientSecret": "pi_3abc123def456_secret_xyz789",
  "paymentId": "a1b2c3d4-5678-9abc-def0-123456789abc",
  "stripePaymentIntentId": "pi_3abc123def456"
}
```

**400 Bad Request** (validation failure):

```json
{
  "statusCode": 400,
  "message": ["amount must not be less than 0.5", "description should not be empty"],
  "error": "Bad Request"
}
```

**502 Bad Gateway** (Stripe API failure):

```json
{
  "statusCode": 502,
  "message": "Payment gateway temporarily unavailable. Please try again.",
  "error": "Bad Gateway"
}
```

**Notes**: If the Stripe API call fails, no database record is created (atomic operation). The `clientSecret` is used by the frontend Stripe.js to complete the payment.
