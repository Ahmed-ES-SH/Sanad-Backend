# Tasks: Contact Module

**Input**: Design documents from `/specs/006-contact-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the module skeleton and entity

- [ ] T001 Create contact module directory structure: `src/contact/`, `src/contact/schema/`, `src/contact/dto/`
- [ ] T002 Create ContactMessage entity in `src/contact/schema/contact-message.schema.ts` with all columns (id uuid PK, fullName, email, subject, message, isRead default false, repliedAt nullable, ipAddress nullable, createdAt, updatedAt) and indexes on `is_read` and `created_at`
- [ ] T003 Register ContactMessage entity in `src/config/database.config.ts` entities array
- [ ] T004 Generate TypeORM migration by running `npm run migration:generate --name=CreateContactMessagesTable`
- [ ] T005 Run migration with `npm run migration:run` to create the contact_messages table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the module, DTOs, and service layer skeleton that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create `CreateContactMessageDto` in `src/contact/dto/create-contact-message.dto.ts` with fullName (required, max 100), email (required, @IsEmail, max 255), subject (required, max 200), message (required) — all with @ApiProperty decorators
- [ ] T007 [P] Create `ContactQueryDto` in `src/contact/dto/contact-query.dto.ts` extending `PaginationQueryDto` from `src/common/dto/pagination-query.dto.ts` with optional `isRead` boolean filter using @Transform for query string parsing
- [ ] T008 Create `ContactService` skeleton in `src/contact/contact.service.ts` — inject `Repository<ContactMessage>` via `@InjectRepository`
- [ ] T009 Create `ContactController` skeleton in `src/contact/contact.controller.ts` — route prefix `admin/contact`, inject `ContactService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [ ] T010 [P] Create `ContactPublicController` skeleton in `src/contact/contact.public.controller.ts` — route prefix `contact`, inject `ContactService`, add `@Public()` decorator at class level
- [ ] T011 Create `ContactModule` in `src/contact/contact.module.ts` — import `TypeOrmModule.forFeature([ContactMessage])`, register both controllers and service
- [ ] T012 Register `ContactModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoints yet

---

## Phase 3: User Story 1 — Visitor Submits a Contact Message (Priority: P1) 🎯 MVP

**Goal**: Visitors can submit contact messages via a public endpoint with validation and IP-based rate limiting

**Independent Test**: POST to `/contact` with fullName, email, subject, and message → verify message stored with `isRead = false`, `repliedAt = null`; submit 6th message within 1 hour → verify 429 rejection

### Implementation for User Story 1

- [ ] T013 [US1] Implement `create(dto: CreateContactMessageDto, ipAddress: string)` method in `src/contact/contact.service.ts` — create entity with `isRead = false`, `repliedAt = null`, store `ipAddress`, save and return `{ message: "Your message has been sent successfully", id }`
- [ ] T014 [US1] Wire `POST /contact` endpoint in `src/contact/contact.public.controller.ts` — accept `@Body() CreateContactMessageDto`, extract IP from `@Req()` request object (`request.ip`), call `this.contactService.create()`, return 201 Created with @ApiResponse decorators
- [ ] T015 [US1] Add `@Throttle({ default: { ttl: 3600000, limit: 5 } })` decorator to the `POST /contact` endpoint in `src/contact/contact.public.controller.ts` to override the global throttler with 5 requests per hour per IP

**Checkpoint**: Visitors can submit contact messages with rate limiting enforced — US1 is fully functional

---

## Phase 4: User Story 2 — Admin Reviews and Manages Messages (Priority: P1)

**Goal**: Admins can list messages with pagination and read/unread filtering, view a single message, mark as read, and delete messages

**Independent Test**: GET `/admin/contact?isRead=false` → verify only unread messages returned; PATCH `/admin/contact/:id/read` → verify `isRead = true`; DELETE `/admin/contact/:id` → verify message permanently removed; GET `/admin/contact/:nonexistent` → verify 404

### Implementation for User Story 2

- [ ] T016 [US2] Implement `findOneOrFail(id: string)` private method in `src/contact/contact.service.ts` — find by UUID, throw `NotFoundException('Contact message not found')` if not found
- [ ] T017 [US2] Implement `findAll(query: ContactQueryDto)` method in `src/contact/contact.service.ts` — use `findAndCount()` with `skip: (page-1)*limit`, `take: limit`, dynamic `order` from sortBy/order params, conditionally add `where: { isRead }` if `isRead` filter is provided, return `{ data, meta: { page, limit, total, totalPages } }`
- [ ] T018 [US2] Implement `findOne(id: string)` method in `src/contact/contact.service.ts` — call `findOneOrFail()`, return full message details
- [ ] T019 [US2] Implement `markAsRead(id: string)` method in `src/contact/contact.service.ts` — call `findOneOrFail()`, set `isRead = true`, save, return `{ id, isRead: true, message: "Message marked as read" }`
- [ ] T020 [US2] Implement `remove(id: string)` method in `src/contact/contact.service.ts` — call `findOneOrFail()`, use `repository.remove()` for hard delete, return `{ message: "Contact message deleted successfully" }`
- [ ] T021 [US2] Wire `GET /admin/contact` endpoint in `src/contact/contact.controller.ts` — accept `@Query() ContactQueryDto` (with `ValidationPipe` implicit), call `this.contactService.findAll()`, return 200 OK with paginated response
- [ ] T022 [US2] Wire `GET /admin/contact/:id` endpoint in `src/contact/contact.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.contactService.findOne()`, return 200 OK
- [ ] T023 [US2] Wire `PATCH /admin/contact/:id/read` endpoint in `src/contact/contact.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.contactService.markAsRead()`, return 200 OK
- [ ] T024 [US2] Wire `DELETE /admin/contact/:id` endpoint in `src/contact/contact.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.contactService.remove()`, return 200 OK with `{ message: "Contact message deleted successfully" }`

**Checkpoint**: Admin can list, filter, view, mark as read, and delete messages — US1 + US2 fully functional

---

## Phase 5: User Story 3 — Admin Tracks Replies (Priority: P2)

**Goal**: Admins can mark a message as replied, which sets `replied_at` to the current timestamp and automatically sets `is_read = true`

**Independent Test**: PATCH `/admin/contact/:id/reply` on a message with `repliedAt = null` → verify `repliedAt` is set to current timestamp and `isRead = true`; repeat on same message → verify `repliedAt` is updated to new timestamp

### Implementation for User Story 3

- [ ] T025 [US3] Implement `markAsReplied(id: string)` method in `src/contact/contact.service.ts` — call `findOneOrFail()`, set `repliedAt = new Date()`, set `isRead = true` (per edge case requirement), save, return `{ id, isRead: true, repliedAt, message: "Message marked as replied" }`
- [ ] T026 [US3] Wire `PATCH /admin/contact/:id/reply` endpoint in `src/contact/contact.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.contactService.markAsReplied()`, return 200 OK — **⚠️ IMPORTANT**: Register `read` and `reply` routes BEFORE generic `:id` routes to avoid path collision

**Checkpoint**: Reply tracking works — all 3 user stories are fully functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation, validation, and final verification

- [ ] T027 [P] Add Swagger `@ApiTags('Contact (Admin)')` to `ContactController` and `@ApiTags('Contact (Public)')` to `ContactPublicController` in their respective files
- [ ] T028 [P] Add `@ApiOperation()` and `@ApiResponse()` decorators to all 6 endpoints across `src/contact/contact.controller.ts` and `src/contact/contact.public.controller.ts`
- [ ] T029 [P] Add `@ApiParam()` decorators for `:id` path parameters across `src/contact/contact.controller.ts`
- [ ] T030 Validate all endpoints against contracts by running through the quickstart.md curl commands in `specs/006-contact-module/quickstart.md`
- [ ] T031 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - **US1 (Phase 3)**: Independent — can start after Phase 2
  - **US2 (Phase 4)**: Depends on US1 completion (`findOneOrFail` pattern used by US2 and US3)
  - **US3 (Phase 5)**: Depends on US2 completion (uses `findOneOrFail` from US2)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — Introduces `findOneOrFail` shared by US3
- **US3 (P2)**: Depends on US2 — Uses `findOneOrFail` pattern from US2

### Within Each User Story

- Service methods before controller wiring
- Core logic before edge case handling

### Parallel Opportunities

- **Phase 1**: Entity creation is independent and blocking — sequential
- **Phase 2**: T006 + T007 can run in parallel; T009 + T010 can run in parallel (different files)
- **Phase 3**: Sequential — small phase (3 tasks)
- **Phase 4–5**: Must be sequential (US3 depends on US2's `findOneOrFail`)
- **Phase 6**: T027 + T028 + T029 can all run in parallel (different decorators)

---

## Parallel Example: Phase 2 DTOs

```bash
# Launch in parallel (different files):
Task: "Create CreateContactMessageDto in src/contact/dto/create-contact-message.dto.ts"
Task: "Create ContactQueryDto in src/contact/dto/contact-query.dto.ts"
```

## Parallel Example: Phase 2 Controllers

```bash
# Launch in parallel (different controller files):
Task: "Create ContactController skeleton in src/contact/contact.controller.ts"
Task: "Create ContactPublicController skeleton in src/contact/contact.public.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T012)
3. Complete Phase 3: User Story 1 — Submit (T013–T015)
4. **STOP and VALIDATE**: Test submitting contact messages with rate limiting
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US1 (Submit) → Test independently → **MVP ready!**
3. Add US2 (List/View/Read/Delete) → Test independently → Full inbox management
4. Add US3 (Reply tracking) → Test independently → Complete workflow
5. Polish → Swagger docs + final verification

### Parallel Team Strategy

With multiple developers after Phase 2:
- Developer A: US1 (Public submission + rate limiting)
- Developer B: US2 (Admin management — list, view, read, delete)
- Developer C: US3 (Reply tracking) — starts after US2

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 31 |
| **Phase 1 (Setup)** | 5 tasks |
| **Phase 2 (Foundational)** | 7 tasks |
| **Phase 3 (US1 — Submit)** | 3 tasks |
| **Phase 4 (US2 — Manage)** | 9 tasks |
| **Phase 5 (US3 — Reply)** | 2 tasks |
| **Phase 6 (Polish)** | 5 tasks |
| **Parallel Opportunities** | 4 groups identified |
| **MVP Scope** | Phase 1 + 2 + 3 (15 tasks) |

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `read` and `reply` routes MUST be registered before generic `:id` routes in the controller to avoid NestJS treating "read"/"reply" as a UUID
- Rate limiting uses `@Throttle()` decorator override — the existing global `ThrottlerGuard` handles enforcement; no new dependencies needed
- Hard delete via `repository.remove()` — no soft-delete pattern per spec assumptions
- The `PaginationQueryDto` from `src/common/dto/pagination-query.dto.ts` is assumed to exist (created by 001-services-module)
