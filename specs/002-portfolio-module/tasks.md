# Tasks: Portfolio Module

**Input**: Design documents from `/specs/002-portfolio-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the module skeleton, shared utilities, and database table

- [X] T001 Create portfolio module directory structure: `src/portfolio/`, `src/portfolio/schema/`, `src/portfolio/dto/`
- [X] T002 [P] Create shared slug utility in `src/common/utils/slug.util.ts` with `generateSlug(title)` and `generateUniqueSlug(title, repository)` functions (skip if already created by 001-services-module)
- [X] T003 [P] Create Project entity in `src/portfolio/schema/project.schema.ts` with all columns (id uuid PK, title, slug unique, shortDescription, longDescription, coverImageUrl, images text[], techStack text[], category, liveUrl, repoUrl, isPublished, isFeatured, order, createdAt, updatedAt) and composite index on `[isPublished, order]`
- [X] T004 Register Project entity in `src/config/database.config.ts` entities array
- [X] T005 Generate TypeORM migration by running `npm run migration:generate --name=CreateProjectsTable`
- [X] T006 Run migration with `npm run migration:run` to create the projects table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the module, DTOs, and service layer skeleton that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create `CreateProjectDto` in `src/portfolio/dto/create-project.dto.ts` with title (required, max 200), shortDescription (required), longDescription (optional), coverImageUrl (optional), images (optional string[]), techStack (optional string[]), category (optional, max 100), liveUrl (optional), repoUrl (optional) — all with @ApiProperty decorators
- [X] T008 [P] Create `UpdateProjectDto` in `src/portfolio/dto/update-project.dto.ts` extending `PartialType(CreateProjectDto)`
- [X] T009 [P] Create `ReorderProjectsDto` in `src/portfolio/dto/reorder-projects.dto.ts` with `items` array of `{ id: uuid, order: int }` using @ValidateNested and @Type decorators
- [X] T010 [P] Create `FilterProjectsQueryDto` in `src/portfolio/dto/filter-projects-query.dto.ts` with `category` (optional string), `techStack` (optional comma-separated string[] via @Transform), `featured` (optional boolean via @Transform)
- [X] T011 Create `PortfolioService` skeleton in `src/portfolio/portfolio.service.ts` — inject `Repository<Project>` via `@InjectRepository` and `ConfigService` via constructor injection
- [X] T012 Create `PortfolioController` skeleton in `src/portfolio/portfolio.controller.ts` — route prefix `admin/portfolio`, inject `PortfolioService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [X] T013 [P] Create `PortfolioPublicController` skeleton in `src/portfolio/portfolio.public.controller.ts` — route prefix `portfolio`, inject `PortfolioService`, add `@Public()` decorator at class level
- [X] T014 Create `PortfolioModule` in `src/portfolio/portfolio.module.ts` — import `TypeOrmModule.forFeature([Project])`, register both controllers and service
- [X] T015 Register `PortfolioModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoints yet

---

## Phase 3: User Story 1 — Admin Creates a New Project (Priority: P1) 🎯 MVP

**Goal**: Admins can create projects with auto-generated slugs, tech stack arrays, and category; projects start as unpublished

**Independent Test**: POST to `/admin/portfolio` with title, shortDescription, techStack, and category → verify project created with correct slug, `isPublished = false`, `isFeatured = false`, and timestamps

### Implementation for User Story 1

- [X] T016 [US1] Implement `create(dto: CreateProjectDto)` method in `src/portfolio/portfolio.service.ts` — generate slug from title using shared `generateUniqueSlug()`, save entity with `isPublished = false`, `isFeatured = false`, `order = 0`, default `images = []` and `techStack = []` if not provided, return created project
- [X] T017 [US1] Wire `POST /admin/portfolio` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Body() CreateProjectDto`, call `this.portfolioService.create()`, return 201 Created with @ApiResponse decorators

**Checkpoint**: Admin can create projects with auto-generated unique slugs — US1 is fully functional

---

## Phase 4: User Story 2 — Admin Manages Project Content and Images (Priority: P1)

**Goal**: Admins can update project fields, manage images (cover + gallery), and delete projects with image cleanup

**Independent Test**: PATCH `/admin/portfolio/:id` to update fields → verify changes persist; DELETE `/admin/portfolio/:id` → verify project removed and image URLs collected for purge

### Implementation for User Story 2

- [X] T018 [US2] Implement `findOneOrFail(id: string)` private method in `src/portfolio/portfolio.service.ts` — find by UUID, throw `NotFoundException` if not found
- [X] T019 [US2] Implement `update(id: string, dto: UpdateProjectDto)` method in `src/portfolio/portfolio.service.ts` — find project, if title changed regenerate slug with uniqueness check, merge DTO fields (handle images array merge), save and return updated project
- [X] T020 [US2] Implement `remove(id: string)` method in `src/portfolio/portfolio.service.ts` — find project, collect coverImageUrl + images array for purge (log URLs, defer actual purge to Media module integration), delete from DB, return success message
- [X] T021 [US2] Wire `PATCH /admin/portfolio/:id` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Param('id', ParseUUIDPipe)` and `@Body() UpdateProjectDto`, call `this.portfolioService.update()`, return 200 OK
- [X] T022 [US2] Wire `DELETE /admin/portfolio/:id` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.portfolioService.remove()`, return 200 OK with `{ message: "Project deleted successfully" }`

**Checkpoint**: Admin can update and delete projects — US1 + US2 fully functional

---

## Phase 5: User Story 3 — Admin Controls Visibility and Featuring (Priority: P2)

**Goal**: Admins can toggle publish status (requires cover image), toggle featured flag (capped at max), and batch-reorder projects

**Independent Test**: PATCH `/admin/portfolio/:id/publish` on project with cover image → verify `isPublished` toggles; PATCH `/admin/portfolio/:id/feature` → verify `isFeatured` toggles (reject at cap); PATCH `/admin/portfolio/reorder` → verify order values update

### Implementation for User Story 3

- [X] T023 [US3] Implement `togglePublish(id: string)` method in `src/portfolio/portfolio.service.ts` — find project, if currently unpublished validate `coverImageUrl` exists (throw `BadRequestException` if missing), toggle `isPublished`, save and return `{ id, isPublished, message }`
- [X] T024 [US3] Implement `toggleFeatured(id: string)` method in `src/portfolio/portfolio.service.ts` — find project, if currently unfeatured count existing featured projects and compare to `ConfigService.get('FEATURED_PROJECTS_MAX', 6)` (throw `BadRequestException` if limit reached), toggle `isFeatured`, save and return `{ id, isFeatured, message }`
- [X] T025 [US3] Implement `reorder(dto: ReorderProjectsDto)` method in `src/portfolio/portfolio.service.ts` — use TypeORM `manager.transaction()` to update all order values atomically, return success message
- [X] T026 [US3] Wire `PATCH /admin/portfolio/:id/publish` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.portfolioService.togglePublish()`, return 200 OK
- [X] T027 [US3] Wire `PATCH /admin/portfolio/:id/feature` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.portfolioService.toggleFeatured()`, return 200 OK
- [X] T028 [US3] Wire `PATCH /admin/portfolio/reorder` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Body() ReorderProjectsDto`, call `this.portfolioService.reorder()`, return 200 OK — **⚠️ IMPORTANT**: Register this route BEFORE the `:id` routes to avoid path collision

**Checkpoint**: Publish/unpublish, featuring, and reorder work — US1 + US2 + US3 fully functional

---

## Phase 6: User Story 4 — Visitor Browses and Filters Published Projects (Priority: P2)

**Goal**: Public visitors can list published projects with category/tech stack/featured filters, and view a single project by slug

**Independent Test**: GET `/portfolio` → verify only published projects returned sorted by order; GET `/portfolio?category=Mobile` → verify filtered results; GET `/portfolio?techStack=React` → verify tech stack filtering; GET `/portfolio/:slug` → verify project details returned; unpublished slug returns 404

### Implementation for User Story 4

- [X] T029 [US4] Implement `findPublished(filters: FilterProjectsQueryDto)` method in `src/portfolio/portfolio.service.ts` — query `{ where: { isPublished: true }, order: { order: 'ASC' } }`, apply optional filters: category via `ILIKE`, techStack via array overlap (`&&` operator or `ANY`), featured via `{ isFeatured: true }`, return array of published projects
- [X] T030 [US4] Implement `findBySlug(slug: string)` method in `src/portfolio/portfolio.service.ts` — query `{ where: { slug, isPublished: true } }`, throw `NotFoundException` if not found (covers both non-existent and unpublished)
- [X] T031 [US4] Wire `GET /portfolio` endpoint in `src/portfolio/portfolio.public.controller.ts` — accept `@Query() FilterProjectsQueryDto`, call `this.portfolioService.findPublished()`, return 200 OK with `{ data: [...] }`
- [X] T032 [US4] Wire `GET /portfolio/:slug` endpoint in `src/portfolio/portfolio.public.controller.ts` — accept `@Param('slug')`, call `this.portfolioService.findBySlug()`, return 200 OK with project object

**Checkpoint**: Public-facing endpoints work — visitors can browse, filter, and view projects

---

## Phase 7: User Story 5 — Admin Lists All Projects in Dashboard (Priority: P3)

**Goal**: Admins can list all projects (published + unpublished) with pagination and sorting

**Independent Test**: GET `/admin/portfolio?page=1&limit=10&sortBy=createdAt&order=DESC` → verify paginated results with correct metadata

### Implementation for User Story 5

- [X] T033 [US5] Implement `findAll(query: PaginationQueryDto)` method in `src/portfolio/portfolio.service.ts` — use `findAndCount()` with `skip: (page-1)*limit`, `take: limit`, dynamic `order` from sortBy/order params, return `{ data, meta: { page, limit, total, totalPages } }`
- [X] T034 [US5] Wire `GET /admin/portfolio` endpoint in `src/portfolio/portfolio.controller.ts` — accept `@Query() PaginationQueryDto` (with `ValidationPipe` implicit), call `this.portfolioService.findAll()`, return 200 OK with paginated response

**Checkpoint**: Admin dashboard listing works with full pagination — all 5 user stories functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation, validation, and final verification

- [X] T035 [P] Add Swagger `@ApiTags('Portfolio')` to `PortfolioController` and `@ApiTags('Portfolio (Public)')` to `PortfolioPublicController` in their respective files
- [X] T036 [P] Add `@ApiOperation()` and `@ApiResponse()` decorators to all 9 endpoints across `src/portfolio/portfolio.controller.ts` and `src/portfolio/portfolio.public.controller.ts`
- [X] T037 [P] Add `@ApiParam()` decorators for `:id` and `:slug` path parameters across both controller files
- [X] T038 Validate all endpoints against contracts by running through the quickstart.md curl commands in `specs/002-portfolio-module/quickstart.md`
- [X] T039 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion
  - **US1 (Phase 3)**: Independent — can start after Phase 2
  - **US2 (Phase 4)**: Depends on US1 (`findOneOrFail` pattern, but independently testable)
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
- **Phase 2**: T008 + T009 + T010 can run in parallel; T012 + T013 can run in parallel (different files)
- **Phase 3–7**: User stories 3, 4, 5 can theoretically run in parallel since they touch different service methods
- **Phase 8**: T035 + T036 + T037 can all run in parallel (different decorators, different files)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch in parallel (different files):
Task: "Create shared slug utility in src/common/utils/slug.util.ts"
Task: "Create Project entity in src/portfolio/schema/project.schema.ts"
```

## Parallel Example: Phase 2 DTOs

```bash
# Launch in parallel (different DTO files):
Task: "Create UpdateProjectDto in src/portfolio/dto/update-project.dto.ts"
Task: "Create ReorderProjectsDto in src/portfolio/dto/reorder-projects.dto.ts"
Task: "Create FilterProjectsQueryDto in src/portfolio/dto/filter-projects-query.dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T015)
3. Complete Phase 3: User Story 1 — Create (T016–T017)
4. **STOP and VALIDATE**: Test creating projects with auto-generated slugs
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US1 (Create) → Test independently → **MVP ready!**
3. Add US2 (Update/Delete/Images) → Test independently → Full CRUD
4. Add US3 (Publish/Feature/Reorder) → Test independently → Content management
5. Add US4 (Public endpoints + Filtering) → Test independently → Public-facing
6. Add US5 (Admin listing) → Test independently → Dashboard ready
7. Polish → Swagger docs + final verification

### Parallel Team Strategy

With multiple developers after Phase 2:
- Developer A: US1 (Create) + US2 (Update/Delete)
- Developer B: US3 (Publish/Feature/Reorder) + US4 (Public endpoints)
- Developer C: US5 (Admin listing) + Polish

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 39 |
| Phase 1 (Setup) | 6 tasks |
| Phase 2 (Foundational) | 9 tasks |
| Phase 3 (US1 — Create) | 2 tasks |
| Phase 4 (US2 — Update/Delete/Images) | 5 tasks |
| Phase 5 (US3 — Publish/Feature/Reorder) | 6 tasks |
| Phase 6 (US4 — Public Browsing/Filtering) | 4 tasks |
| Phase 7 (US5 — Admin Listing) | 2 tasks |
| Phase 8 (Polish) | 5 tasks |
| Parallel opportunities | 4 phases with parallelizable tasks |
| MVP scope | Phase 1 + 2 + 3 (T001–T017) |

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `reorder` route MUST be registered before `:id` params in the controller to avoid NestJS treating "reorder" as a UUID
- Image purge in `remove()` (T020) is noted as deferred — full integration comes when 010-media-storage-module is implemented
- `FEATURED_PROJECTS_MAX` defaults to 6, read from env via `ConfigService`
