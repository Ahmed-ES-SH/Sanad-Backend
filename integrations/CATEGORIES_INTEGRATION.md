# Categories Module Integration Guide

This document provides complete integration details for the Categories feature, including both public and admin endpoints.

---

## Table of Contents

- [Data Model](#data-model)
- [Public Endpoints](#public-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Usage Examples](#usage-examples)

---

## Data Model

### Category Schema

| Field         | Type   | Required       | Description                                                            |
| ------------- | ------ | -------------- | ---------------------------------------------------------------------- |
| `id`          | UUID   | Auto           | Unique identifier                                                      |
| `name`        | string | Yes            | Category name (max 100 chars)                                          |
| `slug`        | string | Auto-generated | URL-friendly slug (max 120 chars, lowercase letters, numbers, hyphens) |
| `description` | string | No             | Category description                                                   |
| `color`       | string | No             | Hex color code (e.g., #FF5733)                                         |
| `icon`        | string | No             | Icon name (max 50 chars)                                               |
| `order`       | number | No             | Display order (default: 0)                                             |
| `createdAt`   | Date   | Auto           | Creation timestamp                                                     |
| `updatedAt`   | Date   | Auto           | Last update timestamp                                                  |

---

## Public Endpoints

### 1. Get All Categories (Public)

Fetch all categories for public display.

**Endpoint:** `GET /api/categories`

**Authentication:** Not required

**Request Parameters:** None

**Example Request:**

```http
GET /api/categories
```

**Example Response:**

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Web Development",
    "slug": "web-development",
    "description": "Projects related to web development",
    "color": "#3498db",
    "icon": "code",
    "order": 1,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "name": "Mobile Apps",
    "slug": "mobile-apps",
    "description": "Mobile application projects",
    "color": "#2ecc71",
    "icon": "smartphone",
    "order": 2,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  }
]
```

---

### 2. Get Category By Slug (Public)

Fetch a single category by its slug.

**Endpoint:** `GET /api/categories/:slug`

**Authentication:** Not required

**Request Parameters:**

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `slug`    | string | Yes      | The category slug URL parameter |

**Example Request:**

```http
GET /api/categories/web-development
```

**Example Response:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Web Development",
  "slug": "web-development",
  "description": "Projects related to web development",
  "color": "#3498db",
  "icon": "code",
  "order": 1,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

**Error Responses:**

- `404 Not Found` - When category slug does not exist:

```json
{
  "statusCode": 404,
  "message": "Category not found",
  "error": "Not Found"
}
```

---

## Admin Endpoints

### Authentication Requirements

All admin endpoints require:

- **Valid JWT Token** in the Authorization header
- **Admin Role** (role: `admin`)

**Header Format:**

```http
Authorization: Bearer <your_jwt_token>
```

---

### 1. Create Category

Create a new category.

**Endpoint:** `POST /api/admin/categories`

**Authentication:** Required (JWT + Admin role)

**Request Body:**

| Field         | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| `name`        | string | **Yes**  | Category name (max 100 chars)                          |
| `slug`        | string | No       | Custom slug (auto-generated from name if not provided) |
| `description` | string | No       | Category description                                   |
| `color`       | string | No       | Hex color code (e.g., #FF5733)                         |
| `icon`        | string | No       | Icon name                                              |
| `order`       | number | No       | Display order (default: 0)                             |

**Example Request:**

```http
POST /api/admin/categories
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "name": "UI/UX Design",
  "slug": "ui-ux-design",
  "description": "User interface and experience design projects",
  "color": "#9b59b6",
  "icon": "palette",
  "order": 3
}
```

**Example Response (201 Created):**

```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "name": "UI/UX Design",
  "slug": "ui-ux-design",
  "description": "User interface and experience design projects",
  "color": "#9b59b6",
  "icon": "palette",
  "order": 3,
  "createdAt": "2026-04-12T14:20:00Z",
  "updatedAt": "2026-04-12T14:20:00Z"
}
```

**Error Responses:**

- `409 Conflict` - When category name or slug already exists:

```json
{
  "statusCode": 409,
  "message": "Category with this name already exists",
  "error": "Conflict"
}
```

- `401 Unauthorized` - When JWT is missing or invalid:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

- `403 Forbidden` - When user is not an admin:

```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
```

---

### 2. Get All Categories (Admin)

Fetch all categories with pagination and filters.

**Endpoint:** `GET /api/admin/categories`

**Authentication:** Required (JWT + Admin role)

**Request Query Parameters:**

| Parameter   | Type   | Required | Default | Description                         |
| ----------- | ------ | -------- | ------- | ----------------------------------- |
| `page`      | number | No       | 1       | Page number                         |
| `limit`     | number | No       | 10      | Items per page                      |
| `search`    | string | No       | -       | Search by name                      |
| `sortBy`    | string | No       | order   | Sort field (name, order, createdAt) |
| `sortOrder` | string | No       | ASC     | Sort order (ASC or DESC)            |

**Example Request:**

```http
GET /api/admin/categories?page=1&limit=10&search=web&sortBy=name&sortOrder=ASC
Authorization: Bearer <your_jwt_token>
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Web Development",
      "slug": "web-development",
      "description": "Projects related to web development",
      "color": "#3498db",
      "icon": "code",
      "order": 1,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### 3. Get Category By ID (Admin)

Fetch a single category by its UUID.

**Endpoint:** `GET /api/admin/categories/:id`

**Authentication:** Required (JWT + Admin role)

**Request Parameters:**

| Parameter | Type | Required | Description   |
| --------- | ---- | -------- | ------------- |
| `id`      | UUID | Yes      | Category UUID |

**Example Request:**

```http
GET /api/admin/categories/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <your_jwt_token>
```

**Example Response:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Web Development",
  "slug": "web-development",
  "description": "Projects related to web development",
  "color": "#3498db",
  "icon": "code",
  "order": 1,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

**Error Responses:**

- `404 Not Found` - When category ID does not exist:

```json
{
  "statusCode": 404,
  "message": "Category not found",
  "error": "Not Found"
}
```

---

### 4. Update Category

Update an existing category.

**Endpoint:** `PATCH /api/admin/categories/:id`

**Authentication:** Required (JWT + Admin role)

**Request Parameters:**

| Parameter | Type | Required | Description   |
| --------- | ---- | -------- | ------------- |
| `id`      | UUID | Yes      | Category UUID |

**Request Body:**

| Field         | Type   | Required | Description       |
| ------------- | ------ | -------- | ----------------- |
| `name`        | string | No       | New category name |
| `slug`        | string | No       | New slug          |
| `description` | string | No       | New description   |
| `color`       | string | No       | New hex color     |
| `icon`        | string | No       | New icon          |
| `order`       | number | No       | New order         |

**Example Request:**

```http
PATCH /api/admin/categories/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "name": "Web Design",
  "color": "#e74c3c"
}
```

**Example Response:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Web Design",
  "slug": "web-development",
  "description": "Projects related to web development",
  "color": "#e74c3c",
  "icon": "code",
  "order": 1,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-04-12T15:45:00Z"
}
```

**Error Responses:**

- `404 Not Found` - When category ID does not exist
- `409 Conflict` - When new name or slug already exists

---

### 5. Delete Category

Delete a category by its UUID.

**Endpoint:** `DELETE /api/admin/categories/:id`

**Authentication:** Required (JWT + Admin role)

**Request Parameters:**

| Parameter | Type | Required | Description   |
| --------- | ---- | -------- | ------------- |
| `id`      | UUID | Yes      | Category UUID |

**Example Request:**

```http
DELETE /api/admin/categories/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <your_jwt_token>
```

**Example Response (200 OK):**

```json
{
  "message": "Category deleted successfully"
}
```

**Note:** When deleting a category that is in use by projects, services, or articles, the system will set the `categoryId` of related entities to `null` instead of preventing the deletion.

**Error Responses:**

- `404 Not Found` - When category ID does not exist

---

### 6. Reorder Categories

Bulk reorder multiple categories in one request.

**Endpoint:** `POST /api/admin/categories/reorder`

**Authentication:** Required (JWT + Admin role)

**Request Body:**

| Field        | Type  | Required | Description               |
| ------------ | ----- | -------- | ------------------------- |
| `categories` | array | **Yes**  | Array of category objects |

Each category object:

| Field   | Type   | Required | Description     |
| ------- | ------ | -------- | --------------- |
| `id`    | UUID   | **Yes**  | Category UUID   |
| `order` | number | **Yes**  | New order value |

**Example Request:**

```http
POST /api/admin/categories/reorder
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "categories": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "order": 2
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "order": 1
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "order": 3
    }
  ]
}
```

**Example Response:**

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Mobile Apps",
    "slug": "mobile-apps",
    "color": "#2ecc71",
    "icon": "smartphone",
    "order": 2,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-04-12T16:00:00Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "name": "Web Development",
    "slug": "web-development",
    "color": "#3498db",
    "icon": "code",
    "order": 1,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-04-12T16:00:00Z"
  },
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "name": "UI/UX Design",
    "slug": "ui-ux-design",
    "color": "#9b59b6",
    "icon": "palette",
    "order": 3,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-04-12T16:00:00Z"
  }
]
```

---

## Usage Examples

### Frontend Integration Examples

#### React/Next.js - Fetch Public Categories

```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json();
}
```

#### React/Next.js - Fetch Single Category by Slug

```typescript
async function fetchCategoryBySlug(slug: string): Promise<Category> {
  const response = await fetch(`/api/categories/${slug}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Category not found');
    }
    throw new Error('Failed to fetch category');
  }
  return response.json();
}
```

#### React/Next.js - Admin - Fetch Categories with Pagination

```typescript
interface PaginatedCategoriesResponse {
  data: Category[];
  total: number;
  page: number;
  limit: number;
}

async function fetchAdminCategories(
  token: string,
  page = 1,
  limit = 10,
  search = '',
): Promise<PaginatedCategoriesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);

  const response = await fetch(`/api/admin/categories?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json();
}
```

#### React/Next.js - Admin - Create Category

```typescript
async function createCategory(
  token: string,
  categoryData: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
  },
): Promise<Category> {
  const response = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create category');
  }
  return response.json();
}
```

#### React/Next.js - Admin - Update Category

```typescript
async function updateCategory(
  token: string,
  id: string,
  categoryData: {
    name?: string;
    slug?: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
  },
): Promise<Category> {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update category');
  }
  return response.json();
}
```

#### React/Next.js - Admin - Delete Category

```typescript
async function deleteCategory(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete category');
  }
}
```

#### React/Next.js - Admin - Reorder Categories

```typescript
async function reorderCategories(
  token: string,
  categories: Array<{ id: string; order: number }>,
): Promise<Category[]> {
  const response = await fetch('/api/admin/categories/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ categories }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reorder categories');
  }
  return response.json();
}
```

---

## Error Codes Summary

| Status Code | Error Type   | Description                          |
| ----------- | ------------ | ------------------------------------ |
| `200`       | OK           | Request successful                   |
| `201`       | Created      | Resource created successfully        |
| `400`       | Bad Request  | Invalid request parameters           |
| `401`       | Unauthorized | Missing or invalid JWT token         |
| `403`       | Forbidden    | User lacks admin role                |
| `404`       | Not Found    | Category not found                   |
| `409`       | Conflict     | Category name or slug already exists |

---

## Notes

1. **Slug Generation**: If `slug` is not provided, it will be auto-generated from the `name` field using lowercase conversion and hyphen replacement.

2. **Color Format**: The `color` field must be a valid hex color code (e.g., `#FF5733`).

3. **Slug Format**: Custom slugs must contain only lowercase letters, numbers, and hyphens.

4. **Delete Behavior**: When deleting a category that is in use by projects, services, or articles, the system sets the related entities' `categoryId` to `null` instead of blocking the deletion.

5. **Public vs Admin**: The public endpoint returns categories sorted by `order` and `name`, while the admin endpoint supports full pagination and sorting options.

---

Last Updated: 2026-04-12
