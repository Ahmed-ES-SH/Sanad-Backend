# Quickstart: Dashboard Module

**Feature**: 008-dashboard-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- PostgreSQL database accessible (Neon)
- `.env` file configured with `DATABASE_URL`
- Project dependencies installed (`npm install`)
- At least some of the entity modules deployed (services, projects, articles, contact, payments, user)

## Setup Steps

### 1. No New Dependencies

This module requires no additional packages.

### 2. No Migration Needed

This module creates no new database tables. It reads from existing entity tables.

### 3. Register Module

Add `DashboardModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // ... existing imports
    DashboardModule,
  ],
})
export class AppModule {}
```

### 4. Start Development Server

```bash
npm run start:dev
```

### 5. Verify Endpoint

**Admin — get dashboard stats:**
```bash
curl http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected response:**
```json
{
  "totalProjects": 0,
  "publishedProjects": 0,
  "totalArticles": 0,
  "publishedArticles": 0,
  "totalServices": 0,
  "publishedServices": 0,
  "unreadMessages": 0,
  "totalPayments": 0,
  "totalRevenue": 0,
  "totalUsers": 1
}
```

### 6. Swagger Documentation

Visit `http://localhost:3000/api` to see the dashboard endpoint documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/dashboard/dashboard.module.ts` | Module definition with entity imports |
| `src/dashboard/dashboard.controller.ts` | Admin endpoint |
| `src/dashboard/dashboard.service.ts` | Aggregation logic |
| `src/dashboard/dto/dashboard-stats.dto.ts` | Response DTO |
| `src/app.module.ts` | Updated — DashboardModule imported |
