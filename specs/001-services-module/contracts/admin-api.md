# API Contracts: Services Module — Admin Endpoints

**Feature**: 001-services-module
**Base URL**: `/admin/services`
**Authentication**: Required — Bearer JWT, `admin` role

---

## GET /admin/services

List all services (published and unpublished) with pagination and sorting.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |
| `sortBy` | string | No | `createdAt` | Column to sort by |
| `order` | string | No | `DESC` | Sort direction: `ASC` or `DESC` |

### Response

**200 OK**:

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "title": "Web Development",
      "slug": "web-development",
      "shortDescription": "Full-stack web solutions",
      "longDescription": "Detailed description...",
      "iconUrl": "https://cdn.example.com/services/icons/abc.webp",
      "coverImageUrl": "https://cdn.example.com/services/covers/def.webp",
      "isPublished": true,
      "order": 1,
      "createdAt": "2026-04-06T05:00:00.000Z",
      "updatedAt": "2026-04-06T05:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
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

## POST /admin/services

Create a new service.

### Request

**Body** (`application/json`):

```json
{
  "title": "Web Development",
  "shortDescription": "Full-stack web solutions for modern businesses",
  "longDescription": "Optional detailed description...",
  "iconUrl": "https://cdn.example.com/services/icons/abc.webp",
  "coverImageUrl": "https://cdn.example.com/services/covers/def.webp"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Max 150 chars |
| `shortDescription` | string | Yes | Not empty |
| `longDescription` | string | No | — |
| `iconUrl` | string | No | Valid URL format |
| `coverImageUrl` | string | No | Valid URL format |

### Response

**201 Created**:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Web Development",
  "slug": "web-development",
  "shortDescription": "Full-stack web solutions for modern businesses",
  "longDescription": "Optional detailed description...",
  "iconUrl": "https://cdn.example.com/services/icons/abc.webp",
  "coverImageUrl": "https://cdn.example.com/services/covers/def.webp",
  "isPublished": false,
  "order": 0,
  "createdAt": "2026-04-06T05:00:00.000Z",
  "updatedAt": "2026-04-06T05:00:00.000Z"
}
```

**400 Bad Request** (validation failure):

```json
{
  "statusCode": 400,
  "message": ["title must be a string", "shortDescription should not be empty"],
  "error": "Bad Request"
}
```

---

## PATCH /admin/services/:id

Update an existing service.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Service UUID |

**Body** (`application/json`): Partial `CreateServiceDto` — any subset of fields.

```json
{
  "title": "Updated Title",
  "longDescription": "Updated detailed description"
}
```

### Response

**200 OK**: Returns the updated service object (same shape as POST response).

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Service not found",
  "error": "Not Found"
}
```

---

## DELETE /admin/services/:id

Delete a service and purge associated images from cloud storage.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Service UUID |

### Response

**200 OK**:

```json
{
  "message": "Service deleted successfully"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Service not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/services/:id/publish

Toggle the publish status of a service.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Service UUID |

### Response

**200 OK**:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "isPublished": true,
  "message": "Service published successfully"
}
```

**400 Bad Request** (missing title or shortDescription):

```json
{
  "statusCode": 400,
  "message": "Cannot publish: service must have a title and short description",
  "error": "Bad Request"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Service not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/services/reorder

Update the display order of multiple services in a single request.

### Request

**Body** (`application/json`):

```json
{
  "items": [
    { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "order": 0 },
    { "id": "a12bc34d-56ef-7890-abcd-ef1234567890", "order": 1 },
    { "id": "b98dc76f-54ba-3210-fedc-ba0987654321", "order": 2 }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `items` | array | Yes | Non-empty array |
| `items[].id` | uuid | Yes | Valid UUID |
| `items[].order` | integer | Yes | >= 0 |

### Response

**200 OK**:

```json
{
  "message": "Services reordered successfully"
}
```

**400 Bad Request** (invalid payload):

```json
{
  "statusCode": 400,
  "message": ["items must be an array", "items.0.id must be a UUID"],
  "error": "Bad Request"
}
```
