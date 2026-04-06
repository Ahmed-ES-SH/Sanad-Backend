# Implementation Plan: Services Module

**Branch**: `001-services-module` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-services-module/spec.md`

## Summary

Implement a complete Services module for the Sanad portfolio backend providing CRUD operations for tech services, publish/unpublish toggling, reorder capability, image upload integration, and auto-generated slugs. The module exposes both public endpoints (published services only) and admin-protected endpoints (full management).

## Technical Context

**Language/Version**: TypeScript 5.7.3 / Node.js LTS
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.28, class-validator 0.14.4, class-transformer 0.5.1
**Storage**: PostgreSQL via Neon (serverless) — TypeORM entities
**Testing**: Jest 30.x, Supertest 7.x
**Target Platform**: Node.js server (local + Vercel deployment)
**Project Type**: REST API backend module
**Performance Goals**: API responses under 200ms for list endpoints, under 500ms for write operations
**Constraints**: Follow existing codebase patterns (schema/ for entities, dto/ for DTOs, `@Public()` decorator for unauthenticated routes, `@Roles()` for admin-only)
**Scale/Scope**: Single module, 6 admin endpoints + 2 public endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PRD Alignment | ✅ PASS | Maps to PRD §5.1, §4 (`services` table), §6 (all service endpoints) |
| II. Feature-Based Task Structure | ✅ PASS | Dedicated spec and tasks files in `specs/001-services-module/` |
| III. Dependency Version Control | ✅ PASS | All deps pinned in research.md; no new packages needed |
| IV. Code Quality & Architecture | ✅ PASS | Follows NestJS modular pattern (module/controller/service/entity/dto) |
| V. Git Worktree Awareness | ✅ PASS | Self-contained module, no cross-feature coupling |
| VI. Validation & Security | ✅ PASS | DTOs with class-validator, `@Roles(ADMIN)` guard on admin endpoints |
| VII. Performance & Scalability | ✅ PASS | Pagination on list endpoints, index on slug column |
| VIII. Documentation | ✅ PASS | Swagger decorators on all endpoints |
| IX. Testing Standards | ✅ PASS | Test considerations documented; DI-based testable design |
| X. Version Consistency | ✅ PASS | No new dependencies introduced; uses existing packages only |

## Project Structure

### Documentation (this feature)

```text
specs/001-services-module/
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
├── services/
│   ├── services.module.ts          # Module definition
│   ├── services.controller.ts      # Admin endpoints (protected)
│   ├── services.public.controller.ts  # Public endpoints (@Public())
│   ├── services.service.ts         # Business logic
│   ├── schema/
│   │   └── service.schema.ts       # TypeORM entity
│   └── dto/
│       ├── create-service.dto.ts
│       ├── update-service.dto.ts
│       └── reorder-services.dto.ts
├── common/
│   └── dto/
│       └── pagination-query.dto.ts # Shared pagination DTO (new)
└── config/
    └── database.config.ts          # Updated — add Service entity
```

**Structure Decision**: Single module under `src/services/` following the established pattern from `src/user/` and `src/auth/`. Uses `schema/` subfolder for entities (not `entities/`) to match the existing convention. Splits public and admin controllers into separate files following the `auth.controller.ts` / `auth.public.controller.ts` pattern.

## Complexity Tracking

No violations. All patterns exist in the current codebase — no new abstractions introduced.

## Dependencies

### Existing (no version changes)

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^11.0.1 | Core NestJS decorators, pipes, guards |
| `@nestjs/core` | ^11.0.1 | NestJS core framework |
| `@nestjs/typeorm` | ^11.0.0 | TypeORM integration |
| `@nestjs/swagger` | ^11.2.6 | Swagger/OpenAPI decorators |
| `@nestjs/config` | ^4.0.3 | Configuration management |
| `typeorm` | ^0.3.28 | ORM for PostgreSQL |
| `class-validator` | ^0.14.4 | DTO validation |
| `class-transformer` | ^0.5.1 | DTO transformation |
| `pg` | ^8.20.0 | PostgreSQL driver |

### New Dependencies

**None required.** All functionality is achievable with existing packages.
