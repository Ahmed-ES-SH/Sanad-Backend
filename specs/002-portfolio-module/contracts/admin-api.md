# API Contracts: Portfolio Module — Admin Endpoints

**Feature**: 002-portfolio-module
**Base URL**: `/admin/portfolio`
**Authentication**: Required — Bearer JWT, `admin` role

---

## GET /admin/portfolio

List all projects (published and unpublished) with pagination and sorting.

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
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "E-Commerce Platform",
      "slug": "e-commerce-platform",
      "shortDescription": "Full-stack e-commerce solution",
      "longDescription": "Detailed description...",
      "coverImageUrl": "https://cdn.example.com/portfolio/covers/abc.webp",
      "images": [
        "https://cdn.example.com/portfolio/gallery/img1.webp",
        "https://cdn.example.com/portfolio/gallery/img2.webp"
      ],
      "techStack": ["React", "NestJS", "PostgreSQL"],
      "category": "Web App",
      "liveUrl": "https://example.com",
      "repoUrl": "https://github.com/example/project",
      "isPublished": true,
      "isFeatured": false,
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

## POST /admin/portfolio

Create a new project.

### Request

**Body** (`application/json`):

```json
{
  "title": "E-Commerce Platform",
  "shortDescription": "Full-stack e-commerce solution",
  "longDescription": "Optional detailed description...",
  "coverImageUrl": "https://cdn.example.com/portfolio/covers/abc.webp",
  "images": ["https://cdn.example.com/portfolio/gallery/img1.webp"],
  "techStack": ["React", "NestJS", "PostgreSQL"],
  "category": "Web App",
  "liveUrl": "https://example.com",
  "repoUrl": "https://github.com/example/project"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Max 200 chars |
| `shortDescription` | string | Yes | Not empty |
| `longDescription` | string | No | — |
| `coverImageUrl` | string | No | Valid URL format |
| `images` | string[] | No | Array of strings |
| `techStack` | string[] | No | Array of strings |
| `category` | string | No | Max 100 chars |
| `liveUrl` | string | No | Valid URL format |
| `repoUrl` | string | No | Valid URL format |

### Response

**201 Created**:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "E-Commerce Platform",
  "slug": "e-commerce-platform",
  "shortDescription": "Full-stack e-commerce solution",
  "longDescription": "Optional detailed description...",
  "coverImageUrl": "https://cdn.example.com/portfolio/covers/abc.webp",
  "images": ["https://cdn.example.com/portfolio/gallery/img1.webp"],
  "techStack": ["React", "NestJS", "PostgreSQL"],
  "category": "Web App",
  "liveUrl": "https://example.com",
  "repoUrl": "https://github.com/example/project",
  "isPublished": false,
  "isFeatured": false,
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

## PATCH /admin/portfolio/:id

Update an existing project.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Project UUID |

**Body** (`application/json`): Partial `CreateProjectDto` — any subset of fields.

```json
{
  "title": "Updated Title",
  "techStack": ["React", "NestJS", "PostgreSQL", "Redis"]
}
```

### Response

**200 OK**: Returns the updated project object (same shape as POST response).

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```

---

## DELETE /admin/portfolio/:id

Delete a project and purge all associated images (cover + gallery) from cloud storage.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Project UUID |

### Response

**200 OK**:

```json
{
  "message": "Project deleted successfully"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/portfolio/:id/publish

Toggle the publish status of a project.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Project UUID |

### Response

**200 OK**:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "isPublished": true,
  "message": "Project published successfully"
}
```

**400 Bad Request** (missing cover image):

```json
{
  "statusCode": 400,
  "message": "Cannot publish: project must have a cover image",
  "error": "Bad Request"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/portfolio/:id/feature

Toggle the featured status of a project.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Project UUID |

### Response

**200 OK**:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "isFeatured": true,
  "message": "Project featured successfully"
}
```

**400 Bad Request** (featured limit reached):

```json
{
  "statusCode": 400,
  "message": "Cannot feature: maximum of 6 featured projects reached",
  "error": "Bad Request"
}
```

**404 Not Found**:

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```

---

## PATCH /admin/portfolio/reorder

Update the display order of multiple projects in a single request.

### Request

**Body** (`application/json`):

```json
{
  "items": [
    { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "order": 0 },
    { "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "order": 1 },
    { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "order": 2 }
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
  "message": "Projects reordered successfully"
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
