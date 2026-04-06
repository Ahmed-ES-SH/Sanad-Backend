# API Contracts: Portfolio Module — Public Endpoints

**Feature**: 002-portfolio-module
**Base URL**: `/portfolio`
**Authentication**: None required (`@Public()` decorator)

---

## GET /portfolio

List all published projects sorted by display order, with optional filters.

### Request

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `category` | string | No | — | Filter by category (case-insensitive) |
| `techStack` | string | No | — | Filter by tech stack (comma-separated, matches ANY) |
| `featured` | boolean | No | — | Filter featured projects only (`true`) |

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
      "isFeatured": true,
      "order": 1,
      "createdAt": "2026-04-06T05:00:00.000Z",
      "updatedAt": "2026-04-06T05:00:00.000Z"
    }
  ]
}
```

**Notes**: Only `isPublished = true` projects are returned. Sorted by `order ASC`. `isPublished` field is omitted from public responses (always true). When tech stack filter has multiple values, projects matching ANY of the specified technologies are returned.

---

## GET /portfolio/:slug

Get a single published project by its slug.

### Request

**Path Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-friendly slug |

### Response

**200 OK**:

```json
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
  "isFeatured": true,
  "order": 1,
  "createdAt": "2026-04-06T05:00:00.000Z",
  "updatedAt": "2026-04-06T05:00:00.000Z"
}
```

**404 Not Found** (slug does not exist or project is unpublished):

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```
