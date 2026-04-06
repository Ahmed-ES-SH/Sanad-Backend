# API Contracts: Contact Module — Admin Endpoints

**Feature**: 006-contact-module
**Base URL**: `/admin/contact`
**Authentication**: Required — Bearer JWT, `admin` role

---

## GET /admin/contact

List all contact messages with pagination, sorting, and read/unread filtering.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |
| `sortBy` | string | No | `createdAt` | Column to sort by |
| `order` | string | No | `DESC` | Sort direction: `ASC` or `DESC` |
| `isRead` | boolean | No | — | Filter: `true` = read only, `false` = unread only, omitted = all |

### Response

**200 OK**:

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "subject": "Project Inquiry",
      "message": "I would like to discuss a potential project collaboration...",
      "isRead": false,
      "repliedAt": null,
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-04-06T05:00:00.000Z",
      "updatedAt": "2026-04-06T05:00:00.000Z"
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

## GET /admin/contact/:id

Get a single contact message by ID.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | ContactMessage UUID |

### Response

**200 OK**:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project Inquiry",
  "message": "I would like to discuss a potential project collaboration...",
  "isRead": false,
  "repliedAt": null,
  "ipAddress": "192.168.1.1",
  "createdAt": "2026-04-06T05:00:00.000Z",
  "updatedAt": "2026-04-06T05:00:00.000Z"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Contact message not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/contact/:id/read

Mark a contact message as read.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | ContactMessage UUID |

### Response

**200 OK**:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "isRead": true,
  "message": "Message marked as read"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Contact message not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/contact/:id/reply

Mark a contact message as replied. Sets `replied_at` to the current server timestamp and automatically sets `is_read = true`.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | ContactMessage UUID |

**Body**: None required.

### Response

**200 OK**:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "isRead": true,
  "repliedAt": "2026-04-06T06:00:00.000Z",
  "message": "Message marked as replied"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Contact message not found",
  "error": "Not Found"
}
```

---

## DELETE /admin/contact/:id

Permanently delete a contact message.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | ContactMessage UUID |

### Response

**200 OK**:

```json
{
  "message": "Contact message deleted successfully"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Contact message not found",
  "error": "Not Found"
}
```
