# Research: Media Storage Module

**Feature**: 010-media-storage-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Cloud Storage Provider SDK

- **Decision**: Use the official AWS S3 SDK (`@aws-sdk/client-s3`) to connect to Backblaze B2, since B2 is S3-compatible. Configure with B2 endpoint, key ID, and application key.
- **Rationale**: PRD §7 specifies Backblaze B2 as the cloud storage provider. B2 exposes an S3-compatible API, so the AWS S3 SDK works directly with the correct endpoint configuration. This avoids a B2-specific library and gives access to the mature S3 ecosystem.
- **Alternatives considered**: Backblaze native B2 SDK (`backblaze-b2`, rejected — less mature, fewer examples, S3-compat is the recommended approach), `minio` client (rejected — S3 SDK is the standard), manual HTTP requests (rejected — no value over SDK).

### 2. File Upload Strategy (Memory Buffer)

- **Decision**: Use NestJS `FileInterceptor` from `@nestjs/platform-express` with Multer's `memoryStorage` engine. Files are buffered in memory as `Buffer` objects, then uploaded to B2 via the S3 SDK `PutObject` command.
- **Rationale**: FR-008 mandates memory buffering (no disk writes). Multer's `memoryStorage` is the standard NestJS approach. With a 5MB max file size, memory usage is bounded and safe for a server with typical RAM. The `@UploadedFile()` decorator gives direct access to the buffer.
- **Alternatives considered**: Disk-based multer storage (rejected — FR-008 prohibits disk writes), streaming directly to B2 (rejected — multer doesn't support streaming out of the box, added complexity for negligible benefit at 5MB).

### 3. MIME Type Validation

- **Decision**: Validate MIME type using a custom NestJS `ParseFilePipe` with `FileTypeValidator` for allowed types. Validate both the `mimetype` field from Multer (based on file headers) and optionally the file extension for consistency.
- **Rationale**: FR-002 specifies allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`. NestJS's built-in `ParseFilePipe` provides a clean, declarative validation pipeline. The `mimetype` from Multer is derived from file content magic bytes (via `busboy`), not just the extension, addressing the spoofed MIME edge case.
- **Alternatives considered**: External `file-type` npm package for deep magic-byte analysis (rejected — Multer already does header-based detection, sufficient for this use case), regex on extension only (rejected — trivially spoofable).

### 4. File Size Enforcement

- **Decision**: Enforce max 5MB at two levels: (1) Multer `limits.fileSize` option in the interceptor configuration, and (2) `MaxFileSizeValidator` in the `ParseFilePipe`. Multer aborts the upload stream if exceeded; the pipe validator provides a clean error message.
- **Rationale**: FR-003 mandates 5MB max. Double enforcement is defense-in-depth — Multer stops reading the stream early (saves bandwidth), and the pipe provides a user-friendly validation error.
- **Alternatives considered**: Only Multer limit (rejected — Multer error messages are raw and not user-friendly), only pipe limit (rejected — entire file is read into memory before validation).

### 5. UUID Filename Generation

- **Decision**: Generate a v4 UUID for each uploaded file using Node.js built-in `crypto.randomUUID()`. Append the original file extension (extracted from `originalname`). Final key format: `{entity}/{subfolder}/{uuid}.{ext}`.
- **Rationale**: FR-005 requires UUID-based names. `crypto.randomUUID()` is built-in since Node.js 19+ (no external dependency). Extension preservation maintains content-type hints for browsers/CDNs.
- **Alternatives considered**: `uuid` npm package (rejected — unnecessary since Node.js has built-in), timestamp-based names (rejected — potential conflicts under load), hash-based names (rejected — spec says no deduplication, each upload is unique).

### 6. Storage Key Structure

- **Decision**: Files are stored with the key pattern `{entity}/{subfolder}/{uuid}.{ext}`. The `entity` and `subfolder` are provided as form fields in the upload request. Allowed entity values are validated against a whitelist: `services`, `projects`, `articles`, `users`.
- **Rationale**: FR-006 specifies entity-based organization. A whitelist prevents arbitrary directory creation in the bucket. Subfolders (`icons`, `covers`, `gallery`, `avatars`) are freeform to allow future flexibility without code changes.
- **Alternatives considered**: Single flat directory (rejected — unmanageable at scale), database-tracked file records (rejected — spec says no new entity, URLs stored on consuming entities), nested validation for subfolders (rejected — over-constrains future use).

### 7. CDN URL Generation

- **Decision**: Construct the public URL by combining the B2 bucket's public base URL with the file key: `https://{bucket}.s3.{region}.backblazeb2.com/{key}`. Store the base URL in the `B2_PUBLIC_URL` environment variable.
- **Rationale**: FR-007 requires returning a CDN/public URL. Backblaze B2 provides public URLs for public buckets. Storing the base URL in env vars allows easy switching between B2 regions or custom CDN domains.
- **Alternatives considered**: Signed URLs (rejected — files should be publicly accessible as assets), Cloudflare CDN proxy (deferred — can be added later by changing `B2_PUBLIC_URL` to a Cloudflare domain).

### 8. Delete Strategy

- **Decision**: Accept either a full CDN URL or a storage key. If a URL is provided, extract the key by removing the `B2_PUBLIC_URL` prefix. Use S3 `DeleteObject` command. Return success regardless of whether the file existed (idempotent).
- **Rationale**: FR-009 and FR-010 require deletion by URL or key, with idempotent behavior. S3's `DeleteObject` is naturally idempotent — it returns success even if the key doesn't exist.
- **Alternatives considered**: Check existence before delete (rejected — adds a round-trip, no benefit since delete is idempotent), soft-delete with retention (rejected — spec says remove from storage).

### 9. Module as Shared Service

- **Decision**: Export `MediaStorageService` from `MediaStorageModule` so other modules can inject it for programmatic uploads/deletes (e.g., services module deleting images when a service is deleted). Also expose an HTTP endpoint for direct admin uploads.
- **Rationale**: The spec says "This module is consumed by all other modules for their file operations." Exporting the service enables both HTTP-based uploads (admin endpoint) and programmatic consumption (other services injecting `MediaStorageService`).
- **Alternatives considered**: HTTP-only interface (rejected — other modules would need HTTP calls to the same server, wasteful), event-based (rejected — overcomplicated for synchronous file operations).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
