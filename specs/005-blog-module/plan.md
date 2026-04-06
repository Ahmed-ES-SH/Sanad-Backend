# Implementation Plan: Blog Module

**Branch**: `005-blog-module` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-blog-module/spec.md`

## Summary

Implement a complete Blog module for the Sanad backend providing CRUD operations for articles with rich content (HTML/Markdown), auto-generated slugs, auto-calculated read time, tag filtering, atomic view counting, cover image support, and publish/unpublish with `published_at` timestamp semantics. The module exposes both public endpoints (published articles only, with tag filtering and view counting) and admin-protected endpoints (full management).

## Technical Context

**Language/Version**: TypeScript 5.7.3 / Node.js LTS
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.28, class-validator 0.14.4, class-transformer 0.5.1
**Storage**: PostgreSQL via Neon (serverless) — TypeORM entities
**Testing**: Jest 30.x, Supertest 7.x
**Target Platform**: Node.js server (local + Vercel deployment)
**Project Type**: REST API backend module
**Performance Goals**: API responses under 200ms for list endpoints, under 500ms for write operations
**Constraints**: Follow existing codebase patterns (schema/ for entities, dto/ for DTOs, `@Public()` decorator for unauthenticated routes, `@Roles()` for admin-only)
**Scale/Scope**: Single module, 5 admin endpoints + 2 public endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PRD Alignment | ✅ PASS | Maps to PRD §5.3, §4 (`articles` table), §6 (all blog endpoints) |
| II. Feature-Based Task Structure | ✅ PASS | Dedicated spec and tasks files in `specs/005-blog-module/` |
| III. Dependency Version Control | ✅ PASS | All deps pinned in research.md; no new packages needed |
| IV. Code Quality & Architecture | ✅ PASS | Follows NestJS modular pattern (module/controller/service/entity/dto) |
| V. Git Worktree Awareness | ✅ PASS | Self-contained module, no cross-feature coupling |
| VI. Validation & Security | ✅ PASS | DTOs with class-validator, `@Roles(ADMIN)` guard on admin endpoints |
| VII. Performance & Scalability | ✅ PASS | Pagination on list endpoints, GIN index for tags, atomic view increment |
| VIII. Documentation | ✅ PASS | Swagger decorators on all endpoints |
| IX. Testing Standards | ✅ PASS | Test considerations documented; DI-based testable design |
| X. Version Consistency | ✅ PASS | No new dependencies introduced; uses existing packages only |

## Project Structure

### Documentation (this feature)

```text
specs/005-blog-module/
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
├── blog/
│   ├── blog.module.ts                   # Module definition
│   ├── blog.controller.ts              # Admin endpoints (protected)
│   ├── blog.public.controller.ts       # Public endpoints (@Public())
│   ├── blog.service.ts                 # Business logic
│   ├── schema/
│   │   └── article.schema.ts           # TypeORM entity
│   └── dto/
│       ├── create-article.dto.ts
│       ├── update-article.dto.ts
│       └── filter-articles-query.dto.ts
├── common/
│   ├── dto/
│   │   └── pagination-query.dto.ts     # Shared (from 001)
│   └── utils/
│       └── slug.util.ts                # Shared slug generator (from 001)
└── config/
    └── database.config.ts              # Updated — add Article entity
```

**Structure Decision**: Single module under `src/blog/` following the established pattern from `src/services/`, `src/portfolio/`, `src/user/`, and `src/auth/`. Uses `schema/` subfolder for entities. Splits public and admin controllers into separate files.

## Complexity Tracking

No violations. All patterns exist in the current codebase — no new abstractions introduced. The only novel logic is read time calculation and atomic view counting, both trivial.

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
