# API Contracts: Media Storage Module — Admin Endpoints

**Feature**: 010-media-storage-module
**Base URL**: `/admin/media`
**Authentication**: Required — Bearer JWT, `admin` role

---

## POST /admin/media/upload

Upload a file to cloud storage.

### Request

**Content-Type**: `multipart/form-data`

**Form Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The file to upload (max 5MB) |
| `entity` | string | Yes | Entity type: `services`, `projects`, `articles`, `users` |
| `subfolder` | string | Yes | Subfolder within entity directory (e.g., `covers`, `icons`, `avatars`, `gallery`) |

**Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`

### Response

**201 Created**:

```json
{
  "url": "https://bucket.s3.us-west-004.backblazeb2.com/projects/covers/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg",
  "key": "projects/covers/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg",
  "filename": "f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg"
}
```

**400 Bad Request** (validation failure — invalid MIME type):

```json
{
  "statusCode": 400,
  "message": "Unsupported file type. Allowed: image/jpeg, image/png, image/webp, image/gif, application/pdf",
  "error": "Bad Request"
}
```

**400 Bad Request** (file too large):

```json
{
  "statusCode": 400,
  "message": "File too large. Maximum size is 5MB",
  "error": "Bad Request"
}
```

**400 Bad Request** (empty file):

```json
{
  "statusCode": 400,
  "message": "File is empty",
  "error": "Bad Request"
}
```

**400 Bad Request** (invalid entity):

```json
{
  "statusCode": 400,
  "message": "Invalid entity. Allowed: services, projects, articles, users",
  "error": "Bad Request"
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

**502 Bad Gateway** (cloud storage failure):

```json
{
  "statusCode": 502,
  "message": "Cloud storage temporarily unavailable. Please try again.",
  "error": "Bad Gateway"
}
```

---

## DELETE /admin/media

Delete a file from cloud storage.

### Request

**Body** (`application/json`):

```json
{
  "fileUrlOrKey": "https://bucket.s3.us-west-004.backblazeb2.com/projects/covers/f47ac10b.jpeg"
}
```

or:

```json
{
  "fileUrlOrKey": "projects/covers/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpeg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileUrlOrKey` | string | Yes | Full CDN URL or storage key of the file |

### Response

**200 OK**:

```json
{
  "message": "File deleted successfully"
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

**Notes**:
- Deletion is idempotent — returns 200 even if the file does not exist.
- If a full URL is provided, the service extracts the storage key by stripping the `B2_PUBLIC_URL` prefix.

---

## Programmatic Service API (No HTTP — internal use)

Other modules inject `MediaStorageService` and call these methods directly:

```typescript
// Upload a file programmatically
uploadFile(buffer: Buffer, originalname: string, entity: string, subfolder: string): Promise<UploadResponseDto>

// Delete a file programmatically
deleteFile(fileUrlOrKey: string): Promise<void>
```
