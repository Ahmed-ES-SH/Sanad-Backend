# Research: Services Module

**Feature**: 001-services-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Entity Pattern

- **Decision**: Use TypeORM `@Entity` with `@PrimaryGeneratedColumn('uuid')` for UUID primary keys, placed in `schema/` subfolder.
- **Rationale**: PRD specifies UUID primary keys. Existing codebase uses `schema/` subfolder (e.g., `user/schema/user.schema.ts`). While the existing User entity uses auto-increment `@PrimaryGeneratedColumn()`, the PRD explicitly requires UUID for all new entities.
- **Alternatives considered**: Auto-increment IDs (rejected — PRD mandates UUIDs), `entities/` subfolder (rejected — inconsistent with existing pattern).

### 2. Slug Generation

- **Decision**: Generate slugs in the service layer using a simple `slugify` utility function (custom, no external dependency). On duplicate, append `-N` suffix.
- **Rationale**: No need for a library — slug generation is a simple `toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` operation. The deduplication logic queries the DB for existing slugs with the same base.
- **Alternatives considered**: `slugify` npm package (rejected — unnecessary dependency for trivial operation), database-level slug generation (rejected — harder to test, couples logic to DB).

### 3. Controller Split: Admin vs Public

- **Decision**: Two controllers — `services.controller.ts` (admin, default auth-guarded) and `services.public.controller.ts` (public, `@Public()` decorator).
- **Rationale**: Follows the existing pattern in `src/auth/` which splits `auth.controller.ts` and `auth.public.controller.ts`. Keeps route concerns separated cleanly.
- **Alternatives considered**: Single controller with mixed decorators (rejected — harder to read, breaks established pattern).

### 4. Pagination Strategy

- **Decision**: Create a shared `PaginationQueryDto` in `src/common/dto/` with `page`, `limit`, `sortBy`, `order` query params. Use TypeORM `skip`/`take` for pagination.
- **Rationale**: PRD §9 mandates pagination on all list endpoints. A shared DTO prevents duplication across modules. TypeORM's `skip/take` maps directly to SQL `OFFSET/LIMIT`.
- **Alternatives considered**: Cursor-based pagination (rejected — overkill for this scale, PRD specifies page-based).

### 5. Image Upload Integration

- **Decision**: The Services module stores URLs (`icon_url`, `cover_image_url`) as `VARCHAR(255)` columns. Actual upload/delete is delegated to the Media/Storage Module (010). For now, URLs are accepted as strings in DTOs.
- **Rationale**: Separation of concerns — the Services module owns service data, the Media module owns file operations. This avoids coupling and follows Constitution Principle V (Git Worktree Awareness).
- **Alternatives considered**: Embedding upload logic in the services controller (rejected — violates separation of concerns, duplicates code across modules).

### 6. Reorder Implementation

- **Decision**: Accept an array of `{ id, order }` pairs in a single PATCH request. Validate the payload and update all orders in a single transaction.
- **Rationale**: Atomic reorder prevents inconsistent state. Simple to implement with TypeORM's `save()` in a transaction.
- **Alternatives considered**: Individual order updates per service (rejected — N requests for N services, race conditions), swap-based reorder (rejected — more complex, less flexible).

### 7. Publish Validation

- **Decision**: Check `title` and `short_description` presence before allowing `is_published = true`. Implemented as a guard condition in the service layer, not at the DTO level.
- **Rationale**: Publish validation depends on the current state of the entity, not just the incoming request. DTO validation only sees the request body.
- **Alternatives considered**: Custom DTO validator (rejected — cannot access entity state), database trigger (rejected — business logic should be in the application layer).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
