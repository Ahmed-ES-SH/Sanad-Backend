# Feature Specification: Portfolio Module

**Feature Branch**: `002-portfolio-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Portfolio Module - CRUD for projects with multiple image uploads, tech stack arrays, featured flag, category filtering, publish/unpublish, and reorder"
**PRD Reference**: §5.2 Portfolio Module, §4 Database Schema (`projects`), §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates a New Project (Priority: P1)

An administrator wants to showcase a completed project in the portfolio. They provide a title, description, tech stack used, category, and optional links to the live site and repository. The project starts as unpublished.

**Why this priority**: Creating projects is the foundational action for building the portfolio — all other operations depend on projects existing.

**Independent Test**: Can be fully tested by submitting a create request with required fields and verifying the project is stored with an auto-generated slug and `is_published = false`.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they submit a project with title "E-Commerce Platform" and short_description, **Then** the project is created with slug "e-commerce-platform", `is_published = false`, `is_featured = false`.
2. **Given** an authenticated admin, **When** they submit a project with a tech_stack of ["React", "NestJS", "PostgreSQL"], **Then** the tech stack array is stored correctly.
3. **Given** an authenticated admin, **When** they submit a project with category "Web App", **Then** the category is stored.
4. **Given** an authenticated admin, **When** they submit a project with a title already in use, **Then** the slug is made unique with a numeric suffix.
5. **Given** an authenticated admin, **When** they submit a project without a title or short_description, **Then** the request is rejected with a validation error.

---

### User Story 2 - Admin Manages Project Content and Images (Priority: P1)

An administrator needs to update project details and manage multiple images (a required cover image plus optional gallery images). They also need the ability to delete projects along with all associated images.

**Why this priority**: Content management is equally critical — admins must curate the portfolio continuously.

**Independent Test**: Can be tested by updating fields, uploading/removing images, and deleting a project while verifying all cloud storage assets are cleaned up.

**Acceptance Scenarios**:

1. **Given** an existing project, **When** the admin updates the title, description, live_url, or repo_url, **Then** only the specified fields change.
2. **Given** an existing project, **When** the admin uploads a cover image, **Then** cover_image_url is set to the cloud storage URL.
3. **Given** an existing project, **When** the admin uploads multiple gallery images, **Then** all image URLs are appended to the images array.
4. **Given** a project with images, **When** the admin deletes the project, **Then** the project record and all associated images (cover + gallery) are purged from cloud storage.
5. **Given** a non-existent project ID, **When** the admin attempts to update or delete, **Then** a "not found" error is returned.

---

### User Story 3 - Admin Controls Visibility and Featuring (Priority: P2)

An administrator wants to publish/unpublish projects, mark select projects as "featured" for homepage prominence, and reorder projects for display sequencing.

**Why this priority**: Visibility controls are essential for the public experience but require projects to exist first.

**Independent Test**: Can be tested by toggling publish/featured status and verifying public endpoint reflects the changes, and by reordering and confirming persistence.

**Acceptance Scenarios**:

1. **Given** an unpublished project with a cover_image_url, **When** the admin publishes it, **Then** `is_published = true` and it appears on the public listing.
2. **Given** a project without a cover_image_url, **When** the admin attempts to publish, **Then** the request is rejected because a cover image is required for publishing.
3. **Given** a published project, **When** the admin marks it as featured, **Then** `is_featured = true`.
4. **Given** 6 projects already featured (configurable max), **When** the admin attempts to feature another, **Then** the request is rejected with a message about the featured limit.
5. **Given** multiple projects, **When** the admin submits a reorder request, **Then** the `order` field for each project is updated accordingly.
6. **Given** a published project, **When** the admin unpublishes it, **Then** it no longer appears on the public listing.

---

### User Story 4 - Visitor Browses and Filters Published Projects (Priority: P2)

A visitor wants to explore portfolio projects. They can browse all published projects, filter by category or tech stack, and see featured projects highlighted.

**Why this priority**: Public-facing discovery is the core value proposition of the portfolio.

**Independent Test**: Can be tested by requesting the public listing with various filter combinations and verifying only matching published projects are returned.

**Acceptance Scenarios**:

1. **Given** published projects across categories, **When** a visitor requests the list, **Then** only published projects are returned sorted by display order.
2. **Given** published projects, **When** a visitor filters by category "Mobile", **Then** only published projects in that category are returned.
3. **Given** published projects, **When** a visitor filters by tech stack "React", **Then** only projects containing "React" in their tech_stack array are returned.
4. **Given** published projects, **When** a visitor filters by featured=true, **Then** only featured published projects are returned.
5. **Given** a published project with slug "e-commerce-platform", **When** a visitor requests it by slug, **Then** full project details are returned (title, descriptions, images, tech stack, links).
6. **Given** an unpublished project, **When** a visitor requests it by slug, **Then** a "not found" error is returned.

---

### User Story 5 - Admin Lists All Projects in Dashboard (Priority: P3)

An administrator needs a complete view of all projects (published and unpublished) with pagination and sorting.

**Why this priority**: Administrative overview supports management but is less critical than CRUD and public display.

**Independent Test**: Can be tested by requesting the admin list with pagination/sorting parameters.

**Acceptance Scenarios**:

1. **Given** 20 projects, **When** the admin requests page 2 with limit 10, **Then** projects 11-20 are returned with pagination metadata.
2. **Given** projects exist, **When** the admin requests sorted by created_at descending, **Then** projects are returned in the correct order.

---

### Edge Cases

- What happens when a featured project is unpublished? It MUST remain featured but MUST NOT appear in public featured listings.
- What happens when the last gallery image is removed? The images array MUST be empty, not null.
- What happens when category filter matches no projects? An empty list MUST be returned, not an error.
- What happens when multiple tech stack filters are provided? Projects matching ANY of the specified technologies MUST be returned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated admins to create a project with title, short_description, category, and optional fields (long_description, tech_stack, live_url, repo_url).
- **FR-002**: System MUST auto-generate a unique slug from the project title.
- **FR-003**: System MUST allow admins to upload a cover image and multiple gallery images per project.
- **FR-004**: System MUST store tech_stack as an array of strings.
- **FR-005**: System MUST allow admins to update any field of an existing project.
- **FR-006**: System MUST allow admins to delete a project and purge all associated images from cloud storage.
- **FR-007**: System MUST allow admins to toggle published status; publishing requires a cover_image_url.
- **FR-008**: System MUST allow admins to toggle the featured flag; a configurable maximum (default: 6) of featured projects is enforced.
- **FR-009**: System MUST allow admins to reorder projects via the `order` field.
- **FR-010**: System MUST expose a public endpoint listing only published projects sorted by display order, with optional filters for category, tech stack, and featured status.
- **FR-011**: System MUST expose a public endpoint returning a single published project by slug.
- **FR-012**: System MUST support pagination and sorting on admin listing endpoints.
- **FR-013**: System MUST reject all admin operations from unauthenticated or unauthorized users.

### Key Entities

- **Project**: Represents a portfolio project. Key attributes: title, slug (unique), short/long description, cover image, gallery images (array), tech stack (array), live URL, repo URL, category, published status, featured status, display order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a project with images in under 60 seconds.
- **SC-002**: Visitors can filter and load the projects list in under 2 seconds.
- **SC-003**: Featured projects are limited to the configured maximum with zero violations.
- **SC-004**: Deleting a project removes 100% of associated cloud storage files.
- **SC-005**: Category and tech stack filters return accurate results with no false positives or missed matches.

## Assumptions

- Authentication and authorization are already implemented.
- Cloud storage upload/delete is provided by the Media/Storage Module.
- The featured project limit (default: 6) is configurable via environment or configuration.
- Tech stack filtering uses a case-insensitive, partial-match strategy.
