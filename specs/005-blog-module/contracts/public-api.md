# API Contracts: Blog Module — Public Endpoints

**Feature**: 005-blog-module
**Base URL**: `/blog`
**Authentication**: None required (`@Public()` decorator)

---

## GET /blog

List all published articles with pagination and optional tag filtering.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |
| `tag` | string | No | — | Filter by tag (case-insensitive exact match) |

### Response

**200 OK**:

```json
{
  "data": [
    {
      "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
      "title": "Getting Started with NestJS",
      "slug": "getting-started-with-nestjs",
      "excerpt": "A comprehensive guide to building scalable Node.js applications with NestJS",
      "coverImageUrl": "https://cdn.example.com/blog/covers/nestjs.webp",
      "tags": ["NestJS", "TypeScript", "Backend"],
      "publishedAt": "2026-04-06T05:00:00.000Z",
      "readTimeMinutes": 5,
      "viewsCount": 142,
      "createdAt": "2026-04-06T04:00:00.000Z"
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

**Notes**: Only `isPublished = true` articles are returned. Sorted by `publishedAt DESC` by default. The `content` field is excluded from list responses for performance.

---

## GET /blog/:slug

Get a single published article by its slug. Atomically increments the view count.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-friendly slug |

### Response

**200 OK**:

```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "title": "Getting Started with NestJS",
  "slug": "getting-started-with-nestjs",
  "excerpt": "A comprehensive guide to building scalable Node.js applications with NestJS",
  "content": "<h1>Getting Started with NestJS</h1><p>NestJS is a progressive...</p>",
  "coverImageUrl": "https://cdn.example.com/blog/covers/nestjs.webp",
  "tags": ["NestJS", "TypeScript", "Backend"],
  "publishedAt": "2026-04-06T05:00:00.000Z",
  "readTimeMinutes": 5,
  "viewsCount": 143,
  "createdAt": "2026-04-06T04:00:00.000Z",
  "updatedAt": "2026-04-06T05:00:00.000Z"
}
```

**404 Not Found** (slug does not exist or article is unpublished):

```json
{
  "statusCode": 404,
  "message": "Article not found",
  "error": "Not Found"
}
```

**Notes**: The `viewsCount` in the response reflects the value AFTER the increment.
