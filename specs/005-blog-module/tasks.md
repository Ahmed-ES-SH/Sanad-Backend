# Tasks: Blog Module

**Input**: Design documents from `/specs/005-blog-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the module skeleton and database table

- [ ] T001 Create blog module directory structure: `src/blog/`, `src/blog/schema/`, `src/blog/dto/`
- [ ] T002 Create Article entity in `src/blog/schema/article.schema.ts` with all columns (id uuid PK, title, slug unique, excerpt, content, coverImageUrl, tags text[], isPublished, publishedAt, readTimeMinutes, viewsCount, createdAt, updatedAt) and composite index on `[isPublished, publishedAt]`
- [ ] T003 Register Article entity in `src/config/database.config.ts` entities array
- [ ] T004 Generate TypeORM migration by running `npm run migration:generate --name=CreateArticlesTable`
- [ ] T005 Run migration with `npm run migration:run` to create the articles table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the module, DTOs, and service layer skeleton that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create `CreateArticleDto` in `src/blog/dto/create-article.dto.ts` with title (required, max 300), content (required), excerpt (optional), coverImageUrl (optional), tags (optional string[]) — all with @ApiProperty decorators
- [ ] T007 [P] Create `UpdateArticleDto` in `src/blog/dto/update-article.dto.ts` extending `PartialType(CreateArticleDto)`
- [ ] T008 [P] Create `FilterArticlesQueryDto` in `src/blog/dto/filter-articles-query.dto.ts` with `tag` (optional string)
- [ ] T009 Create `BlogService` skeleton in `src/blog/blog.service.ts` — inject `Repository<Article>` via `@InjectRepository`, add private `calculateReadTime(content: string): number` method that strips HTML tags and calculates `Math.max(1, Math.ceil(wordCount / 200))`
- [ ] T010 Create `BlogController` skeleton in `src/blog/blog.controller.ts` — route prefix `admin/blog`, inject `BlogService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [ ] T011 [P] Create `BlogPublicController` skeleton in `src/blog/blog.public.controller.ts` — route prefix `blog`, inject `BlogService`, add `@Public()` decorator at class level
- [ ] T012 Create `BlogModule` in `src/blog/blog.module.ts` — import `TypeOrmModule.forFeature([Article])`, register both controllers and service
- [ ] T013 Register `BlogModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoints yet

---

## Phase 3: User Story 1 — Admin Creates and Edits Articles (Priority: P1) 🎯 MVP

**Goal**: Admins can create articles with auto-generated slugs and auto-calculated read time, and update article fields with read time recalculation on content change

**Independent Test**: POST to `/admin/blog` with title and content (1000 words) → verify article created with correct slug, `readTimeMinutes = 5`, `isPublished = false`, `viewsCount = 0`; PATCH to `/admin/blog/:id` with updated content (2000 words) → verify `readTimeMinutes` recalculated to 10

### Implementation for User Story 1

- [ ] T014 [US1] Implement `create(dto: CreateArticleDto)` method in `src/blog/blog.service.ts` — generate slug from title using shared `generateUniqueSlug()`, calculate `readTimeMinutes` from content, save entity with `isPublished = false`, `publishedAt = null`, `viewsCount = 0`, default `tags = []` if not provided, return created article
- [ ] T015 [US1] Implement `findOneOrFail(id: string)` private method in `src/blog/blog.service.ts` — find by UUID, throw `NotFoundException` if not found
- [ ] T016 [US1] Implement `update(id: string, dto: UpdateArticleDto)` method in `src/blog/blog.service.ts` — find article, if title changed regenerate slug with uniqueness check, if content changed recalculate `readTimeMinutes`, merge DTO fields, save and return updated article
- [ ] T017 [US1] Wire `POST /admin/blog` endpoint in `src/blog/blog.controller.ts` — accept `@Body() CreateArticleDto`, call `this.blogService.create()`, return 201 Created with @ApiResponse decorators
- [ ] T018 [US1] Wire `PATCH /admin/blog/:id` endpoint in `src/blog/blog.controller.ts` — accept `@Param('id', ParseUUIDPipe)` and `@Body() UpdateArticleDto`, call `this.blogService.update()`, return 200 OK

**Checkpoint**: Admin can create and edit articles with auto slugs and read time — US1 is fully functional

---

## Phase 4: User Story 2 — Admin Publishes and Manages Articles (Priority: P1)

**Goal**: Admins can toggle publish status (requires excerpt, `publishedAt` set on first publish and never reset), and delete articles with cover image cleanup

**Independent Test**: PATCH `/admin/blog/:id/publish` on article with excerpt → verify `isPublished = true` and `publishedAt` set; unpublish → verify `publishedAt` preserved; republish → verify `publishedAt` unchanged; DELETE `/admin/blog/:id` → verify article removed

### Implementation for User Story 2

- [ ] T019 [US2] Implement `togglePublish(id: string)` method in `src/blog/blog.service.ts` — find article, if currently unpublished validate `excerpt` exists (throw `BadRequestException` if missing), toggle `isPublished`, if first publish (`publishedAt === null`) set `publishedAt = new Date()`, do NOT reset `publishedAt` on unpublish, save and return `{ id, isPublished, publishedAt, message }`
- [ ] T020 [US2] Implement `remove(id: string)` method in `src/blog/blog.service.ts` — find article, collect coverImageUrl for purge (log URL, defer actual purge to Media module integration), delete from DB, return success message
- [ ] T021 [US2] Wire `PATCH /admin/blog/:id/publish` endpoint in `src/blog/blog.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.blogService.togglePublish()`, return 200 OK
- [ ] T022 [US2] Wire `DELETE /admin/blog/:id` endpoint in `src/blog/blog.controller.ts` — accept `@Param('id', ParseUUIDPipe)`, call `this.blogService.remove()`, return 200 OK with `{ message: "Article deleted successfully" }`

**Checkpoint**: Admin can publish/unpublish and delete articles — US1 + US2 fully functional

---

## Phase 5: User Story 3 — Visitor Reads and Browses Articles (Priority: P2)

**Goal**: Public visitors can list published articles with pagination and tag filtering, and view a single article by slug with atomic view count increment

**Independent Test**: GET `/blog` → verify only published articles returned with pagination; GET `/blog?tag=NestJS` → verify filtered results; GET `/blog/:slug` → verify article returned and `viewsCount` incremented; unpublished slug returns 404

### Implementation for User Story 3

- [ ] T023 [US3] Implement `findPublished(query: PaginationQueryDto, filters: FilterArticlesQueryDto)` method in `src/blog/blog.service.ts` — query `{ where: { isPublished: true } }` with pagination (`skip/take`), apply optional tag filter using case-insensitive array containment, sort by `publishedAt DESC`, return `{ data, meta }` — **exclude `content` field from list response** for performance using `select`
- [ ] T024 [US3] Implement `findBySlug(slug: string)` method in `src/blog/blog.service.ts` — query `{ where: { slug, isPublished: true } }`, throw `NotFoundException` if not found, atomically increment `viewsCount` using `this.articleRepo.increment({ id: article.id }, 'viewsCount', 1)`, return article with incremented count
- [ ] T025 [US3] Wire `GET /blog` endpoint in `src/blog/blog.public.controller.ts` — accept `@Query() PaginationQueryDto` and `@Query() FilterArticlesQueryDto`, call `this.blogService.findPublished()`, return 200 OK with paginated response
- [ ] T026 [US3] Wire `GET /blog/:slug` endpoint in `src/blog/blog.public.controller.ts` — accept `@Param('slug')`, call `this.blogService.findBySlug()`, return 200 OK with article object

**Checkpoint**: Public-facing endpoints work — visitors can browse, filter, and read articles with view counting

---

## Phase 6: User Story 4 — Admin Lists All Articles in Dashboard (Priority: P3)

**Goal**: Admins can list all articles (published + unpublished) with pagination and sorting (including by views_count)

**Independent Test**: GET `/admin/blog?page=1&limit=10&sortBy=viewsCount&order=DESC` → verify paginated results sorted by most viewed

### Implementation for User Story 4

- [ ] T027 [US4] Implement `findAll(query: PaginationQueryDto)` method in `src/blog/blog.service.ts` — use `findAndCount()` with `skip: (page-1)*limit`, `take: limit`, dynamic `order` from sortBy/order params, return `{ data, meta: { page, limit, total, totalPages } }`
- [ ] T028 [US4] Wire `GET /admin/blog` endpoint in `src/blog/blog.controller.ts` — accept `@Query() PaginationQueryDto` (with `ValidationPipe` implicit), call `this.blogService.findAll()`, return 200 OK with paginated response

**Checkpoint**: Admin dashboard listing works with full pagination — all 4 user stories functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation, validation, and final verification

- [ ] T029 [P] Add Swagger `@ApiTags('Blog')` to `BlogController` and `@ApiTags('Blog (Public)')` to `BlogPublicController` in their respective files
- [ ] T030 [P] Add `@ApiOperation()` and `@ApiResponse()` decorators to all 7 endpoints across `src/blog/blog.controller.ts` and `src/blog/blog.public.controller.ts`
- [ ] T031 [P] Add `@ApiParam()` decorators for `:id` and `:slug` path parameters across both controller files
- [ ] T032 Validate all endpoints against contracts by running through the quickstart.md curl commands in `specs/005-blog-module/quickstart.md`
- [ ] T033 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - **US1 (Phase 3)**: Independent — can start after Phase 2
  - **US2 (Phase 4)**: Depends on US1 (`findOneOrFail` pattern, but independently testable)
  - **US3 (Phase 5)**: Independent of US1/US2 (public endpoints, own service methods)
  - **US4 (Phase 6)**: Independent of US1–US3 (admin listing, own service method)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — Shares `findOneOrFail` pattern but independently testable
- **US3 (P2)**: Can start after Phase 2 — Independently testable
- **US4 (P3)**: Can start after Phase 2 — Independently testable

### Within Each User Story

- Service methods before controller wiring
- Core logic before edge case handling

### Parallel Opportunities

- **Phase 2**: T007 + T008 can run in parallel; T010 + T011 can run in parallel (different files)
- **Phase 3–6**: User stories 3 and 4 can theoretically run in parallel since they touch different service methods
- **Phase 7**: T029 + T030 + T031 can all run in parallel (different decorators, different files)

---

## Parallel Example: Phase 2 DTOs

```bash
# Launch in parallel (different DTO files):
Task: "Create UpdateArticleDto in src/blog/dto/update-article.dto.ts"
Task: "Create FilterArticlesQueryDto in src/blog/dto/filter-articles-query.dto.ts"
```

## Parallel Example: Phase 2 Controllers

```bash
# Launch in parallel (different controller files):
Task: "Create BlogController skeleton in src/blog/blog.controller.ts"
Task: "Create BlogPublicController skeleton in src/blog/blog.public.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T013)
3. Complete Phase 3: User Story 1 — Create & Edit (T014–T018)
4. **STOP and VALIDATE**: Test creating articles with auto slugs and read time calculation
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US1 (Create/Edit) → Test independently → **MVP ready!**
3. Add US2 (Publish/Delete) → Test independently → Content management
4. Add US3 (Public endpoints + View counting) → Test independently → Public-facing
5. Add US4 (Admin listing) → Test independently → Dashboard ready
6. Polish → Swagger docs + final verification

### Parallel Team Strategy

With multiple developers after Phase 2:
- Developer A: US1 (Create/Edit) + US2 (Publish/Delete)
- Developer B: US3 (Public endpoints) + US4 (Admin listing)
- Developer C: Polish

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 33 |
| Phase 1 (Setup) | 5 tasks |
| Phase 2 (Foundational) | 8 tasks |
| Phase 3 (US1 — Create/Edit) | 5 tasks |
| Phase 4 (US2 — Publish/Delete) | 4 tasks |
| Phase 5 (US3 — Public Read/Browse/Views) | 4 tasks |
| Phase 6 (US4 — Admin Listing) | 2 tasks |
| Phase 7 (Polish) | 5 tasks |
| Parallel opportunities | 3 phases with parallelizable tasks |
| MVP scope | Phase 1 + 2 + 3 (T001–T018) |

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Read time calculation: `Math.max(1, Math.ceil(wordCount / 200))` — strip HTML tags before counting
- View count uses `repository.increment()` for atomic updates — no read-modify-write race conditions
- `publishedAt` is set once on first publish and NEVER reset — this is a spec requirement (FR-007)
- Image purge in `remove()` (T020) is noted as deferred — full integration comes when 010-media-storage-module is implemented
- Public article listing excludes `content` field for performance — full content only on single article fetch
