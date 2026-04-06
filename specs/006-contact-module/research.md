# Research: Contact Module

**Feature**: 006-contact-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Entity Pattern

- **Decision**: Use TypeORM `@Entity` with `@PrimaryGeneratedColumn('uuid')` for UUID primary keys, placed in `schema/` subfolder.
- **Rationale**: PRD specifies UUID primary keys. Existing codebase uses `schema/` subfolder (e.g., `user/schema/user.schema.ts`). Consistent with `001-services-module` pattern.
- **Alternatives considered**: Auto-increment IDs (rejected — PRD mandates UUIDs), `entities/` subfolder (rejected — inconsistent with existing pattern).

### 2. Rate Limiting Strategy

- **Decision**: Use NestJS `@nestjs/throttler` with a custom per-route override on the public submission endpoint: 5 requests per 3600000ms (1 hour) per IP. The global throttler (10 req/min) remains unchanged.
- **Rationale**: The project already uses `@nestjs/throttler` globally (10 req/min). The `@Throttle()` decorator allows per-route overrides without adding new dependencies. The spec requires 5 requests per hour per IP — this maps directly to `@Throttle({ default: { ttl: 3600000, limit: 5 } })` on the submit endpoint.
- **Alternatives considered**: Custom middleware with Redis counter (rejected — over-engineered for single-endpoint use, adds Redis dependency), express-rate-limit (rejected — redundant with existing throttler, introduces second rate-limiting system).

### 3. Controller Split: Admin vs Public

- **Decision**: Two controllers — `contact.controller.ts` (admin, default auth-guarded) and `contact.public.controller.ts` (public, `@Public()` decorator).
- **Rationale**: Follows the established pattern from `src/auth/` which splits `auth.controller.ts` and `auth.public.controller.ts`. Also consistent with the pattern defined in `001-services-module`. Keeps public submission and admin management cleanly separated.
- **Alternatives considered**: Single controller with mixed decorators (rejected — harder to read, breaks established pattern).

### 4. Message Filtering Strategy

- **Decision**: Use optional query parameter `is_read` (boolean) on the admin list endpoint. When provided, filter messages by read status. When omitted, return all messages.
- **Rationale**: Simple query param filter is sufficient for the binary read/unread state. No need for a complex search/filter system since the spec only requires filtering by `is_read`.
- **Alternatives considered**: Separate endpoints for read/unread (rejected — redundant, violates REST conventions), full-text search (rejected — out of scope, spec only mentions read/unread filtering).

### 5. Reply Tracking Implementation

- **Decision**: Implement reply tracking as a PATCH endpoint that sets `replied_at` to the current server timestamp. Marking as replied also automatically sets `is_read = true` (as per edge case requirement).
- **Rationale**: The spec explicitly states "Marking as replied SHOULD also set `is_read = true` automatically." This is business logic in the service layer, not a DTO concern. The `replied_at` column is a nullable timestamp — `null` means not replied, non-null means replied.
- **Alternatives considered**: Separate `reply` entity with message content (rejected — spec says actual replies happen externally, this is just tracking), boolean `is_replied` flag (rejected — spec uses timestamp for audit trail).

### 6. Hard Delete Strategy

- **Decision**: Use TypeORM `remove()` for permanent deletion. No soft-delete pattern.
- **Rationale**: Spec explicitly states "Message deletion is permanent (hard delete), not soft delete" in Assumptions. No need for `@DeleteDateColumn()` or custom soft-delete logic.
- **Alternatives considered**: Soft delete with `deleted_at` column (rejected — spec explicitly requires hard delete).

### 7. Pagination on Admin List

- **Decision**: Reuse the shared `PaginationQueryDto` from `src/common/dto/pagination-query.dto.ts` (created in `001-services-module`). Extend it with an optional `isRead` filter parameter in a `ContactQueryDto`.
- **Rationale**: Pagination is already solved by the shared DTO. The contact module only adds one additional filter (`isRead`), so extending the shared DTO keeps things DRY.
- **Alternatives considered**: Custom pagination DTO (rejected — duplicates existing shared DTO), no pagination (rejected — PRD §9 mandates pagination on all list endpoints).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
