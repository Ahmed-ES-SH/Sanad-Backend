# Implementation Plan: Media Storage Module

**Branch**: `010-media-storage-module` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-media-storage-module/spec.md`

## Summary

Implement a centralized Media Storage module for the Sanad portfolio backend providing file upload to Backblaze B2 (via S3-compatible API), MIME type validation, file size enforcement (5MB max), UUID-based filename generation, entity-organized storage keys, CDN URL generation, and file deletion. The module exposes an admin HTTP endpoint for direct uploads/deletes and exports a shared service for programmatic consumption by other modules.

## Technical Context

**Language/Version**: TypeScript 5.7.3 / Node.js LTS
**Primary Dependencies**: NestJS 11.x, @aws-sdk/client-s3, Multer (via @nestjs/platform-express)
**Storage**: Backblaze B2 (S3-compatible API) — no database tables
**Testing**: Jest 30.x, Supertest 7.x
**Target Platform**: Node.js server (local + Vercel deployment)
**Project Type**: REST API backend module (shared service + HTTP endpoints)
**Performance Goals**: Upload under 10s for 5MB files, delete under 5s
**Constraints**: Follow existing codebase patterns. Memory buffering only (no disk writes). Max 5MB file size.
**Scale/Scope**: Single module, 2 admin endpoints (upload + delete), exported service for cross-module use

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PRD Alignment | ✅ PASS | Maps to PRD §5.8, §7, §6 (media endpoints) |
| II. Feature-Based Task Structure | ✅ PASS | Dedicated spec and tasks files in `specs/010-media-storage-module/` |
| III. Dependency Version Control | ✅ PASS | New package `@aws-sdk/client-s3` pinned in research.md |
| IV. Code Quality & Architecture | ✅ PASS | Follows NestJS modular pattern (module/controller/service) |
| V. Git Worktree Awareness | ✅ PASS | Self-contained module, consumed by others via exported service |
| VI. Validation & Security | ✅ PASS | MIME validation, size limits, `@Roles(ADMIN)` on endpoints |
| VII. Performance & Scalability | ✅ PASS | Memory buffering bounded at 5MB, direct S3 upload |
| VIII. Documentation | ✅ PASS | Swagger decorators on endpoints |
| IX. Testing Standards | ✅ PASS | DI-based with injectable S3 client for mocking |
| X. Version Consistency | ✅ PASS | One new dependency (`@aws-sdk/client-s3`) pinned |

## Project Structure

### Documentation (this feature)

```text
specs/010-media-storage-module/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (DTOs only — no entities)
├── contracts/           # Phase 1 output — API contracts
│   └── admin-api.md
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── media-storage/
│   ├── media-storage.module.ts          # Module definition (exports service)
│   ├── media-storage.controller.ts      # Admin endpoints (upload + delete)
│   ├── media-storage.service.ts         # B2/S3 operations + validation logic
│   ├── dto/
│   │   ├── upload-file.dto.ts           # Upload form fields (entity, subfolder)
│   │   └── upload-response.dto.ts       # Response DTO (url, key, filename)
│   └── constants/
│       └── media.constants.ts           # Allowed MIME types, max size, entities whitelist
├── config/
│   └── b2-storage.config.ts             # B2/S3 client factory provider (new)
```

**Structure Decision**: Single module under `src/media-storage/` with a single admin controller and service. No `schema/` subfolder — this module owns no database entities. The service is exported for injection by other modules. Constants are separated into a dedicated file for easy maintenance.

## Complexity Tracking

No violations. All patterns exist in the NestJS ecosystem — no new abstractions introduced.

## Dependencies

### Existing (no version changes)

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^11.0.1 | Core NestJS decorators, pipes, guards |
| `@nestjs/core` | ^11.0.1 | NestJS core framework |
| `@nestjs/platform-express` | ^11.0.1 | Multer integration for file uploads |
| `@nestjs/swagger` | ^11.2.6 | Swagger/OpenAPI decorators |
| `@nestjs/config` | ^4.0.3 | Configuration management |
| `class-validator` | ^0.14.4 | DTO validation |
| `class-transformer` | ^0.5.1 | DTO transformation |

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-s3` | ^3.750.0 | S3-compatible client for Backblaze B2 operations (PutObject, DeleteObject) |
