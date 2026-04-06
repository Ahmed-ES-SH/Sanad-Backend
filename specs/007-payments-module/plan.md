# Implementation Plan: Payments Module

**Branch**: `007-payments-module` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-payments-module/spec.md`

## Summary

Implement a complete Payments module for the Sanad portfolio backend providing Stripe PaymentIntent creation, webhook handling for payment status updates (succeeded/failed/refunded), admin payment listing with filters (status, date range, user), single payment detail views, and refund processing. The module exposes a client endpoint for payment initiation, a webhook endpoint for Stripe events, and admin-protected endpoints for payment management.

## Technical Context

**Language/Version**: TypeScript 5.7.3 / Node.js LTS
**Primary Dependencies**: NestJS 11.x, TypeORM 0.3.28, class-validator 0.14.4, class-transformer 0.5.1, Stripe SDK
**Storage**: PostgreSQL via Neon (serverless) — TypeORM entities
**Testing**: Jest 30.x, Supertest 7.x
**Target Platform**: Node.js server (local + Vercel deployment)
**Project Type**: REST API backend module
**Performance Goals**: Payment intent creation under 5s (includes Stripe round-trip), webhook processing under 2s, admin list under 2s
**Constraints**: Follow existing codebase patterns (schema/ for entities, dto/ for DTOs, `@Public()` for unauthenticated routes, `@Roles()` for admin-only). Webhook endpoint requires raw body parsing for signature verification.
**Scale/Scope**: Single module, 4 admin endpoints + 1 webhook endpoint + 1 client endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. PRD Alignment | ✅ PASS | Maps to PRD §5.5, §8, §4 (`payments` table), §6 (payment endpoints) |
| II. Feature-Based Task Structure | ✅ PASS | Dedicated spec and tasks files in `specs/007-payments-module/` |
| III. Dependency Version Control | ✅ PASS | All deps pinned in research.md; one new package (`stripe`) required |
| IV. Code Quality & Architecture | ✅ PASS | Follows NestJS modular pattern (module/controller/service/entity/dto) |
| V. Git Worktree Awareness | ✅ PASS | Self-contained module, references User entity by ID only (no cross-module import) |
| VI. Validation & Security | ✅ PASS | DTOs with class-validator, `@Roles(ADMIN)` on admin endpoints, webhook signature verification |
| VII. Performance & Scalability | ✅ PASS | Pagination on list endpoints, indexes on status and stripePaymentIntentId columns |
| VIII. Documentation | ✅ PASS | Swagger decorators on all endpoints |
| IX. Testing Standards | ✅ PASS | Test considerations documented; DI-based testable design with injectable Stripe client |
| X. Version Consistency | ✅ PASS | One new dependency (`stripe`) — version pinned in research.md |

## Project Structure

### Documentation (this feature)

```text
specs/007-payments-module/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output — API contracts
│   ├── admin-api.md
│   ├── client-api.md
│   └── webhook-api.md
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── payments/
│   ├── payments.module.ts              # Module definition
│   ├── payments.controller.ts          # Admin endpoints (protected, @Roles(ADMIN))
│   ├── payments.client.controller.ts   # Client endpoint (authenticated user)
│   ├── payments.webhook.controller.ts  # Webhook endpoint (@Public(), raw body)
│   ├── payments.service.ts             # Business logic + Stripe integration
│   ├── schema/
│   │   └── payment.schema.ts           # TypeORM entity
│   ├── dto/
│   │   ├── create-payment-intent.dto.ts
│   │   ├── payment-filter.dto.ts
│   │   └── payment-response.dto.ts
│   └── enums/
│       └── payment-status.enum.ts      # pending | succeeded | failed | refunded
├── config/
│   └── stripe.config.ts                # Stripe SDK factory provider (new)
└── config/
    └── database.config.ts              # Updated — add Payment entity
```

**Structure Decision**: Single module under `src/payments/` following the established pattern from `src/user/` and `src/auth/`. Uses `schema/` subfolder for entities to match the existing convention. Splits into three controllers (admin/client/webhook) due to fundamentally different auth and body parsing requirements.

## Complexity Tracking

One new concern: webhook raw body parsing requires a NestJS middleware to apply `express.raw()` on the webhook route. This is a well-documented NestJS pattern — no novel abstraction.

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

| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | ^17.7.0 | Stripe API SDK — PaymentIntent creation, refunds, webhook signature verification |
