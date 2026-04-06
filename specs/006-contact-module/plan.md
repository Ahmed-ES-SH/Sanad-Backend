# Implementation Plan: Contact Module

**Branch**: `006-contact-module` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/006-contact-module/spec.md`

## Summary

Implement a complete Contact module for the Sanad portfolio backend providing public contact form submission with IP-based rate limiting, admin message management with read/unread filtering, reply tracking, and permanent deletion. The module exposes a public submission endpoint and admin-protected management endpoints.

## Technical Context

**Language/Version**: TypeScript 5.7.3 / Node.js LTS
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.28, class-validator 0.14.4, class-transformer 0.5.1, @nestjs/throttler 6.5.0
**Storage**: PostgreSQL via Neon (serverless) — TypeORM entities
**Testing**: Jest 30.x, Supertest 7.x
**Target Platform**: Node.js server (local + Vercel deployment)
**Project Type**: REST API backend module
**Performance Goals**: API responses under 200ms for list endpoints, under 500ms for write operations
**Constraints**: Follow existing codebase patterns (schema/ for entities, dto/ for DTOs, `@Public()` decorator for unauthenticated routes, `@Roles()` for admin-only)
**Scale/Scope**: Single module, 5 admin endpoints + 1 public endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PRD Alignment | ✅ PASS | Maps to PRD §5.4, §4 (`contact_messages` table), §6 (contact endpoints) |
| II. Feature-Based Task Structure | ✅ PASS | Dedicated spec and tasks files in `specs/006-contact-module/` |
| III. Dependency Version Control | ✅ PASS | All deps pinned in research.md; no new packages needed |
| IV. Code Quality & Architecture | ✅ PASS | Follows NestJS modular pattern (module/controller/service/entity/dto) |
| V. Git Worktree Awareness | ✅ PASS | Self-contained module, no cross-feature coupling |
| VI. Validation & Security | ✅ PASS | DTOs with class-validator, `@Roles(ADMIN)` guard on admin endpoints, rate limiting on public endpoint |
| VII. Performance & Scalability | ✅ PASS | Pagination on list endpoints, indexes on `is_read` and `created_at` columns |
| VIII. Documentation | ✅ PASS | Swagger decorators on all endpoints |
| IX. Testing Standards | ✅ PASS | Test considerations documented; DI-based testable design |
| X. Version Consistency | ✅ PASS | No new dependencies introduced; uses existing packages only |

## Project Structure

### Documentation (this feature)

```text
specs/006-contact-module/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output — API contracts
│   ├── public-api.md
│   └── admin-api.md
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── contact/
│   ├── contact.module.ts              # Module definition
│   ├── contact.controller.ts          # Admin endpoints (protected)
│   ├── contact.public.controller.ts   # Public submission endpoint (@Public())
│   ├── contact.service.ts             # Business logic
│   ├── schema/
│   │   └── contact-message.schema.ts  # TypeORM entity
│   └── dto/
│       ├── create-contact-message.dto.ts  # Public submission validation
│       ├── contact-query.dto.ts           # Admin list filter + pagination
│       └── mark-replied.dto.ts            # (optional — may be empty body)
└── config/
    └── database.config.ts             # Updated — add ContactMessage entity
```

**Structure Decision**: Single module under `src/contact/` following the established pattern from `src/user/` and `src/auth/`. Uses `schema/` subfolder for entities (not `entities/`) to match the existing convention. Splits public and admin controllers into separate files following the `auth.controller.ts` / `auth.public.controller.ts` pattern.

## Complexity Tracking

No violations. All patterns exist in the current codebase — no new abstractions introduced. The `@Throttle()` decorator for per-route rate limiting is a standard feature of the already-installed `@nestjs/throttler` package.

## Dependencies

### Existing (no version changes)

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^11.0.1 | Core NestJS decorators, pipes, guards |
| `@nestjs/core` | ^11.0.1 | NestJS core framework |
| `@nestjs/typeorm` | ^11.0.0 | TypeORM integration |
| `@nestjs/swagger` | ^11.2.6 | Swagger/OpenAPI decorators |
| `@nestjs/config` | ^4.0.3 | Configuration management |
| `@nestjs/throttler` | ^6.5.0 | Rate limiting (per-route override for contact submission) |
| `typeorm` | ^0.3.28 | ORM for PostgreSQL |
| `class-validator` | ^0.14.4 | DTO validation |
| `class-transformer` | ^0.5.1 | DTO transformation |
| `pg` | ^8.20.0 | PostgreSQL driver |

### New Dependencies

**None required.** All functionality is achievable with existing packages. Rate limiting uses the already-installed `@nestjs/throttler` with a per-route `@Throttle()` override.
