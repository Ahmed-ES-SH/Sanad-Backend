# API Contracts: Payments Module — Webhook Endpoint

**Feature**: 007-payments-module
**Base URL**: `/api/stripe`
**Authentication**: None (public endpoint) — Protected by Stripe webhook signature verification

---

## POST /api/stripe/webhook

Receive and process Stripe webhook events. This endpoint uses raw body parsing (not JSON) for signature verification.

### Request

**Headers**:

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `stripe-signature` | string | Yes | Stripe webhook signature header |
| `content-type` | string | Yes | Must be `application/json` (Stripe sends JSON, parsed as raw buffer) |

**Body** (raw buffer — not JSON parsed):

```json
{
  "id": "evt_1abc2def3ghi",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3abc123def456",
      "amount": 5000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {}
    }
  }
}
```

### Handled Event Types

| Event Type | Action | DB Status Update |
|------------|--------|-----------------|
| `payment_intent.succeeded` | Update payment status | `pending` → `succeeded` |
| `payment_intent.payment_failed` | Update payment status | `pending` → `failed` |
| `charge.refunded` | Update payment status | `succeeded` → `refunded` |

### Response

**200 OK** (event processed successfully or gracefully ignored):

```json
{
  "received": true
}
```

**Notes**:
- Always returns 200 to Stripe, even if the payment intent ID is not found in the database (logged but not an error to the gateway).
- Invalid signatures result in the event being rejected and 400 returned.
- Duplicate events are handled idempotently — if the payment is already in the target status, the update is skipped silently.

**400 Bad Request** (invalid signature):

```json
{
  "statusCode": 400,
  "message": "Invalid webhook signature",
  "error": "Bad Request"
}
```
