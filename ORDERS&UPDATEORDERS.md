# Service Orders API — Frontend Integration Guide

> **Base URL:** `https://your-api-domain.com/api`  
> **Authentication:** All endpoints require a valid JWT token in the `Authorization` header.  
> **Admin endpoints** additionally require the `admin` role.

---

## Table of Contents

1. [Order Status Values](#order-status-values)
2. [User Endpoints](#user-endpoints)
   - [Create Order](#1-create-order)
   - [Initiate Payment](#2-initiate-payment)
   - [List My Orders](#3-list-my-orders)
   - [Get Single Order](#4-get-single-order)
3. [Admin Endpoints](#admin-endpoints)
   - [List All Orders](#5-list-all-orders-admin)
   - [Get Single Order (Admin)](#6-get-single-order-admin)
   - [Update Order Status](#7-update-order-status-admin)
   - [Add Timeline Update](#8-add-timeline-update-admin)
4. [Payment Flow with Stripe](#payment-flow-with-stripe)
5. [Error Handling](#error-handling)

---

## Order Status Values

| Status | Description |
|---|---|
| `pending` | Order created, awaiting payment |
| `paid` | Payment confirmed, being processed |
| `in_progress` | Admin started working on the order |
| `completed` | Order delivered |
| `cancelled` | Order cancelled |

---

## User Endpoints

> **Auth:** Any authenticated user (JWT in `Authorization: Bearer <token>`)

---

### 1. Create Order

Creates a new service order for the authenticated user.

| Method | URL |
|---|---|
| `POST` | `/orders?serviceId={uuid}&notes={string}` |

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `serviceId` | `string (UUID)` | ✅ Yes | The UUID of the service to order |
| `notes` | `string` | ❌ No | Optional notes (max 1000 chars) |

#### Example Request

```bash
curl -X POST "https://your-api-domain.com/api/orders?serviceId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&notes=I+need+this+urgently" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response — 201 Created

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": 5,
  "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Web Development",
    "slug": "web-development",
    "shortDescription": "Professional web development services",
    "iconUrl": "https://...",
    "coverImageUrl": "https://...",
    "basePrice": 500.00,
    "categoryId": "c1d2e3f4-...",
    "isPublished": true,
    "order": 1,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "paymentId": null,
  "status": "pending",
  "amount": 500.00,
  "currency": "usd",
  "notes": "I need this urgently",
  "updates": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "author": "system",
      "content": "Order created for service \"Web Development\".",
      "createdAt": "2026-04-09T12:00:00.000Z"
    }
  ],
  "createdAt": "2026-04-09T12:00:00.000Z",
  "updatedAt": "2026-04-09T12:00:00.000Z"
}
```

#### Error Responses

**404 — Service not found or unpublished**
```json
{
  "statusCode": 404,
  "message": "Service \"a1b2c3d4-e5f6-7890-abcd-ef1234567890\" not found or unavailable",
  "error": "Not Found"
}
```

---

### 2. Initiate Payment

Initiates a Stripe payment for a pending order. Returns a `clientSecret` to use with Stripe.js.

| Method | URL |
|---|---|
| `POST` | `/orders/:id/pay` |

#### Path Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `string (UUID)` | ✅ Yes | The order UUID |

#### Example Request

```bash
curl -X POST "https://your-api-domain.com/api/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/pay" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response — 201 Created

```json
{
  "clientSecret": "pi_3NxYz_secret_abc123",
  "paymentId": "c9d0e1f2-a3b4-5678-cdef-012345678901",
  "stripePaymentIntentId": "pi_3NxYz2eZvKYlo2C0bXcQpRt"
}
```

#### Error Responses

**400 — Order not in pending status**
```json
{
  "statusCode": 400,
  "message": "Cannot initiate payment: order status is \"paid\". Only pending orders can be paid.",
  "error": "Bad Request"
}
```

**400 — Payment already initiated**
```json
{
  "statusCode": 400,
  "message": "Payment already initiated for this order. Check current payment status.",
  "error": "Bad Request"
}
```

**404 — Order not found**
```json
{
  "statusCode": 404,
  "message": "Order \"f47ac10b-58cc-4372-a567-0e02b2c3d479\" not found",
  "error": "Not Found"
}
```

**403 — Access denied (not the order owner)**
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

---

### 3. List My Orders

Lists the authenticated user's orders with pagination.

| Method | URL |
|---|---|
| `GET` | `/orders?page=1&limit=10` |

#### Query Parameters

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | `number` | ❌ No | `1` | Page number (min: 1) |
| `limit` | `number` | ❌ No | `10` | Items per page (min: 1, max: 100) |

#### Example Request

```bash
curl -X GET "https://your-api-domain.com/api/orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "userId": 5,
      "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "service": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Web Development",
        "slug": "web-development",
        "shortDescription": "Professional web development services",
        "iconUrl": "https://...",
        "basePrice": 500.00,
        "isPublished": true,
        "order": 1,
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z"
      },
      "paymentId": "c9d0e1f2-a3b4-5678-cdef-012345678901",
      "status": "paid",
      "amount": 500.00,
      "currency": "usd",
      "notes": "I need this urgently",
      "updates": [
        {
          "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
          "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "author": "system",
          "content": "Order created for service \"Web Development\".",
          "createdAt": "2026-04-09T12:00:00.000Z"
        },
        {
          "id": "c2d3e4f5-a6b7-8901-cdef-123456789012",
          "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "author": "system",
          "content": "Payment initiated. Awaiting confirmation from payment gateway.",
          "createdAt": "2026-04-09T12:05:00.000Z"
        },
        {
          "id": "d3e4f5a6-b7c8-9012-defa-234567890123",
          "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "author": "system",
          "content": "Payment confirmed. Your order is now being processed.",
          "createdAt": "2026-04-09T12:10:00.000Z"
        }
      ],
      "createdAt": "2026-04-09T12:00:00.000Z",
      "updatedAt": "2026-04-09T12:10:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 4. Get Single Order

Gets full details of a single order (including timeline updates). The user must be the order owner.

| Method | URL |
|---|---|
| `GET` | `/orders/:id` |

#### Path Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `string (UUID)` | ✅ Yes | The order UUID |

#### Example Request

```bash
curl -X GET "https://your-api-domain.com/api/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response — 200 OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": 5,
  "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Web Development",
    "slug": "web-development",
    "shortDescription": "Professional web development services",
    "iconUrl": "https://...",
    "basePrice": 500.00,
    "isPublished": true,
    "order": 1,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  "paymentId": "c9d0e1f2-a3b4-5678-cdef-012345678901",
  "status": "in_progress",
  "amount": 500.00,
  "currency": "usd",
  "notes": "I need this urgently",
  "updates": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "author": "system",
      "content": "Order created for service \"Web Development\".",
      "createdAt": "2026-04-09T12:00:00.000Z"
    },
    {
      "id": "c2d3e4f5-a6b7-8901-cdef-123456789012",
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "author": "system",
      "content": "Payment initiated. Awaiting confirmation from payment gateway.",
      "createdAt": "2026-04-09T12:05:00.000Z"
    },
    {
      "id": "d3e4f5a6-b7c8-9012-defa-234567890123",
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "author": "system",
      "content": "Payment confirmed. Your order is now being processed.",
      "createdAt": "2026-04-09T12:10:00.000Z"
    },
    {
      "id": "e4f5a6b7-c8d9-0123-efab-345678901234",
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "author": "admin",
      "content": "Started working on your project. Will update you with progress.",
      "createdAt": "2026-04-09T14:00:00.000Z"
    }
  ],
  "createdAt": "2026-04-09T12:00:00.000Z",
  "updatedAt": "2026-04-09T14:00:00.000Z"
}
```

#### Error Responses

**404 — Order not found**
```json
{
  "statusCode": 404,
  "message": "Order \"f47ac10b-58cc-4372-a567-0e02b2c3d479\" not found",
  "error": "Not Found"
}
```

**403 — Access denied**
```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

---

## Admin Endpoints

> **Auth:** Requires JWT + `admin` role

---

### 5. List All Orders (Admin)

Lists all service orders with optional filtering and pagination.

| Method | URL |
|---|---|
| `GET` | `/admin/orders?page=1&limit=10&status=paid&userId=5&serviceId=abc123` |

#### Query Parameters

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | `number` | ❌ No | `1` | Page number (min: 1) |
| `limit` | `number` | ❌ No | `10` | Items per page (min: 1, max: 100) |
| `status` | `string` | ❌ No | — | Filter by status: `pending`, `paid`, `in_progress`, `completed`, `cancelled` |
| `userId` | `number` | ❌ No | — | Filter by user ID |
| `serviceId` | `string (UUID)` | ❌ No | — | Filter by service UUID |

#### Example Request

```bash
curl -X GET "https://your-api-domain.com/api/admin/orders?page=1&limit=10&status=paid" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "userId": 5,
      "user": {
        "id": 5,
        "email": "user@example.com",
        "name": "John Doe",
        "avatar": "https://...",
        "role": "user",
        "isEmailVerified": true,
        "createdAt": "2026-01-10T08:00:00.000Z",
        "updatedAt": "2026-01-10T08:00:00.000Z"
      },
      "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "service": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Web Development",
        "slug": "web-development",
        "basePrice": 500.00,
        "isPublished": true,
        "order": 1
      },
      "paymentId": "c9d0e1f2-a3b4-5678-cdef-012345678901",
      "status": "paid",
      "amount": 500.00,
      "currency": "usd",
      "notes": null,
      "updates": [
        {
          "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
          "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "author": "system",
          "content": "Order created for service \"Web Development\".",
          "createdAt": "2026-04-09T12:00:00.000Z"
        }
      ],
      "createdAt": "2026-04-09T12:00:00.000Z",
      "updatedAt": "2026-04-09T12:10:00.000Z"
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

---

### 6. Get Single Order (Admin)

Gets full order details including user, service, payment, and timeline.

| Method | URL |
|---|---|
| `GET` | `/admin/orders/:id` |

#### Path Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `string (UUID)` | ✅ Yes | The order UUID |

#### Example Request

```bash
curl -X GET "https://your-api-domain.com/api/admin/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### Response — 200 OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": 5,
  "user": {
    "id": 5,
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "role": "user",
    "isEmailVerified": true,
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-01-10T08:00:00.000Z"
  },
  "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Web Development",
    "slug": "web-development",
    "shortDescription": "Professional web development services",
    "basePrice": 500.00,
    "isPublished": true,
    "order": 1
  },
  "paymentId": "c9d0e1f2-a3b4-5678-cdef-012345678901",
  "payment": {
    "id": "c9d0e1f2-a3b4-5678-cdef-012345678901",
    "stripePaymentIntentId": "pi_3NxYz2eZvKYlo2C0bXcQpRt",
    "amount": 500.00,
    "currency": "usd",
    "status": "succeeded",
    "description": "Service Order: Web Development",
    "metadata": {
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    },
    "createdAt": "2026-04-09T12:05:00.000Z",
    "updatedAt": "2026-04-09T12:10:00.000Z"
  },
  "status": "paid",
  "amount": 500.00,
  "currency": "usd",
  "notes": null,
  "updates": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "author": "system",
      "content": "Order created for service \"Web Development\".",
      "createdAt": "2026-04-09T12:00:00.000Z"
    },
    {
      "id": "c2d3e4f5-a6b7-8901-cdef-123456789012",
      "author": "system",
      "content": "Payment confirmed. Your order is now being processed.",
      "createdAt": "2026-04-09T12:10:00.000Z"
    }
  ],
  "createdAt": "2026-04-09T12:00:00.000Z",
  "updatedAt": "2026-04-09T12:10:00.000Z"
}
```

---

### 7. Update Order Status (Admin)

Updates the status of an order. Automatically adds a timeline entry.

| Method | URL |
|---|---|
| `PATCH` | `/admin/orders/:id/status` |

#### Path Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `string (UUID)` | ✅ Yes | The order UUID |

#### Request Body

```json
{
  "status": "in_progress"
}
```

| Field | Type | Required | Allowed Values |
|---|---|---|---|
| `status` | `string` | ✅ Yes | `pending`, `paid`, `in_progress`, `completed`, `cancelled` |

#### Example Request

```bash
curl -X PATCH "https://your-api-domain.com/api/admin/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

#### Response — 200 OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": 5,
  "user": {
    "id": 5,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Web Development",
    "slug": "web-development",
    "basePrice": 500.00,
    "isPublished": true
  },
  "paymentId": "c9d0e1f2-a3b4-5678-cdef-012345678901",
  "status": "in_progress",
  "amount": 500.00,
  "currency": "usd",
  "notes": null,
  "updates": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "author": "system",
      "content": "Order created for service \"Web Development\".",
      "createdAt": "2026-04-09T12:00:00.000Z"
    },
    {
      "id": "c2d3e4f5-a6b7-8901-cdef-123456789012",
      "author": "system",
      "content": "Payment confirmed. Your order is now being processed.",
      "createdAt": "2026-04-09T12:10:00.000Z"
    },
    {
      "id": "f5a6b7c8-d9e0-1234-fabc-456789012345",
      "author": "admin",
      "content": "Order status changed from \"paid\" to \"in_progress\".",
      "createdAt": "2026-04-09T14:00:00.000Z"
    }
  ],
  "createdAt": "2026-04-09T12:00:00.000Z",
  "updatedAt": "2026-04-09T14:00:00.000Z"
}
```

---

### 8. Add Timeline Update (Admin)

Adds a custom message to the order's timeline (e.g., progress updates, notes).

| Method | URL |
|---|---|
| `POST` | `/admin/orders/:id/updates` |

#### Path Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `string (UUID)` | ✅ Yes | The order UUID |

#### Request Body

```json
{
  "content": "First draft completed. Will start the review phase tomorrow."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `string` | ✅ Yes | Timeline message (1–2000 characters) |

#### Example Request

```bash
curl -X POST "https://your-api-domain.com/api/admin/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/updates" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "First draft completed. Will start the review phase tomorrow."}'
```

#### Response — 201 Created

```json
{
  "id": "a6b7c8d9-e0f1-2345-abcd-567890123456",
  "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "author": "admin",
  "content": "First draft completed. Will start the review phase tomorrow.",
  "createdAt": "2026-04-09T15:00:00.000Z"
}
```

---

## Payment Flow with Stripe

Here's the complete frontend flow for processing a payment:

```
Step 1: User creates an order
  POST /orders?serviceId={uuid}
  → Response: { id: "order-uuid", status: "pending", amount: 500.00 }

Step 2: User initiates payment
  POST /orders/{order-id}/pay
  → Response: { clientSecret: "pi_xxx_secret_yyy", paymentId: "...", stripePaymentIntentId: "..." }

Step 3: Frontend confirms payment with Stripe.js
  stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement }
  })
  → Stripe processes the payment

Step 4: Stripe sends webhook to backend (automatic)
  → Backend updates order status: pending → paid
  → Backend creates system timeline entry: "Payment confirmed..."

Step 5: Frontend polls or checks order status
  GET /orders/{order-id}
  → Response: { status: "paid", ... }
```

### Stripe.js Example (Frontend)

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

// After getting clientSecret from POST /orders/:id/pay
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' },
  },
});

if (error) {
  console.error('Payment failed:', error.message);
} else if (paymentIntent.status === 'succeeded') {
  console.log('Payment succeeded!');
  // Optionally poll GET /orders/:id to confirm status is "paid"
}
```

---

## Error Handling

### Common Error Response Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "error": "Error Type"
}
```

### HTTP Status Codes

| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful GET / PATCH |
| `201` | Created | Successful POST (create order, initiate payment, add update) |
| `400` | Bad Request | Invalid input, order not in correct status, payment already initiated |
| `403` | Forbidden | User doesn't own the order, or non-admin accessing admin routes |
| `404` | Not Found | Order or service not found |
| `401` | Unauthorized | Missing or invalid JWT token |

### Validation Errors (400)

When request body or query params fail validation:

```json
{
  "statusCode": 400,
  "message": [
    "serviceId must be a UUID",
    "notes must not be longer than 1000 characters"
  ],
  "error": "Bad Request"
}
```

---

## Quick Reference

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 1 | `POST` | `/orders?serviceId=&notes=` | User | Create order |
| 2 | `POST` | `/orders/:id/pay` | User | Initiate payment |
| 3 | `GET` | `/orders?page=&limit=` | User | List my orders |
| 4 | `GET` | `/orders/:id` | User | Get single order |
| 5 | `GET` | `/admin/orders?page=&limit=&status=&userId=&serviceId=` | Admin | List all orders |
| 6 | `GET` | `/admin/orders/:id` | Admin | Get order details |
| 7 | `PATCH` | `/admin/orders/:id/status` | Admin | Update order status |
| 8 | `POST` | `/admin/orders/:id/updates` | Admin | Add timeline update |
