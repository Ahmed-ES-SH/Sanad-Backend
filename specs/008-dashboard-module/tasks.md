# Tasks: Dashboard Module

**Input**: Design documents from `/specs/008-dashboard-module/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the module skeleton, response DTO, and directory structure

- [ ] T001 Create dashboard module directory structure: `src/dashboard/`, `src/dashboard/dto/`
- [ ] T002 [P] Create `DashboardStatsDto` in `src/dashboard/dto/dashboard-stats.dto.ts` with all @ApiProperty fields: totalProjects, publishedProjects, totalArticles, publishedArticles, totalServices, publishedServices, unreadMessages, totalPayments, totalRevenue, totalUsers, and optional errors array

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the module, service skeleton, and controller that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create `DashboardService` skeleton in `src/dashboard/dashboard.service.ts` — inject repositories for Service, Project, Article, ContactMessage, Payment, User entities via `@InjectRepository` for each
- [ ] T004 Create `DashboardController` skeleton in `src/dashboard/dashboard.controller.ts` — route prefix `admin/dashboard`, inject `DashboardService`, add `@Roles(UserRoleEnum.ADMIN)` guard
- [ ] T005 Create `DashboardModule` in `src/dashboard/dashboard.module.ts` — import `TypeOrmModule.forFeature([Service, Project, Article, ContactMessage, Payment, User])`, register controller and service
- [ ] T006 Register `DashboardModule` in `src/app.module.ts` imports array

**Checkpoint**: Module compiles and is loaded by NestJS — no functional endpoint yet

---

## Phase 3: User Story 1 — Admin Views Aggregated Dashboard Statistics (Priority: P1) 🎯 MVP

**Goal**: Admins get a single endpoint returning all platform statistics with efficient parallel queries

**Independent Test**: GET `/admin/dashboard` → verify counts match known database state for all entities

### Implementation for User Story 1

- [ ] T007 [US1] Implement `getProjectStats()` private method in `src/dashboard/dashboard.service.ts` — query `count()` for total projects and `count({ where: { isPublished: true } })` for published projects. Wrap in try-catch, return `{ totalProjects, publishedProjects }` or zeros with error string on failure.
- [ ] T008 [US1] [P] Implement `getArticleStats()` private method in `src/dashboard/dashboard.service.ts` — query `count()` for total articles and `count({ where: { isPublished: true } })` for published articles. Wrap in try-catch, return `{ totalArticles, publishedArticles }` or zeros with error string on failure.
- [ ] T009 [US1] [P] Implement `getServiceStats()` private method in `src/dashboard/dashboard.service.ts` — query `count()` for total services and `count({ where: { isPublished: true } })` for published services. Wrap in try-catch, return `{ totalServices, publishedServices }` or zeros with error string on failure.
- [ ] T010 [US1] [P] Implement `getMessageStats()` private method in `src/dashboard/dashboard.service.ts` — query `count({ where: { isRead: false } })` for unread messages. Wrap in try-catch, return `{ unreadMessages }` or zero with error string on failure.
- [ ] T011 [US1] [P] Implement `getPaymentStats()` private method in `src/dashboard/dashboard.service.ts` — query `count()` for total payments and `createQueryBuilder` with `SUM(amount) WHERE status = 'succeeded'` using `COALESCE` for revenue. Wrap in try-catch, return `{ totalPayments, totalRevenue }` or zeros with error string on failure.
- [ ] T012 [US1] [P] Implement `getUserStats()` private method in `src/dashboard/dashboard.service.ts` — query `count()` for total users. Wrap in try-catch, return `{ totalUsers }` or zero with error string on failure.
- [ ] T013 [US1] Implement `getStats(): Promise<DashboardStatsDto>` public method in `src/dashboard/dashboard.service.ts` — call all 6 private stat methods via `Promise.all()`, merge results into a single `DashboardStatsDto` object, collect any error strings into the `errors` array (omit field if no errors).
- [ ] T014 [US1] Wire `GET /admin/dashboard` endpoint in `src/dashboard/dashboard.controller.ts` — call `this.dashboardService.getStats()`, return 200 OK with @ApiResponse decorator typing `DashboardStatsDto`

**Checkpoint**: Dashboard returns accurate stats for all entities — US1 is fully functional

---

## Phase 4: User Story 2 — Admin Accesses Dashboard on Empty Platform (Priority: P2)

**Goal**: Dashboard gracefully returns zero values when the platform has no data

**Independent Test**: GET `/admin/dashboard` on an empty database → verify all values are 0 with no errors

### Implementation for User Story 2

- [ ] T015 [US2] Verify zero-state handling in all 6 private stat methods in `src/dashboard/dashboard.service.ts` — ensure `count()` returns 0 (not null/undefined) on empty tables and `COALESCE(SUM(...), 0)` returns 0 for revenue when no succeeded payments exist. Adjust any method that returns null instead of 0.

**Checkpoint**: Dashboard handles empty platform gracefully — US1 + US2 fully functional

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Swagger documentation and final verification

- [ ] T016 [P] Add Swagger `@ApiTags('Dashboard')` to `DashboardController` in `src/dashboard/dashboard.controller.ts`
- [ ] T017 [P] Add `@ApiOperation({ summary: 'Get aggregated platform statistics' })` and `@ApiResponse({ status: 200, type: DashboardStatsDto })` to the GET endpoint in `src/dashboard/dashboard.controller.ts`
- [ ] T018 Validate the endpoint against the contract by running the quickstart.md curl command in `specs/008-dashboard-module/quickstart.md`
- [ ] T019 Verify Swagger documentation renders correctly at `http://localhost:3000/api`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–4)**: All depend on Foundational phase completion
  - **US1 (Phase 3)**: Independent — can start after Phase 2
  - **US2 (Phase 4)**: Depends on US1 (validates zero-state behavior of US1 implementation)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P2)**: Depends on US1 implementation existing — validates edge case behavior

### Within Each User Story

- Private stat methods before the aggregating `getStats()` method
- Service methods before controller wiring

### Parallel Opportunities

- **Phase 1**: T001 + T002 can potentially overlap (directory creation then DTO)
- **Phase 3**: T007 through T012 (all 6 private stat methods) can run in parallel — they are independent methods in the same file but touch different repositories
- **Phase 5**: T016 + T017 can run in parallel (different decorators)

---

## Parallel Example: Phase 3 Stat Methods

```bash
# Launch in parallel (independent methods, different repositories):
Task: "Implement getProjectStats() in src/dashboard/dashboard.service.ts"
Task: "Implement getArticleStats() in src/dashboard/dashboard.service.ts"
Task: "Implement getServiceStats() in src/dashboard/dashboard.service.ts"
Task: "Implement getMessageStats() in src/dashboard/dashboard.service.ts"
Task: "Implement getPaymentStats() in src/dashboard/dashboard.service.ts"
Task: "Implement getUserStats() in src/dashboard/dashboard.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: User Story 1 — Stats (T007–T014)
4. **STOP and VALIDATE**: Test with known data across entities
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Module wired and compiling
2. Add US1 (All Stats) → Test independently → **MVP ready!**
3. Add US2 (Zero State) → Validate edge case → Robust
4. Polish → Swagger docs + final verification

---

## Notes

- [P] tasks = different files or independent methods, no dependencies
- [Story] label maps task to specific user story for traceability
- This module has **no database migration** — purely read-only
- This module has **no new npm dependencies**
- Entity imports in `TypeOrmModule.forFeature()` require the entity classes to exist from their respective modules. If a module (e.g., projects) is not yet implemented, its repository injection will fail — the try-catch pattern in stat methods handles this gracefully
- Revenue uses `COALESCE(SUM(), 0)` to prevent null on empty result sets
- The `errors` field in the response DTO is only included when at least one entity query fails
