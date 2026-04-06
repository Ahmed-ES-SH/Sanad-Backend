# Research: Payments Module

**Feature**: 007-payments-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Payment Gateway SDK

- **Decision**: Use the official `stripe` npm package for PaymentIntent creation, refund processing, and webhook signature verification.
- **Rationale**: PRD §8 specifies Stripe as the payment gateway. The official SDK provides type-safe methods, built-in signature verification (`stripe.webhooks.constructEvent`), and handles API versioning. No custom HTTP wrapper needed.
- **Alternatives considered**: Raw HTTP calls to Stripe API (rejected — no signature verification helper, no TypeScript types, more error-prone), third-party wrappers (rejected — unnecessary abstraction over the official SDK).

### 2. Entity Pattern

- **Decision**: Use TypeORM `@Entity` with `@PrimaryGeneratedColumn('uuid')` for UUID primary keys, placed in `schema/` subfolder. Use a TypeScript `enum` for payment status.
- **Rationale**: Consistent with the existing codebase pattern (`user/schema/user.schema.ts`, `auth/schema/blacklisk-tokens.schema.ts`). PRD mandates UUID primary keys for all entities. Enum ensures type safety for the `pending | succeeded | failed | refunded` status values.
- **Alternatives considered**: String literals for status (rejected — no compile-time safety), separate status table (rejected — overkill for 4 fixed values).

### 3. Amount Storage & Conversion

- **Decision**: Store amount in the database as `decimal(10,2)` in dollars. Convert to cents (multiply by 100) when calling Stripe API, and convert back from cents to dollars when processing webhooks.
- **Rationale**: FR-012 explicitly requires dollar storage in DB and cent conversion in the service layer. Decimal type avoids floating-point rounding issues. Centralizing conversion in the service layer keeps it testable and consistent.
- **Alternatives considered**: Store in cents as integer (rejected — spec explicitly says dollars in DB), store as float (rejected — floating-point precision issues with money).

### 4. Webhook Raw Body Parsing

- **Decision**: Use a NestJS middleware to capture the raw body buffer on the webhook route (`POST /api/stripe/webhook`) before JSON parsing occurs. Apply `express.raw({ type: 'application/json' })` specifically to this route.
- **Rationale**: FR-013 mandates raw body for Stripe signature verification. NestJS uses JSON body parsing globally via `ValidationPipe`. Stripe's `constructEvent` requires the raw request body as a buffer/string — JSON-parsed bodies will fail signature verification.
- **Alternatives considered**: Disabling global body parsing (rejected — breaks all other endpoints), custom NestJS interceptor (rejected — interceptors run after body parsing).

### 5. Controller Split: Admin vs Webhook vs Client

- **Decision**: Three controllers — `payments.controller.ts` (admin, auth-guarded: list/filter/detail/refund), `payments.webhook.controller.ts` (public, no auth, raw body: webhook handler), and `payments.client.controller.ts` (authenticated client: create payment intent).
- **Rationale**: Each controller has fundamentally different auth requirements: admin needs `@Roles(ADMIN)`, webhook needs no auth but signature verification, client needs user authentication. Follows the established `auth.controller.ts` / `auth.public.controller.ts` split pattern.
- **Alternatives considered**: Single controller with mixed decorators (rejected — webhook raw body requirement conflicts with global JSON parsing, cleaner to separate).

### 6. Stripe Configuration

- **Decision**: Create a `stripe.config.ts` in `src/config/` that initializes the Stripe SDK using `STRIPE_SECRET_KEY` from environment variables. Export a factory provider for NestJS DI injection.
- **Rationale**: Follows the existing config pattern (`database.config.ts`, `mail.config.ts`, `cache.config.ts`). DI injection makes the Stripe client mockable in tests.
- **Alternatives considered**: Direct instantiation in service (rejected — not testable, violates DI pattern), `@nestjs/config` registerAs (rejected — Stripe client is not just config, it's an SDK instance).

### 7. Webhook Idempotency

- **Decision**: Before processing a webhook event, check the current payment status. If the status transition is invalid (e.g., trying to move `refunded` → `succeeded`), skip the update silently. Log the duplicate/invalid event but return 200 OK to Stripe.
- **Rationale**: Stripe may deliver the same event multiple times. Always returning 200 prevents Stripe from retrying. Status validation prevents corruption (e.g., a late `succeeded` event arriving after a refund).
- **Alternatives considered**: Storing processed event IDs in a separate table (rejected — adds complexity, status-based idempotency is sufficient for this scale), rejecting duplicates with 4xx (rejected — Stripe would retry indefinitely).

### 8. Payment Filtering (Admin)

- **Decision**: Extend `PaginationQueryDto` with payment-specific filters: `status` (enum), `startDate`/`endDate` (ISO date strings), and `userId` (UUID). Implement as a new `PaymentFilterDto` that extends the shared `PaginationQueryDto`.
- **Rationale**: FR-007 requires filtering by status, date range, and user. Extending the shared DTO keeps pagination consistent while adding payment-specific filters.
- **Alternatives considered**: Separate filter and pagination DTOs (rejected — more complex API, two layers of query params), single monolithic DTO (rejected — not reusable).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
