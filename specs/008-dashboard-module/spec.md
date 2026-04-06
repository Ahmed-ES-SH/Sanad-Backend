# Feature Specification: Dashboard Module

**Feature Branch**: `008-dashboard-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Dashboard Module - Admin-only aggregated statistics for projects, articles, services, contact messages, payments, revenue, and users"
**PRD Reference**: §5.6 Dashboard Module, §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Views Aggregated Dashboard Statistics (Priority: P1)

An administrator wants a single overview of the entire portfolio platform: total counts for projects, articles, services, users, messages, and payments, along with revenue figures. This gives them a quick health check of the platform.

**Why this priority**: This is the sole purpose of the Dashboard Module — a single, comprehensive stats endpoint.

**Independent Test**: Can be tested by creating known quantities of each entity and verifying the stats endpoint returns accurate counts and totals.

**Acceptance Scenarios**:

1. **Given** 10 projects (7 published, 3 drafts), **When** the admin requests dashboard stats, **Then** the response includes `total_projects = 10` and `published_projects = 7`.
2. **Given** 20 articles (15 published, 5 drafts), **When** the admin requests dashboard stats, **Then** the response includes `total_articles = 20` and `published_articles = 15`.
3. **Given** 5 services (3 published, 2 drafts), **When** the admin requests dashboard stats, **Then** the response includes `total_services = 5` and `published_services = 3`.
4. **Given** 12 contact messages (4 unread), **When** the admin requests dashboard stats, **Then** the response includes `unread_messages = 4`.
5. **Given** 8 payments (5 succeeded totaling $500, 2 pending, 1 failed), **When** the admin requests dashboard stats, **Then** the response includes `total_payments = 8` and `total_revenue = 500` (sum of succeeded payments only).
6. **Given** 50 registered users, **When** the admin requests dashboard stats, **Then** the response includes `total_users = 50`.
7. **Given** an unauthenticated or non-admin user, **When** they request dashboard stats, **Then** the request is rejected with an authorization error.

---

### User Story 2 - Admin Accesses Dashboard on Empty Platform (Priority: P2)

An administrator accesses the dashboard when the platform is newly set up and has no data. The stats endpoint returns zero values gracefully.

**Why this priority**: Edge case handling ensures the dashboard is robust from day one.

**Independent Test**: Can be tested by requesting stats on an empty database and verifying all values are 0.

**Acceptance Scenarios**:

1. **Given** no entities exist in the database, **When** the admin requests dashboard stats, **Then** all counts are 0 and total_revenue is 0.

---

### Edge Cases

- What happens when a payment is refunded? Revenue MUST only count `succeeded` payments — refunded payments are excluded.
- What happens when the database has millions of records? Stats MUST be computed efficiently (single aggregation query per entity, not N+1 queries).
- What happens when one entity table is unavailable? The endpoint SHOULD return partial results with an error indicator rather than failing entirely.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose an admin-only endpoint that returns aggregated statistics for the entire platform.
- **FR-002**: System MUST include the following statistics in the response:
  - Total projects and published projects count
  - Total articles and published articles count
  - Total services and published services count
  - Unread contact messages count
  - Total payments count and total revenue (sum of succeeded payments in dollars)
  - Total users count
- **FR-003**: System MUST compute stats using efficient aggregation queries (one per entity, not cached).
- **FR-004**: System MUST calculate total_revenue from `succeeded` payments only.
- **FR-005**: System MUST restrict dashboard access to admin-role users only.
- **FR-006**: System MUST return zero values (not errors) when no data exists.

### Key Entities

- No new entities are introduced. This module reads from: services, projects, articles, contact_messages, payments, users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard stats load in under 3 seconds even with 10,000+ records across entities.
- **SC-002**: All counts are accurate to the current database state at the time of the request (no stale data).
- **SC-003**: Revenue calculation correctly excludes pending, failed, and refunded payments with 100% accuracy.
- **SC-004**: Dashboard returns valid zero-state response on an empty platform.

## Assumptions

- Authentication and authorization are already implemented.
- Stats are computed in real-time (no caching layer) — acceptable given the simple scope.
- This module has read-only dependencies on all other entity modules.
- Revenue is calculated in the base currency (USD).
