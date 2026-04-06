# Tasks: Services Module

**Input**: Design documents from `/specs/001-services-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the module skeleton and shared utilities

- [ ] T001 Create services module directory structure: `src/services/`, `src/services/schema/`, `src/services/dto/`
- [ ] T002 [P] Create shared pagination DTO in `src/common/dto/pagination-query.dto.ts` with `page`, `limit`, `sortBy`, `order` fields using class-validator decorators
- [ ] T003 [P] Create Service entity in `src/services/schema/service.schema.ts` with all columns (id uuid PK, title, slug unique, shortDescription, longDescription, iconUrl, coverImageUrl, isPublished, order, createdAt, updatedAt) and composite index on `[isPublished, order]`
- [ ] T004 Register Service entity in `src/config/database.config.ts` entities array
- [ ] T005 Generate TypeORM migration by running `npm run migration:generate --name=CreateServicesTable`
- [ ] T006 Run migration with `npm run migration:run` to create the services table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the module, DTOs, and service layer skeleton that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create `CreateServiceDto` in `src/services/dto/create-service.dto.ts` with title (required, max 150), shortDescription (required), longDescription (optional), iconUrl (optional), coverImageUrl (optional) — all with @ApiProperty decorators
- [ ] T008 [P] Create `UpdateServiceDto` in `src/services/dto/update-service.dto.ts` extending `PartialType(CreateServiceDto)`
- [ ] T009 [P] Create `ReorderServicesDto` in `src/services/dto/reorder-services.dto.ts` with `items` array of `{ id: uuid, order: int }` using @ValidateNested and @Type decorators
- [ ] T010 Create `ServicesService` skeleton in `src/services/services.service.ts` — inject `Repository<Service>` via `@InjectRepository`, add private `generateSlug()` utility method
- [ ] T011 Create `ServicesController` skeleton in `src/services/services.controller.ts` — route prefix `admin/services`, inject `ServicesService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [ ] T012 [P] Create `ServicesPublicController` skeleton in `src/services/services.public.controller.ts` — route prefix `services`, inject `ServicesService`, add `@Public()` decorator at class level
- [ ] T013 Create `ServicesModule` in `src/services/services.module.ts` — import `TypeOrmModule.forFeature([Service])`, register both controllers and service
- [ ] T014 Register `ServicesModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoints yet

---

## Phase 3: User Story 1 — Admin Creates a New Service (Priority: P1) 🎯 MVP

**Goal**: Admins can create services with auto-generated slugs; services start as unpublished

**Independent Test**: POST to `/admin/services` with title and shortDescription → verify service created with correct slug, `isPublished = false`, and timestamps

### Implementation for User Story 1

- [ ] T015 [US1] Implement `generateSlug(title: string)` private method in `src/services/services.service.ts` — lowercase, replace whitespace with hyphens, strip non-alphanumeric chars
- [ ] T016 [US1] Implement `ensureUniqueSlug(slug: string)` private method in `src/services/services.service.ts` — query DB for existing slugs with same base, append `-N` suffix if duplicate found
- [ ] T017 [US1] Implement `create(dto: CreateServiceDto)` method in `src/services/services.service.ts` — generate slug from title, ensure uniqueness, save entity with `isPublished = false` and `order = 0`, return created service
- [ ] T018 [US1] Wire `POST /admin/services` endpoint in `src/services/services.controller.ts` — accept `@Body() CreateServiceDto`, call `this.servicesService.create()`, return 201 Created with @ApiResponse decorators

**Checkpoint**: Admin can create services with auto-generated unique slugs — US1 is fully functional

---

## Phase 4: User Story 2 — Admin Manages Service Content (Priority: P1)

**Goal**: Admins can update service fields and delete services (including image purge)

**Independent Test**: PATCH `/admin/services/:id` to update fields → verify changes persist; DELETE `/admin/services/:id` → verify service removed

### Implementation for User Story 2

- [ ] T019 [US2] Implement `findOneOrFail(id: string)` private method in `src/services/services.service.ts` — find by UUID, throw `NotFoundException` if not found
- [ ] T020 [US2] Implement `update(id: string, dto: UpdateServiceDto)` method in `src/services/services.service.ts` — find service, if title changed regenerate slug with uniqueness check, merge DTO fields, save and return updated service
- [ ] T021 [US2] Implement `remove(id: string)` method in `src/services/services.service.ts` — find service, delete from DB, return success message (image purge deferred to Media module integration)
- [ ] T022 [US2] Wire `PATCH /admin/services/:id` endpoint in `src/services/services.controller.ts` — accept `@Param('id', ParseUUIDPipe)` and `@Body() UpdateServiceDto`, call `this.servicesService.update()`, return 200 OK
- [ ] T023 [US2] Wire `DELETE /admin/services/:id` endpoint in `src/services/services.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.servicesService.remove()`, return 200 OK with `{ message: "Service deleted successfully" }`

**Checkpoint**: Admin can update and delete services — US1 + US2 fully functional

---

## Phase 5: User Story 3 — Admin Publishes and Reorders Services (Priority: P2)

**Goal**: Admins can toggle publish status (with validation) and batch-reorder services

**Independent Test**: PATCH `/admin/services/:id/publish` on complete service → verify `isPublished` toggles; PATCH `/admin/services/reorder` → verify order values update

### Implementation for User Story 3

- [ ] T024 [US3] Implement `togglePublish(id: string)` method in `src/services/services.service.ts` — find service, if currently unpublished validate title + shortDescription exist (throw `BadRequestException` if missing), toggle `isPublished`, save and return `{ id, isPublished, message }`
- [ ] T025 [US3] Implement `reorder(dto: ReorderServicesDto)` method in `src/services/services.service.ts` — use TypeORM `manager.transaction()` to update all order values atomically, return success message
- [ ] T026 [US3] Wire `PATCH /admin/services/:id/publish` endpoint in `src/services/services.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.servicesService.togglePublish()`, return 200 OK
- [ ] T027 [US3] Wire `PATCH /admin/services/reorder` endpoint in `src/services/services.controller.ts` — accept `@Body() ReorderServicesDto`, call `this.servicesService.reorder()`, return 200 OK — **⚠️ IMPORTANT**: Register this route BEFORE the `:id` routes to avoid path collision

**Checkpoint**: Publish/unpublish and reorder work — US1 + US2 + US3 fully functional

---

## Phase 6: User Story 4 — Visitor Browses Published Services (Priority: P2)

**Goal**: Public visitors can list published services and view a single service by slug

**Independent Test**: GET `/services` → verify only published services returned sorted by order; GET `/services/:slug` → verify service details returned; unpublished slug returns 404

### Implementation for User Story 4

- [ ] T028 [US4] Implement `findPublished()` method in `src/services/services.service.ts` — query `{ where: { isPublished: true }, order: { order: 'ASC' } }`, return array of published services
- [ ] T029 [US4] Implement `findBySlug(slug: string)` method in `src/services/services.service.ts` — query `{ where: { slug, isPublished: true } }`, throw `NotFoundException` if not found (covers both non-existent and unpublished)
- [ ] T030 [US4] Wire `GET /services` endpoint in `src/services/services.public.controller.ts` — call `this.servicesService.findPublished()`, return 200 OK with `{ data: [...] }`
- [ ] T031 [US4] Wire `GET /services/:slug` endpoint in `src/services/services.public.controller.ts` — accept `@Param('slug')`, call `this.servicesService.findBySlug()`, return 200 OK with service object

**Checkpoint**: Public-facing endpoints work — visitors can browse and view services

---

## Phase 7: User Story 5 — Admin Views All Services in Dashboard (Priority: P3)

**Goal**: Admins can list all services (published + unpublished) with pagination and sorting

**Independent Test**: GET `/admin/services?page=1&limit=10&sortBy=createdAt&order=DESC` → verify paginated results with correct metadata

### Implementation for User Story 5

- [ ] T032 [US5] Implement `findAll(query: PaginationQueryDto)` method in `src/services/services.service.ts` — use `findAndCount()` with `skip: (page-1)*limit`, `take: limit`, dynamic `order` from sortBy/order params, return `{ data, meta: { page, limit, total, totalPages } }`
- [ ] T033 [US5] Wire `GET /admin/services` endpoint in `src/services/services.controller.ts` — accept `@Query() PaginationQueryDto` (with `ValidationPipe` implicit), call `this.servicesService.findAll()`, return 200 OK with paginated response

**Checkpoint**: Admin dashboard listing works with full pagination — all 5 user stories functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation, validation, and final verification

- [ ] T034 [P] Add Swagger `@ApiTags('Services')` to `ServicesController` and `@ApiTags('Services (Public)')` to `ServicesPublicController` in their respective files
- [ ] T035 [P] Add `@ApiOperation()` and `@ApiResponse()` decorators to all 8 endpoints across `src/services/services.controller.ts` and `src/services/services.public.controller.ts`
- [ ] T036 [P] Add `@ApiParam()` decorators for `:id` and `:slug` path parameters across both controller files
- [ ] T037 Validate all endpoints against contracts by running through the quickstart.md curl commands in `specs/001-services-module/quickstart.md`
- [ ] T038 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion
  - **US1 (Phase 3)**: Independent — can start after Phase 2
  - **US2 (Phase 4)**: Depends on US1 (`findOneOrFail` pattern, but it's within the same service file)
  - **US3 (Phase 5)**: Independent of US1/US2 (uses own service methods)
  - **US4 (Phase 6)**: Independent of US1–US3 (public endpoints, own service methods)
  - **US5 (Phase 7)**: Independent of US1–US4 (admin listing, own service method)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — Shares `findOneOrFail` pattern but independently testable
- **US3 (P2)**: Can start after Phase 2 — Independently testable
- **US4 (P2)**: Can start after Phase 2 — Independently testable
- **US5 (P3)**: Can start after Phase 2 — Independently testable

### Within Each User Story

- Service methods before controller wiring
- Core logic before edge case handling

### Parallel Opportunities

- **Phase 1**: T002 + T003 can run in parallel (different files)
- **Phase 2**: T008 + T009 can run in parallel; T011 + T012 can run in parallel (different files)
- **Phase 3–7**: User stories 3, 4, 5 can theoretically run in parallel since they touch different service methods
- **Phase 8**: T034 + T035 + T036 can all run in parallel (different decorators, different files)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch in parallel (different files):
Task: "Create shared pagination DTO in src/common/dto/pagination-query.dto.ts"
Task: "Create Service entity in src/services/schema/service.schema.ts"
```

## Parallel Example: Phase 2 DTOs

```bash
# Launch in parallel (different DTO files):
Task: "Create UpdateServiceDto in src/services/dto/update-service.dto.ts"
Task: "Create ReorderServicesDto in src/services/dto/reorder-services.dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T014)
3. Complete Phase 3: User Story 1 — Create (T015–T018)
4. **STOP and VALIDATE**: Test creating services with auto-generated slugs
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US1 (Create) → Test independently → **MVP ready!**
3. Add US2 (Update/Delete) → Test independently → Full CRUD
4. Add US3 (Publish/Reorder) → Test independently → Content management
5. Add US4 (Public endpoints) → Test independently → Public-facing
6. Add US5 (Admin listing) → Test independently → Dashboard ready
7. Polish → Swagger docs + final verification

### Parallel Team Strategy

With multiple developers after Phase 2:
- Developer A: US1 (Create) + US2 (Update/Delete)
- Developer B: US3 (Publish/Reorder) + US4 (Public endpoints)
- Developer C: US5 (Admin listing) + Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `reorder` route MUST be registered before `:id` params in the controller to avoid NestJS treating "reorder" as a UUID
- Image purge in `remove()` (T021) is noted as deferred — full integration comes when 010-media-storage-module is implemented
