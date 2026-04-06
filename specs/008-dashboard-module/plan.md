# Implementation Plan: Dashboard Module

**Branch**: `008-dashboard-module` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/008-dashboard-module/spec.md`

## Summary

Implement a read-only Dashboard module for the Sanad portfolio backend providing a single admin-only endpoint that returns aggregated statistics across all platform entities: projects, articles, services, contact messages, payments (with revenue calculation), and users. No new database entities are introduced — the module reads from existing tables owned by other modules.

## Technical Context

**Language/Version**: TypeScript 5.7.3 / Node.js LTS
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.28
**Storage**: PostgreSQL via Neon (serverless) — reads from existing tables
**Testing**: Jest 30.x, Supertest 7.x
**Target Platform**: Node.js server (local + Vercel deployment)
**Project Type**: REST API backend module (read-only aggregation)
**Performance Goals**: Dashboard response under 3 seconds with 10,000+ records per entity
**Constraints**: Follow existing codebase patterns (schema/ for entities, `@Roles()` for admin-only). No new tables. Parallel aggregation queries.
**Scale/Scope**: Single module, 1 admin endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PRD Alignment | ✅ PASS | Maps to PRD §5.6, §6 (dashboard endpoint) |
| II. Feature-Based Task Structure | ✅ PASS | Dedicated spec and tasks files in `specs/008-dashboard-module/` |
| III. Dependency Version Control | ✅ PASS | No new packages required |
| IV. Code Quality & Architecture | ✅ PASS | Follows NestJS modular pattern (module/controller/service) |
| V. Git Worktree Awareness | ✅ PASS | Read-only module, references entities via TypeORM repositories only |
| VI. Validation & Security | ✅ PASS | `@Roles(ADMIN)` guard on the endpoint |
| VII. Performance & Scalability | ✅ PASS | Parallel `Promise.all()` with individual `COUNT()`/`SUM()` queries |
| VIII. Documentation | ✅ PASS | Swagger decorators on the endpoint |
| IX. Testing Standards | ✅ PASS | Test considerations documented; DI-based testable design |
| X. Version Consistency | ✅ PASS | No new dependencies introduced |

## Project Structure

### Documentation (this feature)

```text
specs/008-dashboard-module/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (response DTO only — no entities)
├── contracts/           # Phase 1 output — API contracts
│   └── admin-api.md
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── dashboard/
│   ├── dashboard.module.ts          # Module definition
│   ├── dashboard.controller.ts      # Admin endpoint (protected)
│   ├── dashboard.service.ts         # Aggregation logic
│   └── dto/
│       └── dashboard-stats.dto.ts   # Response DTO
```

**Structure Decision**: Single module under `src/dashboard/` with a single controller and service. No `schema/` subfolder — this module owns no entities. Uses `dto/` for the response shape only. Imports entities from other modules via `TypeOrmModule.forFeature()`.

## Complexity Tracking

No violations. Straightforward read-only aggregation module. All queries are simple `COUNT()` and `SUM()` with no joins.

## Dependencies

### Existing (no version changes)

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^11.0.1 | Core NestJS decorators, pipes, guards |
| `@nestjs/core` | ^11.0.1 | NestJS core framework |
| `@nestjs/typeorm` | ^11.0.0 | TypeORM integration |
| `@nestjs/swagger` | ^11.2.6 | Swagger/OpenAPI decorators |
| `typeorm` | ^0.3.28 | ORM for PostgreSQL |

### New Dependencies

**None required.** All functionality is achievable with existing packages.
