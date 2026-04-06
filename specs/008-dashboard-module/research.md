# Research: Dashboard Module

**Feature**: 008-dashboard-module
**Date**: 2026-04-06

## Technical Decisions

### 1. Cross-Module Data Access Strategy

- **Decision**: Inject individual TypeORM repositories (`Repository<Service>`, `Repository<Project>`, `Repository<Article>`, `Repository<ContactMessage>`, `Repository<Payment>`, `Repository<User>`) directly into the `DashboardService` using `TypeOrmModule.forFeature()` in the `DashboardModule`.
- **Rationale**: The dashboard is a read-only aggregation layer. Injecting repositories directly avoids circular module dependencies and keeps queries self-contained. Each aggregation is a single `COUNT()` or `SUM()` query — no need to import entire feature modules or their services.
- **Alternatives considered**: Importing feature modules and calling their services (rejected — creates hard coupling, feature services may not expose count methods), database views (rejected — adds DB-level complexity for a single endpoint), raw SQL (rejected — loses TypeORM type safety).

### 2. Query Efficiency

- **Decision**: Use TypeORM's `QueryBuilder` with `getCount()` and `getRawOne()` for each entity. Execute all queries in parallel using `Promise.all()`.
- **Rationale**: FR-003 mandates efficient aggregation (one query per entity). `Promise.all()` runs 6+ queries concurrently instead of sequentially, reducing total response time to the slowest single query. Each query is a simple `SELECT COUNT(*)` or `SELECT SUM()` — extremely fast even on large tables.
- **Alternatives considered**: Sequential queries (rejected — 6× slower), single complex JOIN query (rejected — harder to maintain, no performance benefit over parallel simple queries), cached results (rejected — spec says real-time, no caching).

### 3. Response Structure

- **Decision**: Return a flat JSON object with descriptive keys (e.g., `totalProjects`, `publishedProjects`, `totalRevenue`). No nested objects.
- **Rationale**: The dashboard has a single endpoint with a single response shape. A flat structure is simpler to consume on the frontend and matches the acceptance scenarios in the spec. All values are numeric (integers or decimal for revenue).
- **Alternatives considered**: Nested objects per entity (rejected — over-structured for a simple stats response), array of `{ entity, count }` tuples (rejected — loses type safety, harder to consume).

### 4. Controller Pattern

- **Decision**: Single controller `dashboard.controller.ts` with `@Roles(UserRoleEnum.ADMIN)` guard. One GET endpoint at `/admin/dashboard`.
- **Rationale**: The module has exactly one endpoint — no need for public or client controllers. Follows the admin route prefix convention (`/admin/...`) used by other modules.
- **Alternatives considered**: Reusing an existing admin controller (rejected — violates module separation), multiple endpoints per entity (rejected — spec explicitly calls for a single aggregated endpoint).

### 5. Entity Availability & Partial Results

- **Decision**: Wrap each entity query in a try-catch. If a query fails (e.g., table doesn't exist yet because that module isn't deployed), return `0` for that entity's counts and include an `errors` array in the response listing which entities failed.
- **Rationale**: Edge case from spec: "The endpoint SHOULD return partial results with an error indicator rather than failing entirely." This is critical during incremental deployment — the dashboard module may be deployed before all entity modules are ready.
- **Alternatives considered**: Fail the entire endpoint on any query error (rejected — spec says partial results), skip errors silently (rejected — admin should know which stats are unavailable).

### 6. No New Entities or Migrations

- **Decision**: No new database tables, entities, or migrations. The module is purely read-only against existing tables.
- **Rationale**: The spec explicitly states "No new entities are introduced." The module reads from tables owned by other modules (`services`, `projects`, `articles`, `contact_messages`, `payments`, `users`).
- **Alternatives considered**: Creating a materialized view for stats (rejected — real-time requirement, adds DB maintenance).

## Research Gaps Resolved

All technical context items are resolved. No NEEDS CLARIFICATION items remain.
