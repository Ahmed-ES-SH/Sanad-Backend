# API Contracts: Services Module — Public Endpoints

**Feature**: 001-services-module
**Base URL**: `/services`
**Authentication**: None required (`@Public()` decorator)

---

## GET /services

List all published services sorted by display order.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| — | — | — | — | No parameters — returns all published services |

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
      "order": 1,
      "createdAt": "2026-04-06T05:00:00.000Z",
      "updatedAt": "2026-04-06T05:00:00.000Z"
    }
  ]
}
```

**Notes**: Only `isPublished = true` services are returned. Sorted by `order ASC`.

---

## GET /services/:slug

Get a single published service by its slug.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-friendly slug |

### Response

**200 OK**:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Web Development",
  "slug": "web-development",
  "shortDescription": "Full-stack web solutions",
  "longDescription": "Detailed description...",
  "iconUrl": "https://cdn.example.com/services/icons/abc.webp",
  "coverImageUrl": "https://cdn.example.com/services/covers/def.webp",
  "order": 1,
  "createdAt": "2026-04-06T05:00:00.000Z",
  "updatedAt": "2026-04-06T05:00:00.000Z"
}
```

**404 Not Found** (slug does not exist or service is unpublished):

```json
{
  "statusCode": 404,
  "message": "Service not found",
  "error": "Not Found"
}
```
