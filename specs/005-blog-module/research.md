# Research: Blog Module

**Feature**: 005-blog-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Entity Pattern

- **Decision**: Use TypeORM `@Entity` with `@PrimaryGeneratedColumn('uuid')` for UUID primary keys, placed in `schema/` subfolder.
- **Rationale**: PRD specifies UUID primary keys. Existing codebase uses `schema/` subfolder (e.g., `user/schema/user.schema.ts`, `services/schema/service.schema.ts`, `portfolio/schema/project.schema.ts`). Consistent with the pattern established across all modules.
- **Alternatives considered**: Auto-increment IDs (rejected — PRD mandates UUIDs), `entities/` subfolder (rejected — inconsistent with existing pattern).

### 2. Slug Generation

- **Decision**: Reuse the shared `generateSlug()` and `generateUniqueSlug()` utilities from `src/common/utils/slug.util.ts` (created in 001-services-module).
- **Rationale**: Same slug logic applies — lowercase, strip special chars, hyphenate spaces, append `-N` suffix on duplicate. No reason to duplicate code.
- **Alternatives considered**: Module-specific slug utility (rejected — identical logic, violates DRY).

### 3. Controller Split: Admin vs Public

- **Decision**: Two controllers — `blog.controller.ts` (admin, default auth-guarded) and `blog.public.controller.ts` (public, `@Public()` decorator).
- **Rationale**: Follows the established pattern from `auth.controller.ts` / `auth.public.controller.ts`, `services.controller.ts` / `services.public.controller.ts`, and `portfolio.controller.ts` / `portfolio.public.controller.ts`.
- **Alternatives considered**: Single controller with mixed decorators (rejected — breaks established pattern).

### 4. Read Time Calculation

- **Decision**: Calculate `readTimeMinutes` in the service layer using `Math.max(1, Math.ceil(wordCount / 200))`. Recalculate on every content update.
- **Rationale**: Spec assumes ~200 words per minute reading speed and minimum of 1 minute. The calculation is trivial and should live in the service layer for testability. Word count is derived by splitting content on whitespace after stripping HTML tags.
- **Alternatives considered**: Database computed column (rejected — depends on content format parsing, better in application layer), frontend calculation (rejected — server must own this for consistency).

### 5. HTML Tag Stripping for Word Count

- **Decision**: Strip HTML tags using a simple regex `/<[^>]*>/g` before word counting. Do NOT use a full HTML parser.
- **Rationale**: Content may be HTML or Markdown. For word counting purposes, a simple tag strip is sufficient — we're counting approximate words, not rendering content. A regex avoids adding a dependency.
- **Alternatives considered**: `striptags` npm package (rejected — unnecessary dependency for trivial operation), counting raw content including tags (rejected — inflates word count with HTML markup).

### 6. View Count Increment

- **Decision**: Use TypeORM `repository.increment({ id }, 'viewsCount', 1)` for atomic view count updates. This generates a SQL `UPDATE articles SET views_count = views_count + 1 WHERE id = $1`.
- **Rationale**: Spec requires zero lost updates under concurrent access (SC-003). TypeORM's `increment()` is atomic at the database level — no read-modify-write race condition. No locking required.
- **Alternatives considered**: Read-then-save pattern (rejected — race condition under concurrency), Redis counter with periodic flush (rejected — overkill for this scale, adds infrastructure complexity).

### 7. Published At Semantics

- **Decision**: Set `publishedAt` on first publish only. Never reset on unpublish or subsequent republishes. Implemented as a conditional check in the service layer: `if (!article.publishedAt) article.publishedAt = new Date()`.
- **Rationale**: Spec FR-007 explicitly states `published_at` is set on first publish and MUST NOT be reset. This preserves the original publication date for sorting and display purposes.
- **Alternatives considered**: Reset on each publish (rejected — spec explicitly forbids), database trigger (rejected — business logic belongs in application layer).

### 8. Tags Storage and Filtering

- **Decision**: Store tags as a `text[]` PostgreSQL array column with a GIN index for efficient array containment queries. Filter with case-insensitive exact match using `LOWER()` on both sides.
- **Rationale**: Spec requires tags as an array of strings with case-insensitive exact match filtering. PostgreSQL GIN index on `text[]` supports efficient `@>` (contains) queries. `LOWER()` handles case insensitivity.
- **Alternatives considered**: Separate `tags` table with many-to-many (rejected — overkill for simple string tags without tag management CRUD), JSON column (rejected — `text[]` is more type-safe and GIN-indexable).

### 9. Publish Validation

- **Decision**: Publishing an article requires `excerpt` to be set. Implemented as a guard condition in the service layer.
- **Rationale**: Spec FR-006 states publishing requires an excerpt. This is an entity-state check, not a request-body check, so it belongs in the service layer.
- **Alternatives considered**: DTO-level validation (rejected — cannot access entity state), database constraint (rejected — business logic).

### 10. Image Upload Integration

- **Decision**: The Blog module stores `coverImageUrl` as a string column. Actual upload/delete is delegated to the Media/Storage Module (010). On article delete, the cover image URL is collected for purge but the purge call is stubbed until 010 is ready.
- **Rationale**: Separation of concerns — the Blog module owns article data, the Media module owns file operations.
- **Alternatives considered**: Embedding upload logic in blog controller (rejected — violates separation of concerns).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
