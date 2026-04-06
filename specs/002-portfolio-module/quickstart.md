# Quickstart: Portfolio Module

**Feature**: 002-portfolio-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- PostgreSQL database accessible (Neon)
- `.env` file configured with `DATABASE_URL`
- Project dependencies installed (`npm install`)
- Services module (001) completed — shared `PaginationQueryDto` and `slug.util.ts` available

## Setup Steps

### 1. Generate Migration

After creating the `Project` entity at `src/portfolio/schema/project.schema.ts`, register it in `src/config/database.config.ts` and generate the migration:

```bash
npm run migration:generate --name=CreateProjectsTable
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Register Module

Add `PortfolioModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [
    // ... existing imports
    PortfolioModule,
  ],
})
export class AppModule {}
```

### 4. Start Development Server

```bash
npm run start:dev
```

### 5. Verify Endpoints

**Admin — create a project:**
```bash
curl -X POST http://localhost:3000/admin/portfolio \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "E-Commerce Platform", "shortDescription": "Full-stack e-commerce solution", "techStack": ["React", "NestJS"], "category": "Web App"}'
```

**Admin — list all projects:**
```bash
curl http://localhost:3000/admin/portfolio \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — publish a project:**
```bash
curl -X PATCH http://localhost:3000/admin/portfolio/<PROJECT_ID>/publish \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — feature a project:**
```bash
curl -X PATCH http://localhost:3000/admin/portfolio/<PROJECT_ID>/feature \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — reorder projects:**
```bash
curl -X PATCH http://localhost:3000/admin/portfolio/reorder \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "<ID_1>", "order": 0}, {"id": "<ID_2>", "order": 1}]}'
```

**Public — list published projects:**
```bash
curl http://localhost:3000/portfolio
```

**Public — filter by category:**
```bash
curl "http://localhost:3000/portfolio?category=Web%20App"
```

**Public — filter by tech stack:**
```bash
curl "http://localhost:3000/portfolio?techStack=React,NestJS"
```

**Public — filter featured only:**
```bash
curl "http://localhost:3000/portfolio?featured=true"
```

**Public — get project by slug:**
```bash
curl http://localhost:3000/portfolio/e-commerce-platform
```

### 6. Swagger Documentation

Visit `http://localhost:3000/api` to see all endpoints documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/portfolio/portfolio.module.ts` | Module definition |
| `src/portfolio/portfolio.controller.ts` | Admin endpoints |
| `src/portfolio/portfolio.public.controller.ts` | Public endpoints |
| `src/portfolio/portfolio.service.ts` | Business logic |
| `src/portfolio/schema/project.schema.ts` | TypeORM entity |
| `src/portfolio/dto/create-project.dto.ts` | Create validation |
| `src/portfolio/dto/update-project.dto.ts` | Update validation |
| `src/portfolio/dto/reorder-projects.dto.ts` | Reorder validation |
| `src/portfolio/dto/filter-projects-query.dto.ts` | Public filter params |
| `src/common/utils/slug.util.ts` | Shared slug generator |
| `src/config/database.config.ts` | Updated — Project entity registered |
| `src/app.module.ts` | Updated — PortfolioModule imported |
| `db/migrations/*-CreateProjectsTable.ts` | Database migration |
