# API Contracts: Blog Module — Admin Endpoints

**Feature**: 005-blog-module
**Base URL**: `/admin/blog`
**Authentication**: Required — Bearer JWT, `admin` role

---

## GET /admin/blog

List all articles (published and unpublished) with pagination and sorting.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |
| `sortBy` | string | No | `createdAt` | Column to sort by (e.g., `createdAt`, `viewsCount`, `readTimeMinutes`) |
| `order` | string | No | `DESC` | Sort direction: `ASC` or `DESC` |

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
      "content": "<h1>Getting Started with NestJS</h1><p>NestJS is a progressive...</p>",
      "coverImageUrl": "https://cdn.example.com/blog/covers/nestjs.webp",
      "tags": ["NestJS", "TypeScript", "Backend"],
      "isPublished": true,
      "publishedAt": "2026-04-06T05:00:00.000Z",
      "readTimeMinutes": 5,
      "viewsCount": 142,
      "createdAt": "2026-04-06T04:00:00.000Z",
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

## POST /admin/blog

Create a new article.

### Request

**Body** (`application/json`):

```json
{
  "title": "Getting Started with NestJS",
  "content": "<h1>Getting Started with NestJS</h1><p>NestJS is a progressive Node.js framework...</p>",
  "excerpt": "A comprehensive guide to building scalable Node.js applications with NestJS",
  "coverImageUrl": "https://cdn.example.com/blog/covers/nestjs.webp",
  "tags": ["NestJS", "TypeScript", "Backend"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Max 300 chars |
| `content` | string | Yes | Not empty |
| `excerpt` | string | No | — |
| `coverImageUrl` | string | No | Valid URL format |
| `tags` | string[] | No | Array of strings |

### Response

**201 Created**:

```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "title": "Getting Started with NestJS",
  "slug": "getting-started-with-nestjs",
  "excerpt": "A comprehensive guide to building scalable Node.js applications with NestJS",
  "content": "<h1>Getting Started with NestJS</h1><p>NestJS is a progressive...</p>",
  "coverImageUrl": "https://cdn.example.com/blog/covers/nestjs.webp",
  "tags": ["NestJS", "TypeScript", "Backend"],
  "isPublished": false,
  "publishedAt": null,
  "readTimeMinutes": 5,
  "viewsCount": 0,
  "createdAt": "2026-04-06T04:00:00.000Z",
  "updatedAt": "2026-04-06T04:00:00.000Z"
}
```

**400 Bad Request** (validation failure):

```json
{
  "statusCode": 400,
  "message": ["title must be a string", "content should not be empty"],
  "error": "Bad Request"
}
```

---

## PATCH /admin/blog/:id

Update an existing article. If content changes, read time is recalculated.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Article UUID |

**Body** (`application/json`): Partial `CreateArticleDto` — any subset of fields.

```json
{
  "content": "<h1>Updated Content</h1><p>This is a much longer article with updated content...</p>",
  "tags": ["NestJS", "TypeScript", "Backend", "Tutorial"]
}
```

### Response

**200 OK**: Returns the updated article object (same shape as POST response) with recalculated `readTimeMinutes` if content changed.

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Article not found",
  "error": "Not Found"
}
```

---

## DELETE /admin/blog/:id

Delete an article and purge its cover image from cloud storage.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Article UUID |

### Response

**200 OK**:

```json
{
  "message": "Article deleted successfully"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Article not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/blog/:id/publish

Toggle the publish status of an article.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Article UUID |

### Response

**200 OK** (publishing):

```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "isPublished": true,
  "publishedAt": "2026-04-06T05:00:00.000Z",
  "message": "Article published successfully"
}
```

**200 OK** (unpublishing):

```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "isPublished": false,
  "publishedAt": "2026-04-06T05:00:00.000Z",
  "message": "Article unpublished successfully"
}
```

**400 Bad Request** (missing excerpt):

```json
{
  "statusCode": 400,
  "message": "Cannot publish: article must have an excerpt",
  "error": "Bad Request"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Article not found",
  "error": "Not Found"
}
```
