# Tasks: Payments Module

**Input**: Design documents from `/specs/007-payments-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create the module skeleton, enum, entity, and Stripe config

- [x] T001 Install Stripe SDK by running `npm install stripe@^17.7.0`
- [x] T002 Create payments module directory structure: `src/payments/`, `src/payments/schema/`, `src/payments/dto/`, `src/payments/enums/`
- [x] T003 [P] Create `PaymentStatus` enum in `src/payments/enums/payment-status.enum.ts` with values: `pending`, `succeeded`, `failed`, `refunded`
- [x] T004 [P] Create Stripe config factory provider in `src/config/stripe.config.ts` — initialize Stripe SDK with `STRIPE_SECRET_KEY` from `ConfigService`, export as injectable provider
- [x] T005 [P] Create Payment entity in `src/payments/schema/payment.schema.ts` with all columns (id uuid PK, userId, stripePaymentIntentId unique, stripeCustomerId, amount decimal(10,2), currency, status enum, description, metadata jsonb, createdAt, updatedAt) and indexes on `[status]`, `[user_id]`, `[created_at]`
- [x] T006 Register Payment entity in `src/config/database.config.ts` entities array
- [x] T007 Generate TypeORM migration by running `npm run migration:generate --name=CreatePaymentsTable`
- [x] T008 Run migration with `npm run migration:run` to create the payments table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the module, DTOs, service skeleton, and all controllers that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create `CreatePaymentIntentDto` in `src/payments/dto/create-payment-intent.dto.ts` with amount (required, min 0.5, max 2 decimals), currency (optional, max 10, default 'usd'), description (required), userId (optional UUID) — all with @ApiProperty decorators
- [x] T010 [P] Create `PaymentFilterDto` in `src/payments/dto/payment-filter.dto.ts` extending `PaginationQueryDto` with status (optional enum), startDate (optional ISO date), endDate (optional ISO date), userId (optional UUID) — all with @ApiPropertyOptional decorators
- [x] T011 Create `PaymentsService` skeleton in `src/payments/payments.service.ts` — inject `Repository<Payment>` via `@InjectRepository`, inject Stripe client via `@Inject`, add private `toCents(dollars: number): number` and `toDollars(cents: number): number` utility methods
- [x] T012 Create `PaymentsController` skeleton in `src/payments/payments.controller.ts` — route prefix `admin/payments`, inject `PaymentsService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [x] T013 [P] Create `PaymentsClientController` skeleton in `src/payments/payments.client.controller.ts` — route prefix `payments`, inject `PaymentsService` (authenticated users, no @Public())
- [x] T014 [P] Create `PaymentsWebhookController` skeleton in `src/payments/payments.webhook.controller.ts` — route prefix `api/stripe`, inject `PaymentsService`, add `@Public()` decorator at class level
- [x] T015 Create raw body middleware for webhook route in `src/payments/payments.module.ts` — configure `express.raw({ type: 'application/json' })` middleware for `api/stripe/webhook` path
- [x] T016 Create `PaymentsModule` in `src/payments/payments.module.ts` — import `TypeOrmModule.forFeature([Payment])`, register Stripe provider, register all three controllers and service, configure middleware
- [x] T017 Register `PaymentsModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoints yet

---

## Phase 3: User Story 1 — Client Initiates a Payment (Priority: P1) 🎯 MVP

**Goal**: Clients can create a payment intent; system creates a pending payment record and returns client_secret

**Independent Test**: POST to `/payments/create-intent` with amount and description → verify pending payment created in DB and client_secret returned

### Implementation for User Story 1

- [x] T018 [US1] Implement `createPaymentIntent(dto: CreatePaymentIntentDto)` method in `src/payments/payments.service.ts` — call Stripe `paymentIntents.create()` with amount in cents, store pending payment record with amount in dollars, return `{ clientSecret, paymentId, stripePaymentIntentId }`. If Stripe fails, throw `BadGatewayException` without creating DB record (atomic).
- [x] T019 [US1] Wire `POST /payments/create-intent` endpoint in `src/payments/payments.client.controller.ts` — accept `@Body() CreatePaymentIntentDto`, call `this.paymentsService.createPaymentIntent()`, return 201 Created with @ApiResponse decorators

**Checkpoint**: Client can create payment intents — US1 is fully functional

---

## Phase 4: User Story 2 — System Processes Payment Status via Webhooks (Priority: P1)

**Goal**: Stripe webhook events update payment status (succeeded/failed/refunded) with signature verification and idempotency

**Independent Test**: Send simulated webhook with valid signature → verify payment status updates in DB; send with invalid signature → verify rejection

### Implementation for User Story 2

- [x] T020 [US2] Implement `verifyWebhookSignature(payload: Buffer, signature: string)` private method in `src/payments/payments.service.ts` — use `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`, throw `BadRequestException` on invalid signature
- [x] T021 [US2] Implement `handleWebhookEvent(event: Stripe.Event)` method in `src/payments/payments.service.ts` — switch on `event.type` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`. Find payment by `stripePaymentIntentId`, validate status transition, update status and metadata. Log and skip if payment not found. Handle idempotency (skip if already in target status).
- [x] T022 [US2] Wire `POST /api/stripe/webhook` endpoint in `src/payments/payments.webhook.controller.ts` — read raw body from `@Req()`, read `stripe-signature` from `@Headers()`, call `verifyWebhookSignature()` then `handleWebhookEvent()`, return `{ received: true }`

**Checkpoint**: Webhook processing works — payment statuses update correctly via Stripe events

---

## Phase 5: User Story 3 — Admin Views and Filters Payments (Priority: P2)

**Goal**: Admins can list payments with filters (status, date range, user) and pagination, and view single payment details

**Independent Test**: GET `/admin/payments?status=succeeded&page=1&limit=10` → verify filtered/paginated results; GET `/admin/payments/:id` → verify full details returned

### Implementation for User Story 3

- [x] T023 [US3] Implement `findOneOrFail(id: string)` private method in `src/payments/payments.service.ts` — find by UUID, throw `NotFoundException` if not found
- [x] T024 [US3] Implement `findAll(query: PaymentFilterDto)` method in `src/payments/payments.service.ts` — build TypeORM `where` clause dynamically from status, startDate/endDate (using `Between` or `MoreThanOrEqual`/`LessThanOrEqual`), userId filters. Use `findAndCount()` with `skip: (page-1)*limit`, `take: limit`, dynamic `order` from sortBy/order params, return `{ data, meta: { page, limit, total, totalPages } }`
- [x] T025 [US3] Implement `findOne(id: string)` method in `src/payments/payments.service.ts` — call `findOneOrFail()`, return the payment entity
- [x] T026 [US3] Wire `GET /admin/payments` endpoint in `src/payments/payments.controller.ts` — accept `@Query() PaymentFilterDto` (with `ValidationPipe` implicit), call `this.paymentsService.findAll()`, return 200 OK with paginated response
- [x] T027 [US3] Wire `GET /admin/payments/:id` endpoint in `src/payments/payments.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.paymentsService.findOne()`, return 200 OK

**Checkpoint**: Admin can view and filter payments — US1 + US2 + US3 fully functional

---

## Phase 6: User Story 4 — Admin Issues a Refund (Priority: P2)

**Goal**: Admins can refund succeeded payments via the gateway; status updates to refunded

**Independent Test**: POST `/admin/payments/:id/refund` for a succeeded payment → verify status changes to `refunded` and Stripe processes the refund; attempt on `pending` payment → verify 400 rejection

### Implementation for User Story 4

- [x] T028 [US4] Implement `refund(id: string)` method in `src/payments/payments.service.ts` — find payment via `findOneOrFail()`, validate status is `succeeded` (throw `BadRequestException` if not), call Stripe `refunds.create()` with `stripePaymentIntentId`, update status to `refunded`, save and return `{ id, status, message }`. If Stripe refund fails, throw `BadGatewayException` without updating status.
- [x] T029 [US4] Wire `POST /admin/payments/:id/refund` endpoint in `src/payments/payments.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.paymentsService.refund()`, return 200 OK with `{ id, status: 'refunded', message: 'Payment refunded successfully' }`

**Checkpoint**: Refund flow works — all 4 user stories fully functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation, validation, and final verification

- [x] T030 [P] Add Swagger `@ApiTags('Payments (Admin)')` to `PaymentsController`, `@ApiTags('Payments')` to `PaymentsClientController`, and `@ApiTags('Stripe Webhooks')` to `PaymentsWebhookController` in their respective files
- [x] T031 [P] Add `@ApiOperation()` and `@ApiResponse()` decorators to all 6 endpoints across `src/payments/payments.controller.ts`, `src/payments/payments.client.controller.ts`, and `src/payments/payments.webhook.controller.ts`
- [x] T032 [P] Add `@ApiParam()` decorators for `:id` path parameters in `src/payments/payments.controller.ts`
- [x] T033 Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `.env.example` (or equivalent) documenting required environment variables
- [x] T034 Validate all endpoints against contracts by running through the quickstart.md curl commands in `specs/007-payments-module/quickstart.md`
- [x] T035 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - **US1 (Phase 3)**: Independent — can start after Phase 2
  - **US2 (Phase 4)**: Independent of US1 (webhook handler uses its own lookup methods)
  - **US3 (Phase 5)**: Independent of US1/US2 (admin listing and detail, own service methods)
  - **US4 (Phase 6)**: Depends on payment records existing (logically after US1), but code is independently implementable
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — Independently testable with manual DB records
- **US3 (P2)**: Can start after Phase 2 — Independently testable with manual DB records
- **US4 (P2)**: Can start after Phase 2 — Independently testable with manual DB records (status=succeeded)

### Within Each User Story

- Service methods before controller wiring
- Core logic before edge case handling

### Parallel Opportunities

- **Phase 1**: T003 + T004 + T005 can run in parallel (different files)
- **Phase 2**: T010 can run parallel with T009; T013 + T014 can run in parallel (different files)
- **Phase 3–6**: User stories 1, 2, 3, 4 can theoretically run in parallel since they touch different service methods
- **Phase 7**: T030 + T031 + T032 can all run in parallel (different decorators, different files)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch in parallel (different files):
Task: "Create PaymentStatus enum in src/payments/enums/payment-status.enum.ts"
Task: "Create Stripe config in src/config/stripe.config.ts"
Task: "Create Payment entity in src/payments/schema/payment.schema.ts"
```

## Parallel Example: Phase 2 DTOs

```bash
# Launch in parallel (different DTO files):
Task: "Create CreatePaymentIntentDto in src/payments/dto/create-payment-intent.dto.ts"
Task: "Create PaymentFilterDto in src/payments/dto/payment-filter.dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T008)
2. Complete Phase 2: Foundational (T009–T017)
3. Complete Phase 3: User Story 1 — Create Intent (T018–T019)
4. **STOP and VALIDATE**: Test creating payment intents with Stripe test keys
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US1 (Create Intent) → Test independently → **MVP ready!**
3. Add US2 (Webhooks) → Test with Stripe CLI → Payment lifecycle complete
4. Add US3 (Admin List/Detail) → Test independently → Admin visibility
5. Add US4 (Refunds) → Test independently → Full payment management
6. Polish → Swagger docs + final verification

### Parallel Team Strategy

With multiple developers after Phase 2:

- Developer A: US1 (Create Intent) + US2 (Webhooks) — payment flow
- Developer B: US3 (Admin List/Detail) + US4 (Refunds) — admin management
- Developer C: Polish (Swagger + validation)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The webhook endpoint MUST use raw body parsing — see T015 for middleware setup
- Amount conversion (dollars ↔ cents) is centralized in the service layer via `toCents()` and `toDollars()` helpers
- Payment records are NEVER deleted — only status updates are allowed (FR-011)
- Always return 200 to Stripe webhooks to prevent retry loops, even for unknown payment intents
