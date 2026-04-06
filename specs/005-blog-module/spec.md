# Feature Specification: Blog Module

**Feature Branch**: `005-blog-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Blog Module - CRUD for articles with rich content, tag filtering, read time calculation, view counting, cover image upload, and publish/unpublish"
**PRD Reference**: §5.3 Blog Module, §4 Database Schema (`articles`), §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates and Edits Articles (Priority: P1)

An administrator wants to write and publish blog articles to share technical knowledge. They provide a title, content body (HTML or Markdown), excerpt, tags, and a cover image. The system auto-generates a slug and calculates estimated read time.

**Why this priority**: Article creation is the foundation — all other blog functionality depends on articles existing.

**Independent Test**: Can be tested by creating an article with all fields, verifying the slug is generated, read time is calculated, and the article is stored as unpublished.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they create an article with title "Getting Started with NestJS", content (1000 words), and excerpt, **Then** the article is created with slug "getting-started-with-nestjs", `read_time_minutes = 5`, `is_published = false`, `views_count = 0`.
2. **Given** an authenticated admin, **When** they create an article with tags ["NestJS", "TypeScript"], **Then** the tags array is stored correctly.
3. **Given** an existing article, **When** the admin updates the content to 2000 words, **Then** `read_time_minutes` is recalculated to 10.
4. **Given** an existing article, **When** the admin uploads a cover image, **Then** cover_image_url is set to the cloud storage URL.
5. **Given** an article title already in use, **When** the admin creates another with the same title, **Then** the slug is made unique with a numeric suffix.
6. **Given** an article without a title, **When** the admin attempts to create it, **Then** a validation error is returned.

---

### User Story 2 - Admin Publishes and Manages Articles (Priority: P1)

An administrator wants to control which articles are live on the website. Publishing an article for the first time records the publication date. Unpublishing hides it but preserves the publication date. Admins can also delete articles.

**Why this priority**: Publishing control directly determines what visitors see — critical for content management.

**Independent Test**: Can be tested by toggling publish status and verifying the `published_at` timestamp behavior, and deleting and confirming cleanup.

**Acceptance Scenarios**:

1. **Given** an unpublished article with an excerpt, **When** the admin publishes it, **Then** `is_published = true` and `published_at` is set to the current timestamp.
2. **Given** a published article, **When** the admin unpublishes it, **Then** `is_published = false` but `published_at` is NOT reset (retains original date).
3. **Given** an article without an excerpt, **When** the admin attempts to publish, **Then** the request is rejected because an excerpt is required for publishing.
4. **Given** a previously published-then-unpublished article, **When** the admin re-publishes it, **Then** `published_at` retains the original first-publish date.
5. **Given** an article with a cover image, **When** the admin deletes the article, **Then** the article record is removed and the cover image is purged from cloud storage.

---

### User Story 3 - Visitor Reads and Browses Articles (Priority: P2)

A website visitor wants to browse published blog articles, filter by tags, and read individual articles. Each time a visitor opens an article, the view count increments.

**Why this priority**: Public content consumption is the primary value of the blog.

**Independent Test**: Can be tested by browsing the public list, filtering by tags, viewing an article by slug, and verifying the view count increments.

**Acceptance Scenarios**:

1. **Given** published articles, **When** a visitor requests the list, **Then** only published articles are returned with pagination support.
2. **Given** published articles with various tags, **When** a visitor filters by tag "NestJS", **Then** only articles containing that tag are returned.
3. **Given** a published article with slug "getting-started-with-nestjs" and views_count = 10, **When** a visitor requests it by slug, **Then** the full article is returned and views_count increments to 11.
4. **Given** an unpublished article, **When** a visitor requests it by slug, **Then** a "not found" error is returned.
5. **Given** a slug that does not exist, **When** a visitor requests it, **Then** a "not found" error is returned.

---

### User Story 4 - Admin Lists All Articles in Dashboard (Priority: P3)

An administrator needs a complete view of all articles with pagination, sorting, and ability to see draft vs. published status.

**Why this priority**: Dashboard management is important but secondary to core CRUD and public access.

**Independent Test**: Can be tested by requesting the admin list with various parameters.

**Acceptance Scenarios**:

1. **Given** articles exist, **When** the admin requests all articles, **Then** both published and unpublished articles are returned.
2. **Given** articles exist, **When** the admin requests sorted by views_count descending, **Then** the most-viewed articles appear first.
3. **Given** 25 articles, **When** the admin requests page 1 with limit 10, **Then** 10 articles are returned with pagination metadata.

---

### Edge Cases

- What happens when an article has zero words of content? `read_time_minutes` MUST be set to 0 or 1 (minimum).
- What happens when two visitors request the same article simultaneously? Both requests MUST increment views_count without lost updates.
- What happens when a tag filter matches no articles? An empty list MUST be returned, not an error.
- What happens when an article is deleted while still published? The article and its images MUST be removed; the public listing immediately stops showing it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated admins to create an article with title, content (HTML/Markdown body), and optional fields (excerpt, tags, cover image).
- **FR-002**: System MUST auto-generate a unique slug from the article title.
- **FR-003**: System MUST auto-calculate `read_time_minutes` based on word count (approximately 200 words per minute).
- **FR-004**: System MUST allow admins to update any field of an existing article; recalculate read_time when content changes.
- **FR-005**: System MUST allow admins to delete an article and purge its cover image from cloud storage.
- **FR-006**: System MUST allow admins to toggle published status; publishing requires an excerpt.
- **FR-007**: System MUST set `published_at` on first publish and MUST NOT reset it on subsequent unpublish/republish cycles.
- **FR-008**: System MUST store tags as an array of strings.
- **FR-009**: System MUST increment `views_count` each time a public user fetches an article by slug.
- **FR-010**: System MUST expose a public endpoint listing only published articles with pagination and optional tag filtering.
- **FR-011**: System MUST expose a public endpoint returning a single published article by slug (includes view increment).
- **FR-012**: System MUST support pagination and sorting on admin listing endpoints.
- **FR-013**: System MUST reject all admin operations from unauthenticated or unauthorized users.

### Key Entities

- **Article**: Represents a blog post. Key attributes: title, slug (unique), excerpt, content body, cover image, tags (array), published status, published date, read time in minutes, view count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create and publish an article in under 2 minutes.
- **SC-002**: Read time calculation is accurate within ±1 minute for articles up to 10,000 words.
- **SC-003**: View counts are reliably incremented with zero lost updates under concurrent access.
- **SC-004**: Visitors can load the article list with tag filters in under 2 seconds.
- **SC-005**: Published articles appear on the public listing within 1 second of the publish action.

## Assumptions

- Authentication and authorization are already implemented.
- Cloud storage upload/delete is provided by the Media/Storage Module.
- Read time calculation uses ~200 words per minute as the standard reading speed.
- Content body is stored as-is (HTML or Markdown); rendering is a frontend concern.
- Tag filtering is case-insensitive and matches exact tag values.
