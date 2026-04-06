# Feature Specification: Services Module

**Feature Branch**: `001-services-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Services Module - CRUD operations for tech services with publish/unpublish, reorder, image uploads to Backblaze B2, and auto-generated slugs"
**PRD Reference**: §5.1 Services Module, §4 Database Schema (`services`), §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates a New Service (Priority: P1)

An administrator wants to add a new tech service (e.g., "Web Development") to the portfolio site. They provide a title and short description, and the system creates the service with an auto-generated slug. The service starts as unpublished so the admin can review it before making it visible to the public.

**Why this priority**: Creating services is the foundational action — nothing else works without the ability to add services to the system.

**Independent Test**: Can be fully tested by submitting a create request with title and short description, then verifying the service exists in the system with a correct auto-generated slug and `is_published = false`.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they submit a service with title "Web Development" and short_description "Full-stack web solutions", **Then** the service is created with slug "web-development", `is_published = false`, and timestamps are set.
2. **Given** an authenticated admin, **When** they submit a service with a title that matches an existing slug, **Then** the system appends a numeric suffix (e.g., "web-development-2") to ensure uniqueness.
3. **Given** an authenticated admin, **When** they submit a service without a title, **Then** the request is rejected with a validation error.
4. **Given** an authenticated admin, **When** they submit a service without a short_description, **Then** the request is rejected with a validation error.
5. **Given** a non-authenticated user, **When** they attempt to create a service, **Then** the request is rejected with an authorization error.

---

### User Story 2 - Admin Manages Service Content (Priority: P1)

An administrator wants to update an existing service's details (title, descriptions, images) or remove a service that is no longer offered. They also need to upload icon and cover images for visual presentation on the website.

**Why this priority**: Equally critical to creation — admins must be able to maintain and curate service content.

**Independent Test**: Can be tested by updating a service's fields and verifying changes persist, uploading images and verifying URLs are stored, and deleting a service and confirming it and its images are removed.

**Acceptance Scenarios**:

1. **Given** an existing service, **When** the admin updates the title, **Then** the slug is regenerated and the title is updated.
2. **Given** an existing service, **When** the admin updates only the long_description, **Then** only that field changes; other fields remain unchanged.
3. **Given** an existing service with uploaded images, **When** the admin deletes the service, **Then** the service record is removed and associated images are purged from cloud storage.
4. **Given** an existing service, **When** the admin uploads an icon image, **Then** the icon_url is set to the cloud storage URL.
5. **Given** an existing service, **When** the admin uploads a cover image, **Then** the cover_image_url is set to the cloud storage URL.
6. **Given** a non-existent service ID, **When** the admin attempts to update or delete, **Then** a "not found" error is returned.

---

### User Story 3 - Admin Publishes and Reorders Services (Priority: P2)

An administrator wants to control which services are visible to the public and in what order they appear. They can publish/unpublish individual services and rearrange the display order.

**Why this priority**: Publishing controls the public-facing experience, but services must exist first (US1/US2).

**Independent Test**: Can be tested by toggling a service's publish status and verifying public visibility changes, and by reordering services and confirming the new order persists.

**Acceptance Scenarios**:

1. **Given** an unpublished service with title and short_description, **When** the admin publishes it, **Then** `is_published` becomes true and it appears on the public listing.
2. **Given** a published service, **When** the admin unpublishes it, **Then** `is_published` becomes false and it no longer appears on the public listing.
3. **Given** a service missing a title or short_description, **When** the admin attempts to publish, **Then** the request is rejected because minimum publish requirements are not met.
4. **Given** multiple services, **When** the admin submits a reorder request with new positions, **Then** the `order` field for each service is updated to reflect the new arrangement.

---

### User Story 4 - Visitor Browses Published Services (Priority: P2)

A website visitor wants to see what tech services are offered. They can view a list of all published services or view detailed information about a specific service.

**Why this priority**: This is the public-facing value delivery — visitors see what the portfolio offers.

**Independent Test**: Can be tested by requesting the public services list and verifying only published services appear in the correct order, and by requesting a single service by slug and verifying all public details are returned.

**Acceptance Scenarios**:

1. **Given** multiple services (some published, some not), **When** a visitor requests the services list, **Then** only published services are returned, sorted by the `order` field.
2. **Given** a published service with slug "web-development", **When** a visitor requests it by slug, **Then** all service details (title, descriptions, icon, cover image) are returned.
3. **Given** a slug that does not exist, **When** a visitor requests it, **Then** a "not found" error is returned.
4. **Given** an unpublished service, **When** a visitor requests it by slug, **Then** a "not found" error is returned (unpublished services are invisible to the public).

---

### User Story 5 - Admin Views All Services in Dashboard (Priority: P3)

An administrator wants to see a complete list of all services (both published and unpublished) for management purposes, with pagination and sorting support.

**Why this priority**: Dashboard listing is important for management but less critical than CRUD and public visibility.

**Independent Test**: Can be tested by requesting the admin services list with various pagination and sorting parameters and verifying correct results.

**Acceptance Scenarios**:

1. **Given** 15 services exist, **When** the admin requests page 1 with limit 10, **Then** 10 services are returned with pagination metadata indicating 15 total.
2. **Given** services exist, **When** the admin requests sorted by `created_at` descending, **Then** services are returned in the correct order.
3. **Given** both published and unpublished services, **When** the admin lists services, **Then** all services are returned regardless of publish status.

---

### Edge Cases

- What happens when a service is deleted while it is still published? The service and its images MUST be removed; the public listing immediately stops showing it.
- What happens when two services are created with identical titles simultaneously? The slug deduplication mechanism MUST handle concurrent creation gracefully.
- What happens when an image upload fails mid-process? No orphan database records should be created; the operation MUST be atomic.
- What happens when reorder is submitted with missing or duplicate positions? The system MUST validate the reorder payload and reject invalid configurations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated admins to create a service with at minimum a title and short_description.
- **FR-002**: System MUST auto-generate a URL-friendly slug from the service title upon creation.
- **FR-003**: System MUST ensure slug uniqueness by appending a numeric suffix when a duplicate is detected.
- **FR-004**: System MUST allow admins to update any field of an existing service (title, short_description, long_description, icon, cover image).
- **FR-005**: System MUST allow admins to delete a service, including purging all associated images from cloud storage.
- **FR-006**: System MUST allow admins to toggle the published status of a service.
- **FR-007**: System MUST prevent publishing a service that lacks a title or short_description.
- **FR-008**: System MUST allow admins to reorder services by updating the `order` field for multiple services in a single request.
- **FR-009**: System MUST allow admins to upload an icon image and a cover image per service, stored in cloud storage.
- **FR-010**: System MUST expose a public endpoint that returns only published services, sorted by display order.
- **FR-011**: System MUST expose a public endpoint that returns a single published service by its slug.
- **FR-012**: System MUST return a "not found" response when a public user requests an unpublished or non-existent service by slug.
- **FR-013**: System MUST support pagination (`page`, `limit`) and sorting (`sortBy`, `order`) on admin listing endpoints.
- **FR-014**: System MUST reject all admin operations from unauthenticated or unauthorized users.

### Key Entities

- **Service**: Represents a tech service offering. Key attributes: title, slug (unique, auto-generated), short description, long description, icon image, cover image, published status, display order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a new service in under 30 seconds including image upload.
- **SC-002**: Published services appear on the public listing within 1 second of the publish action.
- **SC-003**: Visitors can load the full services list in under 2 seconds.
- **SC-004**: Slug generation handles 100% of title inputs without manual intervention.
- **SC-005**: Deleting a service removes all associated cloud storage files with zero orphaned assets.
- **SC-006**: Reordering services takes effect immediately and is reflected on the next public request.

## Assumptions

- Authentication and authorization logic is already implemented (per PRD: "Out of Scope — Authentication & Authorization logic (already implemented)").
- Cloud storage (Backblaze B2) integration will be provided by the Media/Storage Module; this module consumes that capability.
- The admin dashboard frontend will handle drag-and-drop reorder UX; this module provides the API endpoint to persist the new order.
- Image validation (file size limits, MIME types) is handled by the centralized Media/Storage Module.
