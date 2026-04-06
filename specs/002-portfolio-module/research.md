# Research: Portfolio Module

**Feature**: 002-portfolio-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Entity Pattern

- **Decision**: Use TypeORM `@Entity` with `@PrimaryGeneratedColumn('uuid')` for UUID primary keys, placed in `schema/` subfolder.
- **Rationale**: PRD specifies UUID primary keys. Existing codebase uses `schema/` subfolder (e.g., `user/schema/user.schema.ts`, services module uses `services/schema/service.schema.ts`). Consistent with the pattern established in 001-services-module.
- **Alternatives considered**: Auto-increment IDs (rejected — PRD mandates UUIDs), `entities/` subfolder (rejected — inconsistent with existing pattern).

### 2. Slug Generation

- **Decision**: Reuse the shared `generateSlug()` and `generateUniqueSlug()` utilities from `src/common/utils/slug.util.ts` (created in 001-services-module).
- **Rationale**: Same slug logic applies — lowercase, strip special chars, hyphenate spaces, append `-N` suffix on duplicate. No reason to duplicate code.
- **Alternatives considered**: Module-specific slug utility (rejected — identical logic, violates DRY).

### 3. Controller Split: Admin vs Public

- **Decision**: Two controllers — `portfolio.controller.ts` (admin, default auth-guarded) and `portfolio.public.controller.ts` (public, `@Public()` decorator).
- **Rationale**: Follows the established pattern from `auth.controller.ts` / `auth.public.controller.ts` and `services.controller.ts` / `services.public.controller.ts`. Keeps route concerns separated cleanly.
- **Alternatives considered**: Single controller with mixed decorators (rejected — breaks established pattern).

### 4. Gallery Images Storage

- **Decision**: Store gallery image URLs as a `text[]` PostgreSQL array column directly on the `projects` table.
- **Rationale**: Expected gallery size is small (< 20 images per project). PostgreSQL natively supports array columns with full indexing. Simpler schema, fewer queries. No per-image metadata (ordering, captions) is required by the spec.
- **Alternatives considered**: Separate `project_images` join table (rejected — unnecessary complexity for small arrays without per-item metadata), JSON column (rejected — `text[]` is more type-safe and indexable).

### 5. Tech Stack Array Storage

- **Decision**: Store tech stack as a `text[]` PostgreSQL array column with case-insensitive partial-match filtering.
- **Rationale**: Spec requires tech stack as an array of strings with case-insensitive filtering. PostgreSQL `ILIKE ANY(tech_stack)` or the `&&` array overlap operator with `LOWER()` provides this natively.
- **Alternatives considered**: Separate `tech_stack_tags` table (rejected — overkill for simple string arrays), JSON column (rejected — `text[]` is more efficient for array containment queries).

### 6. Featured Project Limit

- **Decision**: Enforce featured project maximum in the service layer by counting existing featured projects before toggling. Default limit is 6, configurable via `FEATURED_PROJECTS_MAX` environment variable.
- **Rationale**: Business rule from spec (FR-008). Service-layer enforcement allows clear error messages and testability. ConfigService provides runtime configuration without code changes.
- **Alternatives considered**: Database constraint (rejected — cannot express "max N rows where is_featured=true" as a simple constraint), DTO-level validation (rejected — requires entity state).

### 7. Category Filtering

- **Decision**: Use a simple `varchar(100)` column for category with equality filtering (exact match, case-insensitive via `ILIKE`).
- **Rationale**: Spec does not require a categories table or hierarchy. Simple string column with index is sufficient. Categories can be standardized on the frontend.
- **Alternatives considered**: Categories table with FK (rejected — spec doesn't require category management CRUD), enum type (rejected — categories should be flexible).

### 8. Reorder Implementation

- **Decision**: Accept an array of `{ id, order }` pairs in a single PATCH request. Update atomically in a transaction. Same pattern as 001-services-module.
- **Rationale**: Proven pattern from services module. Atomic reorder prevents inconsistent state.
- **Alternatives considered**: Individual updates (rejected — race conditions, N requests).

### 9. Image Upload Integration

- **Decision**: The Portfolio module stores URLs as string columns. Actual upload/delete is delegated to the Media/Storage Module (010). On project delete, image URLs are collected for purge but the purge call is stubbed until 010 is ready.
- **Rationale**: Separation of concerns — the Portfolio module owns project data, the Media module owns file operations.
- **Alternatives considered**: Embedding upload logic in portfolio controller (rejected — violates separation of concerns).

### 10. Publish Validation

- **Decision**: Publishing a project requires `coverImageUrl` to be set. Unpublishing retains featured status but hides from public.
- **Rationale**: Spec FR-007 states publishing requires a cover image. Spec edge case states featured projects that are unpublished remain featured but do not appear on public featured listings.
- **Alternatives considered**: Auto-unfeaturing on unpublish (rejected — spec explicitly says featured status persists).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
