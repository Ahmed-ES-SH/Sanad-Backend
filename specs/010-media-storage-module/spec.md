# Feature Specification: Media Storage Module

**Feature Branch**: `010-media-storage-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Media Storage Module - Centralized file upload to cloud storage with MIME validation, size limits, UUID naming, entity-organized buckets, and CDN URL generation"
**PRD Reference**: §5.8 Media / Storage Module, §7 File Storage Strategy, §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Uploads a File (Priority: P1)

An administrator wants to upload an image file (e.g., a project cover, service icon, or user avatar) through a centralized upload endpoint. The system validates the file, generates a UUID-based filename, uploads to cloud storage in the correct entity folder, and returns the public CDN URL.

**Why this priority**: File upload is the core function — every other module (services, projects, articles, users) depends on this capability.

**Independent Test**: Can be tested by uploading a valid image file and verifying it is stored in the correct cloud storage path with a UUID filename, and a public URL is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they upload a valid JPEG image (2MB) for entity "projects" and subfolder "covers", **Then** the file is stored at `projects/covers/{uuid}.jpeg` in cloud storage and the CDN URL is returned.
2. **Given** an authenticated admin, **When** they upload a valid PNG image for entity "services" and subfolder "icons", **Then** the file is stored at `services/icons/{uuid}.png`.
3. **Given** an authenticated admin, **When** they upload a valid WebP image for entity "articles" and subfolder "covers", **Then** the file is stored at `articles/covers/{uuid}.webp`.
4. **Given** an authenticated admin, **When** they upload a valid image for entity "users" and subfolder "avatars", **Then** the file is stored at `users/avatars/{uuid}.{ext}`.
5. **Given** a non-authenticated user, **When** they attempt to upload a file, **Then** the request is rejected with an authorization error.

---

### User Story 2 - System Validates File Before Upload (Priority: P1)

The system enforces strict validation rules before accepting any upload: file size must not exceed the limit, MIME type must be allowed, and the file must not be corrupted.

**Why this priority**: Validation is a security-critical gate — without it, oversized or malicious files could be uploaded.

**Independent Test**: Can be tested by submitting files that violate each constraint and verifying rejection with appropriate error messages.

**Acceptance Scenarios**:

1. **Given** a file larger than 5MB, **When** the admin attempts to upload it, **Then** the request is rejected with a "file too large" error.
2. **Given** a file with MIME type `application/exe`, **When** the admin attempts to upload it, **Then** the request is rejected with an "unsupported file type" error.
3. **Given** a file with MIME type `image/jpeg`, **When** the admin uploads it, **Then** the upload is accepted.
4. **Given** a file with MIME type `image/png`, **When** the admin uploads it, **Then** the upload is accepted.
5. **Given** a file with MIME type `image/webp`, **When** the admin uploads it, **Then** the upload is accepted.
6. **Given** a file with MIME type `image/gif`, **When** the admin uploads it, **Then** the upload is accepted.
7. **Given** a file with MIME type `application/pdf`, **When** the admin uploads it, **Then** the upload is accepted.
8. **Given** an empty file (0 bytes), **When** the admin attempts to upload it, **Then** the request is rejected.

---

### User Story 3 - Admin Deletes a File (Priority: P2)

An administrator wants to remove a previously uploaded file from cloud storage, either by providing the file URL or the storage key. This is used when entities are deleted or images are replaced.

**Why this priority**: File deletion prevents storage bloat and orphaned assets, but is secondary to upload capability.

**Independent Test**: Can be tested by uploading a file, deleting it by URL or key, and verifying it no longer exists in cloud storage.

**Acceptance Scenarios**:

1. **Given** a file exists in cloud storage, **When** the admin deletes it by URL, **Then** the file is removed from cloud storage.
2. **Given** a file exists in cloud storage, **When** the admin deletes it by file key, **Then** the file is removed from cloud storage.
3. **Given** a file URL/key that does not exist, **When** the admin attempts to delete it, **Then** the operation completes without error (idempotent).
4. **Given** a non-authenticated user, **When** they attempt to delete a file, **Then** the request is rejected.

---

### User Story 4 - System Generates UUID Filenames (Priority: P1)

The system replaces original filenames with UUID-based names to prevent conflicts and hide original file names for privacy/security.

**Why this priority**: UUID naming is integral to the upload flow — it runs on every upload.

**Independent Test**: Can be tested by uploading two files with the same original name and verifying they receive unique UUID-based filenames.

**Acceptance Scenarios**:

1. **Given** a file named "photo.jpg" is uploaded, **When** the system processes it, **Then** it is stored with a UUID-based name like `f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg`.
2. **Given** two files with the same original name "cover.png" are uploaded, **When** both are processed, **Then** each receives a unique UUID filename.

---

### Edge Cases

- What happens when cloud storage is temporarily unavailable? The system MUST return a meaningful error and MUST NOT create an orphan database record linking to a non-existent file.
- What happens when an upload is interrupted mid-transfer? The system MUST NOT leave partial files in cloud storage.
- What happens when the same file is uploaded multiple times? Each upload MUST create a new UUID-named copy (no deduplication).
- What happens when a file has a spoofed MIME type (e.g., an .exe renamed to .jpg)? The system MUST validate MIME type from file content headers, not just file extension.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a centralized, admin-only endpoint for file uploads accepting multipart/form-data.
- **FR-002**: System MUST validate uploaded files against allowed MIME types: image/jpeg, image/png, image/webp, image/gif, application/pdf.
- **FR-003**: System MUST enforce a maximum file size of 5MB per file.
- **FR-004**: System MUST only accept image MIME types for entity cover images and avatars.
- **FR-005**: System MUST replace original filenames with UUID-based names preserving the original extension.
- **FR-006**: System MUST organize files in cloud storage by entity type and subfolder (e.g., `services/icons/`, `projects/covers/`, `projects/gallery/`, `articles/covers/`, `users/avatars/`).
- **FR-007**: System MUST return the public CDN URL of the uploaded file upon successful upload.
- **FR-008**: System MUST buffer files in memory during upload (no local disk writes).
- **FR-009**: System MUST allow authenticated admins to delete a file from cloud storage by URL or file key.
- **FR-010**: System MUST handle file deletion idempotently (no error if file already deleted).
- **FR-011**: System MUST prevent orphan records: if the cloud upload fails, no database reference to the file is created.
- **FR-012**: System MUST reject all upload/delete operations from unauthenticated or unauthorized users.
- **FR-013**: System MUST reject empty (0-byte) file uploads.

### Key Entities

- No new persistent entity is introduced. This module is a service layer that other modules consume for file operations. File metadata (URLs) is stored within the consuming entity (e.g., `cover_image_url` on projects).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: File uploads up to 5MB complete in under 10 seconds including cloud storage round-trip.
- **SC-002**: 100% of files exceeding the size limit are rejected before any cloud transfer begins.
- **SC-003**: 100% of disallowed MIME types are rejected before any cloud transfer begins.
- **SC-004**: UUID filenames eliminate 100% of naming conflicts (zero overwrites in cloud storage).
- **SC-005**: File deletion completes in under 5 seconds.
- **SC-006**: Zero orphan files remain in cloud storage after entity deletion across all modules.

## Assumptions

- Authentication and authorization are already implemented.
- Cloud storage provider is Backblaze B2; provider-specific configuration is an implementation concern.
- Files are buffered in memory (not streamed to disk); this is acceptable given the 5MB max file size.
- CDN URL generation is handled by the cloud storage provider's public URL scheme.
- This module is consumed by all other modules (services, projects, articles, users) for their file operations.
