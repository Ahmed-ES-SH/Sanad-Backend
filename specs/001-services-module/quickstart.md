# Quickstart: Services Module

**Feature**: 001-services-module
**Date**: 2026-04-06

## Prerequisites

- Node.js LTS installed
- PostgreSQL database accessible (Neon)
- `.env` file configured with `DATABASE_URL`
- Project dependencies installed (`npm install`)

## Setup Steps

### 1. Generate Migration

After creating the `Service` entity at `src/services/schema/service.schema.ts`, register it in `src/config/database.config.ts` and generate the migration:

```bash
npm run migration:generate --name=CreateServicesTable
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Register Module

Add `ServicesModule` to `AppModule` imports in `src/app.module.ts`:

```typescript
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    // ... existing imports
    ServicesModule,
  ],
})
export class AppModule {}
```

### 4. Start Development Server

```bash
npm run start:dev
```

### 5. Verify Endpoints

**Public — list published services:**
```bash
curl http://localhost:3000/services
```

**Admin — create a service:**
```bash
curl -X POST http://localhost:3000/admin/services \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Web Development", "shortDescription": "Full-stack web solutions"}'
```

**Admin — list all services:**
```bash
curl http://localhost:3000/admin/services \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Admin — publish a service:**
```bash
curl -X PATCH http://localhost:3000/admin/services/<SERVICE_ID>/publish \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 6. Swagger Documentation

Visit `http://localhost:3000/api` to see all endpoints documented in Swagger UI.

## File Checklist

| File | Purpose |
|------|---------|
| `src/services/services.module.ts` | Module definition |
| `src/services/services.controller.ts` | Admin endpoints |
| `src/services/services.public.controller.ts` | Public endpoints |
| `src/services/services.service.ts` | Business logic |
| `src/services/schema/service.schema.ts` | TypeORM entity |
| `src/services/dto/create-service.dto.ts` | Create validation |
| `src/services/dto/update-service.dto.ts` | Update validation |
| `src/services/dto/reorder-services.dto.ts` | Reorder validation |
| `src/common/dto/pagination-query.dto.ts` | Shared pagination |
| `src/config/database.config.ts` | Updated — Service entity registered |
| `src/app.module.ts` | Updated — ServicesModule imported |
| `db/migrations/*-CreateServicesTable.ts` | Database migration |
